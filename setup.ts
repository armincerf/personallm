#!/usr/bin/env bun
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import * as readline from "node:readline/promises";

// Geocode a location string to lat/long coordinates
async function geocodeLocation(location: string): Promise<{ latitude: string; longitude: string } | null> {
  try {
    // Use Open-Meteo Geocoding API to convert location to coordinates
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        latitude: result.latitude.toString(),
        longitude: result.longitude.toString()
      };
    }
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
      const hasApiKey = envLines.some(line => 
        line.startsWith("GEMINI_API_KEY=") && 
        line.replace("GEMINI_API_KEY=", "").trim() !== "");
      
      const hasOutputPath = envLines.some(line => 
        line.startsWith("OUTPUT_CSV_PATH=") && 
        line.replace("OUTPUT_CSV_PATH=", "").trim() !== "");
      
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
    output: process.stdout
  });

  console.log("🔧 PersonalLM Setup");
  console.log("====================");
  console.log("This script will help you configure PersonalLM by creating a .env file\n");
  
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
      console.warn(`⚠️ Could not create ${dataDir}. You may need to create it manually.`);
    }
  }
  
  // Check Screen Time DB path and auto-disable if not found
  const defaultScreenTimeDbPath = `/Users/${username}/Library/Application Support/ScreenTimeAgent/Database/CoreDuetData.db`;
  const screenTimeExists = existsSync(defaultScreenTimeDbPath);
  const enableScreenTime = screenTimeExists;
  
  if (screenTimeExists) {
    console.log("✅ Screen Time database found at expected location");
  } else {
    console.log("⚠️ Screen Time database not found - this fetcher will be disabled");
  }
  
  // Default health data paths (these might not exist yet)
  const defaultHealthPath = join(dataDir, "health_data.json");
  const defaultWorkoutsPath = join(dataDir, "workouts.json");
  
  // Default output CSV path
  const defaultOutputCsvPath = join(dataDir, "summaries.csv");
  
  // Default transcripts DB path
  const defaultTranscriptsDbPath = join(dataDir, "meetings.sqlite");
  
  console.log("\n📝 Please enter the following information:");
  
  // Ask for Gemini API key
  const geminiApiKey = await rl.question("Gemini API Key: ");
  const geminiApiUrl = await rl.question("Gemini API URL (https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent): ") || 
                       "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";
  
  // Ask for location
  const location = await rl.question("Your location (e.g. 'Milton Keynes, UK'): ");
  let latitude = "51.503";  // Default: London
  let longitude = "-0.1276";
  
  if (location) {
    console.log("🌍 Looking up coordinates for your location...");
    const coords = await geocodeLocation(location);
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
      console.log(`✅ Found coordinates: ${latitude}, ${longitude}`);
    } else {
      console.log("⚠️ Could not find coordinates for your location. Using default values (London, UK).");
    }
  }
  
  // Ask for health data paths
  const healthDataPath = await rl.question(`Health data JSON path (${defaultHealthPath}): `) || defaultHealthPath;
  const workoutsDataPath = await rl.question(`Workouts data JSON path (${defaultWorkoutsPath}): `) || defaultWorkoutsPath;
  
  // Ask for transcripts DB path
  const transcriptsDbPath = await rl.question(`Meeting transcripts SQLite DB path (${defaultTranscriptsDbPath}): `) || defaultTranscriptsDbPath;
  
  // Ask for output CSV path
  const outputCsvPath = await rl.question(`Output CSV path (${defaultOutputCsvPath}): `) || defaultOutputCsvPath;
  
  // Ask for interval
  const intervalMinutes = await rl.question("Aggregation interval in minutes (60): ") || "60";
  
  // Ask for enabled features
  const enableMailAnswer = await rl.question("Enable Mail fetching? (y/N): ");
  const enableCalendarAnswer = await rl.question("Enable Calendar fetching? (y/N): ");
  
  const enableMail = enableMailAnswer.toLowerCase() === 'y' || enableMailAnswer.toLowerCase() === 'yes';
  const enableCalendar = enableCalendarAnswer.toLowerCase() === 'y' || enableCalendarAnswer.toLowerCase() === 'yes';
  
  // Close the readline interface
  rl.close();
  
  // Function to escape special characters in environment variable values
  function escapeEnvValue(value: string): string {
    // Escape quotes, backslashes and other special characters
    return value.replace(/"/g, '\\"');
  }
  
  // Create .env file content
  const envContent = `# PersonalLM configuration
# Generated on ${new Date().toISOString()}

# Gemini API settings
GEMINI_API_KEY=${escapeEnvValue(geminiApiKey)}
GEMINI_API_URL=${escapeEnvValue(geminiApiUrl)}

# Interval in minutes
INTERVAL_MINUTES=${intervalMinutes}

# Data paths
HEALTH_DATA_PATH=${escapeEnvValue(healthDataPath)}
WORKOUTS_DATA_PATH=${escapeEnvValue(workoutsDataPath)}
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

  // Now let's modify the config.ts file to use environment variables
  console.log("🔄 Updating config.ts to use environment variables...");
  
  const configTsContent = `// src/config.ts
export const config = {
  // Interval in minutes (e.g., 60 for hourly). PM2 will keep the process alive.
  intervalMinutes: Number(process.env.INTERVAL_MINUTES || 60),

  // Prompt to instruct the LLM on how to summarize the data.
  prompt: "Summarize the following information for my daily overview:",

  // Paths to local data sources
  healthDataPaths: [
    process.env.HEALTH_DATA_PATH || "/Users/${username}/Health/health_data.json",
    process.env.WORKOUTS_DATA_PATH || "/Users/${username}/Health/workouts.json"
  ],
  transcriptsDbPath: process.env.TRANSCRIPTS_DB_PATH || "/Users/${username}/Data/meetings.sqlite",
  screenTimeDbPath: process.env.SCREEN_TIME_DB_PATH || "/Users/${username}/Library/Application Support/ScreenTimeAgent/Database/CoreDuetData.db",
  
  // Weather API configuration (Open-Meteo requires latitude/longitude, no API key needed)
  weather: {
    latitude: Number(process.env.LATITUDE || 51.503),
    longitude: Number(process.env.LONGITUDE || -0.1276),
    useDaily: true,
    useCurrent: true
  },

  // News sources configuration
  news: {
    bbcRssUrl: "https://feeds.bbci.co.uk/news/rss.xml",
    includeHackerNews: true,
    subreddits: ["worldnews", "technology"],
    numTopPosts: 5
  },

  // Gemini LLM API details
  geminiApiUrl: process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
  geminiApiKey: process.env.GEMINI_API_KEY || "",

  // Output file for summaries
  outputCsvPath: process.env.OUTPUT_CSV_PATH || "/Users/${username}/Data/summaries.csv",

  // Toggles for optional data
  enableScreenTime: process.env.ENABLE_SCREEN_TIME === "true",
  enableMail: process.env.ENABLE_MAIL === "true",
  enableCalendar: process.env.ENABLE_CALENDAR === "true"
};`;

  writeFileSync("src/config.ts", configTsContent);
  console.log("✅ Config file updated successfully!");

  // Create necessary directories
  const outputDir = dirname(outputCsvPath);
  if (!existsSync(outputDir)) {
    try {
      mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created directory for output CSV: ${outputDir}`);
    } catch (err) {
      console.warn(`⚠️ Could not create ${outputDir}. You may need to create it manually.`);
    }
  }

  const healthDataDir = dirname(healthDataPath);
  if (!existsSync(healthDataDir)) {
    try {
      mkdirSync(healthDataDir, { recursive: true });
      console.log(`📁 Created directory for health data: ${healthDataDir}`);
    } catch (err) {
      console.warn(`⚠️ Could not create ${healthDataDir}. You may need to create it manually.`);
    }
  }

  const transcriptsDir = dirname(transcriptsDbPath);
  if (!existsSync(transcriptsDir)) {
    try {
      mkdirSync(transcriptsDir, { recursive: true });
      console.log(`📁 Created directory for transcripts database: ${transcriptsDir}`);
    } catch (err) {
      console.warn(`⚠️ Could not create ${transcriptsDir}. You may need to create it manually.`);
    }
  }

  console.log("\n🎉 Setup complete! You can now run PersonalLM with:");
  console.log("   bun run dev    # For development with auto-reload");
  console.log("   bun run start  # For running once");
  console.log("   bun run pm2    # For running as a background service with PM2");
}

// If called directly
if (import.meta.main) {
  setup().catch(err => {
    console.error("❌ Setup failed:", err);
    process.exit(1);
  });
} 