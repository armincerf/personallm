// src/main.ts
// Import env first to ensure environment variables are loaded before other imports
import "./env.js";

import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { config } from "./config.js";
import { fetchHealthData } from "./fetchers/health.js";
import { fetchMeetingTranscripts } from "./fetchers/meetings.js";
import { fetchScreenTime } from "./fetchers/screentime.js";
import { fetchWeather } from "./fetchers/weather.js";
import { fetchNews } from "./fetchers/news.js";
import { fetchMailData } from "./fetchers/mail.js";
import { fetchCalendarEvents } from "./fetchers/calendar.js";
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
    console.log(`Created new CSV file at ${config.outputCsvPath}`);
  }
}

export async function runOnce(): Promise<void> {
  const timestamp = getTimestamp();
  console.log(`\n[${timestamp}] Running data aggregation...`);
  
  // Create an array of fetch operations
  const fetchOperations: Array<Promise<string>> = [];
  
  // Add synchronous operations as promises
  console.log("Fetching data from all sources...");
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
  
  if (config.enableCalendar) {
    fetchOperations.push(Promise.resolve(fetchCalendarEvents()));
  }

  // Run all fetch operations concurrently
  const results = await Promise.all(fetchOperations);
  
  // Filter out empty results
  const contextSections = results.filter(Boolean);

  // Combine all sections into one large context string.
  const fullContext = `${contextSections.join("\n\n")}\n\n${config.prompt}`;
  
  console.log("Sending data to LLM for summarization...");
  // Send to LLM for summarization
  const summary = await summarizeWithLLM(fullContext);
  console.log(`Summary obtained: ${summary.substring(0, 100)}${summary.length > 100 ? "..." : ""}`);

  // Write summary to CSV with proper escaping
  try {
    // Escape quotes and newlines for CSV
    const safeSummary = summary
      .replace(/"/g, '""')           // Double quotes for CSV escaping
      .replace(/\r?\n/g, ' ');       // Replace newlines with spaces to keep on one line
    
    const csvLine = `"${timestamp}","${safeSummary}"\n`;
    appendFileSync(config.outputCsvPath, csvLine);
    console.log(`Summary saved to CSV (${summary.length} characters)`);
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
    
    console.log(`\n${signal} received. Shutting down gracefully...`);
    // Give any in-progress operations a chance to complete
    setTimeout(() => {
      console.log("Exiting process");
      process.exit(0);
    }, 1000);
  };
  
  // Listen for termination signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function mainLoop(): Promise<never> {
  const intervalMs = config.intervalMinutes * 60 * 1000;
  console.log(`Starting PersonalLM data aggregator. Running every ${config.intervalMinutes} minutes.`);

  // Log configuration information
  console.log("Configuration:");
  console.log(`- API: ${config.geminiApiUrl.split("?")[0]}`);
  console.log(`- Location: Latitude ${config.weather.latitude}, Longitude ${config.weather.longitude}`);
  console.log(`- Fetchers enabled: ${[
    config.enableScreenTime ? "Screen Time" : null,
    config.enableMail ? "Mail" : null,
    config.enableCalendar ? "Calendar" : null,
  ].filter(Boolean).join(", ") || "None"}`);
  
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
    
    console.log(`Waiting ${config.intervalMinutes} minutes until next run...`);
    // Wait for the specified interval before next run
    await new Promise(res => setTimeout(res, intervalMs));
  }
}

// Start the loop (will run indefinitely under PM2)
mainLoop().catch(err => {
  console.error("Fatal error in main loop:", err);
  process.exit(1);
}); 