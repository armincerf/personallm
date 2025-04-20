#!/usr/bin/env bun
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import * as readline from "node:readline/promises";

// Geocode a location string to lat/long coordinates
async function geocodeLocation(
	location: string,
): Promise<{ latitude: string; longitude: string } | null> {
	try {
		// Use Open-Meteo Geocoding API to convert location to coordinates
		const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
			location,
		)}&count=1&language=en&format=json`;
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Geocoding API error: HTTP ${response.status}`);
		}
		// Get raw JSON
		const json = await response.json();

		const results = json.results;
		// Check if results array exists and has elements
		if (results && results.length > 0) {
			const result = results[0];
			return {
				latitude: result.latitude.toString(),
				longitude: result.longitude.toString(),
			};
		}
		// No results found
		console.warn(`No geocoding results found for "${location}"`);
		return null;
	} catch (err) {
		console.error("Error geocoding location:", err);
		return null;
	}
}

// Check if required environment variables are set
export function checkRequiredEnvVars(): boolean {
	// Load .env file if it exists
	if (existsSync(".env")) {
		try {
			const envContent = readFileSync(".env", "utf-8");
			const envLines = envContent.split("\n");

			// Check for essential variables
			const hasApiKey = envLines.some(
				(line) =>
					line.startsWith("GEMINI_API_KEY=") &&
					line.replace("GEMINI_API_KEY=", "").trim() !== "",
			);

			const hasOutputPath = envLines.some(
				(line) =>
					line.startsWith("OUTPUT_CSV_PATH=") &&
					line.replace("OUTPUT_CSV_PATH=", "").trim() !== "",
			);

			return hasApiKey && hasOutputPath;
		} catch (err) {
			return false;
		}
	}
	return false;
}

