// src/main.ts
// Import env first to ensure environment variables are loaded before other imports
import "./env.js";

import { appendFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { config } from "./config.js";
import path from "node:path";
import { fetchHealthData } from "./fetchers/health.js";
import { fetchMeetingTranscripts } from "./fetchers/meetings.js";
import { fetchScreenTime } from "./fetchers/screentime.js";
import { fetchWeather } from "./fetchers/weather.js";
import { fetchNews } from "./fetchers/news.js";
import { fetchMailData } from "./fetchers/mail.js";
import { fetchCalendarIcalBuddy } from "./fetchers/calendar-icalbuddy.js";
import { fetchIMessage } from "./fetchers/imessage.js";
import { log } from "../tests/utils.js";
import { summarizeWithLLM } from "./llmClient.js";

function getTimestamp(): string {
	const now = new Date();
	// Format timestamp as ISO string without milliseconds
	return now.toISOString().split(".")[0].replace("T", " ");
}

// Ensure CSV file exists and has header if new
export function ensureCsvExists(): void {
	if (!existsSync(config.outputCsvPath)) {
		writeFileSync(config.outputCsvPath, `"timestamp","summary"\n`);
		log(`Created new CSV file at ${config.outputCsvPath}`);
	}
}

export async function runOnce(): Promise<void> {
	const timestamp = getTimestamp();
	log(`\n[${timestamp}] Running data aggregation...`);

	// Create an array of fetch operations
	const fetchOperations: Array<Promise<string>> = [];

	// Add synchronous operations as promises
	log("Fetching data from all sources...");
	fetchOperations.push(Promise.resolve(fetchHealthData()));
	fetchOperations.push(Promise.resolve(fetchMeetingTranscripts()));

	// Add Screen Time if enabled
	if (config.enableScreenTime) {
		fetchOperations.push(Promise.resolve(fetchScreenTime()));
	}

	// Add asynchronous operations
	fetchOperations.push(fetchWeather());
	fetchOperations.push(fetchNews());

	// Add optional fetchers if enabled
	if (config.enableMail) {
		fetchOperations.push(Promise.resolve(fetchMailData()));
	}

	if (config.enableCalendar && config.enableCalendarIcalBuddy) {
		fetchOperations.push(Promise.resolve(fetchCalendarIcalBuddy()));
	}

	// Add iMessage fetcher if enabled
	if (config.enableIMessage) {
		fetchOperations.push(Promise.resolve(fetchIMessage()));
	}

	// Run all fetch operations concurrently
	const results = await Promise.all(fetchOperations);

	// Filter out empty results
	const contextSections = results.filter(Boolean);

	// Combine all sections into one large context string.
	const fullContext = `${contextSections.join("\n\n")}`;

	log("Sending data to LLM for summarization...");
	// Send to LLM for summarization
	const summary = await summarizeWithLLM(fullContext);
	log(
		`Summary obtained: ${summary.substring(0, 100)}${summary.length > 100 ? "..." : ""}`,
	);

	// Write summary to nested daily CSV with proper escaping
	try {
		// Determine today's nested CSV path
		const now = new Date();
		const YYYY = now.getFullYear().toString();
		const MM = String(now.getMonth() + 1).padStart(2, "0");
		const DD = String(now.getDate()).padStart(2, "0");
		const baseDir = path.dirname(config.outputCsvPath);
		let targetDir: string;
		let targetPath: string;
		if (baseDir === ".") {
			targetDir = `./${YYYY}/${MM}`;
			mkdirSync(targetDir, { recursive: true });
			targetPath = `${targetDir}/${DD}.csv`;
		} else {
			targetDir = path.join(baseDir, YYYY, MM);
			mkdirSync(targetDir, { recursive: true });
			targetPath = path.join(targetDir, `${DD}.csv`);
		}
		// If new file for today, write header
		if (!existsSync(targetPath)) {
			writeFileSync(targetPath, `"timestamp","summary"\n`);
			log(`Created new CSV file at ${targetPath}`);
		}
		// Escape quotes and newlines for CSV
		const safeSummary = summary
			.replace(/"/g, '""') // Double quotes for CSV escaping
			.replace(/\r?\n/g, " "); // Replace newlines with spaces
		const csvLine = `"${timestamp}","${safeSummary}"\n`;
		appendFileSync(targetPath, csvLine);
		log(`Summary saved to CSV (${summary.length} characters)`);
	} catch (err) {
		console.error("Failed to write to CSV:", err);
	}
}

// Handle graceful shutdown
function setupGracefulShutdown(): void {
	let isShuttingDown = false;

	const shutdown = (signal: string) => {
		if (isShuttingDown) return;
		isShuttingDown = true;

		log(`\n${signal} received. Shutting down gracefully...`);
		// Give any in-progress operations a chance to complete
		setTimeout(() => {
			log("Exiting process");
			process.exit(0);
		}, 1000);
	};

	// Listen for termination signals
	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("SIGTERM", () => shutdown("SIGTERM"));
}

async function mainLoop(): Promise<never> {
	const intervalMs = config.intervalMinutes * 60 * 1000;
	log(
		`Starting PersonalLM data aggregator. Running every ${config.intervalMinutes} minutes.`,
	);

	// Log configuration information
	log("Configuration:");
	log(`- Model: ${config.geminiModelName}`);
	log(
		`- Location: Latitude ${config.weather.latitude}, Longitude ${config.weather.longitude}`,
	);
	log(
		`- Fetchers enabled: ${
			[
				config.enableScreenTime ? "Screen Time" : null,
				config.enableMail ? "Mail" : null,
				config.enableCalendar ? "Calendar" : null,
				config.enableIMessage ? "iMessage" : null,
			]
				.filter(Boolean)
				.join(", ") || "None"
		}`,
	);

	// Setup graceful shutdown handler
	setupGracefulShutdown();

	// Ensure CSV file exists
	ensureCsvExists();

	while (true) {
		try {
			await runOnce();
		} catch (err) {
			console.error("Error in runOnce():", err);
		}

		log(`Waiting ${config.intervalMinutes} minutes until next run...`);
		// Wait for the specified interval before next run
		await new Promise((res) => setTimeout(res, intervalMs));
	}
}

// Only run if this file is executed directly and not imported
// In Bun, we determine if we're the main module by checking if the
// current file's URL appears at the end of the execution command
const scriptPath = new URL(import.meta.url).pathname;
const isMainModule = process.argv[1]?.endsWith(scriptPath) ?? false;

if (isMainModule) {
	mainLoop().catch((err) => {
		console.error("Fatal error in main loop:", err);
		process.exit(1);
	});
}