async function setup() {
	// Create readline interface
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	console.log("🔧 PersonalLM Setup");
	console.log("====================");
	console.log(
		"This script will help you configure PersonalLM by creating a .env file\n",
	);

	// Get macOS username automatically
	const username = homedir().split("/").pop() || "";
	console.log(`👤 Detected username: ${username}`);

	// Derive likely paths based on username
	const homeDirectory = homedir();

	// Create data directory if it doesn't exist
	const dataDir = join(homeDirectory, "Data");
	if (!existsSync(dataDir)) {
		console.log(`📁 Creating Data directory at ${dataDir}`);
		try {
			mkdirSync(dataDir, { recursive: true });
		} catch (err) {
			console.warn(
				`⚠️ Could not create ${dataDir}. You may need to create it manually.`,
			);
		}
	}

	// Check Screen Time DB path and auto-disable if not found
	const defaultScreenTimeDbPath = `/Users/${username}/Library/Application Support/ScreenTimeAgent/Database/CoreDuetData.db`;
	const screenTimeExists = existsSync(defaultScreenTimeDbPath);
	const enableScreenTime = screenTimeExists;

	if (screenTimeExists) {
		console.log("✅ Screen Time database found at expected location");
	} else {
		console.log(
			"⚠️ Screen Time database not found - this fetcher will be disabled",
		);
	}

	// Default health data directory
	const defaultHealthDir = join(homeDirectory, "Health");

	// Default output CSV path
	const defaultOutputCsvPath = join(dataDir, "summaries.csv");

	// Default transcripts DB path
	const defaultTranscriptsDbPath = join(dataDir, "meetings.sqlite");

	console.log("\n📝 Please enter the following information:");

	// Ask for Gemini API key
	const geminiApiKey = await rl.question("Gemini API Key: ");

	// Ask for location
	const location = await rl.question(
		"Your location (e.g. 'Milton Keynes, UK'): ",
	);
	let latitude = "51.503"; // Default: London
	let longitude = "-0.1276";

	if (location) {
		console.log("🌍 Looking up coordinates for your location...");
		const coords = await geocodeLocation(location);
		if (coords) {
			latitude = coords.latitude;
			longitude = coords.longitude;
			console.log(`✅ Found coordinates: ${latitude}, ${longitude}`);
		} else {
			console.log(
				"⚠️ Could not find coordinates for your location. Using default values (London, UK).",
			);
		}
	}

	// Ask for health data directory
	const healthDataDir =
		(await rl.question(`Health data directory (${defaultHealthDir}): `)) ||
		defaultHealthDir;

	// Ask for transcripts DB path
	const transcriptsDbPath =
		(await rl.question(
			`Meeting transcripts SQLite DB path (${defaultTranscriptsDbPath}): `,
		)) || defaultTranscriptsDbPath;

	// Ask for output CSV path
	const outputCsvPath =
		(await rl.question(`Output CSV path (${defaultOutputCsvPath}): `)) ||
		defaultOutputCsvPath;

	// Ask for interval
	const intervalMinutes =
		(await rl.question("Aggregation interval in minutes (60): ")) || "60";

	// Ask for enabled features
	const enableMailAnswer = await rl.question("Enable Mail fetching? (y/N): ");
	const enableCalendarAnswer = await rl.question(
		"Enable Calendar fetching? (y/N): ",
	);

	const enableMail =
		enableMailAnswer.toLowerCase() === "y" ||
		enableMailAnswer.toLowerCase() === "yes";
	const enableCalendar =
		enableCalendarAnswer.toLowerCase() === "y" ||
		enableCalendarAnswer.toLowerCase() === "yes";

	// Close the readline interface
	rl.close();

	// Function to escape special characters in environment variable values
	function escapeEnvValue(value: string): string {
		// Escape quotes, backslashes and other special characters
		return value.replace(/"/g, '\\"');
	}

	const envContent = `# PersonalLM configuration
# Generated on ${new Date().toISOString()}

# Gemini API settings
GEMINI_API_KEY=${escapeEnvValue(geminiApiKey)}
GEMINI_MODEL_NAME=gemini-2.5-flash-preview-04-17

# Interval in minutes
INTERVAL_MINUTES=${intervalMinutes}

# Data paths
HEALTH_DATA_DIR=${escapeEnvValue(healthDataDir)}
TRANSCRIPTS_DB_PATH=${escapeEnvValue(transcriptsDbPath)}
SCREEN_TIME_DB_PATH=${escapeEnvValue(defaultScreenTimeDbPath)}
OUTPUT_CSV_PATH=${escapeEnvValue(outputCsvPath)}

# Location information
LOCATION="${escapeEnvValue(location)}"
LATITUDE=${latitude}
LONGITUDE=${longitude}

# Feature toggles
ENABLE_SCREEN_TIME=${enableScreenTime ? "true" : "false"}
ENABLE_MAIL=${enableMail ? "true" : "false"}
ENABLE_CALENDAR=${enableCalendar ? "true" : "false"}
`;

	// Write .env file
	writeFileSync(".env", envContent);
	console.log("\n✅ .env file has been created successfully!");

	// Create necessary directories based on user input
	const outputDir = dirname(outputCsvPath);
	if (!existsSync(outputDir)) {
		try {
			mkdirSync(outputDir, { recursive: true });
			console.log(`📁 Created directory for output CSV: ${outputDir}`);
		} catch (err) {
			console.warn(
				`⚠️ Could not create ${outputDir}. You may need to create it manually.`,
			);
		}
	}

	// healthDataDir comes from rl.question - this IS the directory path
	if (!existsSync(healthDataDir)) {
		try {
			mkdirSync(healthDataDir, { recursive: true });
			console.log(`📁 Created directory for health data: ${healthDataDir}`);
		} catch (err) {
			console.warn(
				`⚠️ Could not create ${healthDataDir}. You may need to create it manually.`,
			);
		}
	}

	const transcriptsDir = dirname(transcriptsDbPath);
	if (!existsSync(transcriptsDir)) {
		try {
			mkdirSync(transcriptsDir, { recursive: true });
			console.log(
				`📁 Created directory for transcripts database: ${transcriptsDir}`,
			);
		} catch (err) {
			console.warn(
				`⚠️ Could not create ${transcriptsDir}. You may need to create it manually.`,
			);
		}
	}

	console.log("\n🎉 Setup complete! You can now run PersonalLM with:");
	console.log("   bun run dev    # For development with auto-reload");
	console.log("   bun run start  # For running once");
	console.log(
		"   bun run pm2    # For running as a background service with PM2",
	);
	return;
}

// If called directly
if (import.meta.main) {
	setup().catch((err) => {
		console.error("❌ Setup failed:", err);
		process.exit(1);
	});
}
