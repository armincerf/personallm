import path from "node:path";
import { mkdir, appendFile } from "node:fs/promises";
import type { Config } from "./config/loader.js";
import {
	fetchCalendarIcalBuddy,
	fetchHealthData,
	fetchIMessage,
	fetchMailData,
	fetchMeetingTranscripts,
	fetchNews,
	fetchScreenTime,
	fetchWeather,
} from "./fetchers";
import { summarizeWithLLM } from "./llmClient.js";
import { createLogger } from "./utils/logger.js";

const log = createLogger({ namespace: "aggregator" });

export type FetcherResult = {
	source: string;
	content: string;
};

export type AggregatorResult = {
	summary: string;
	fullContext: string;
	rawSections: FetcherResult[];
	timestamp: string;
};

export function getTimestamp(): string {
	return new Date().toISOString().split(".")[0].replace("T", " ");
}

export async function ensureCsvExists(config: Config): Promise<void> {
	// Check the main CSV file
	const mainFile = Bun.file(config.outputCsvPath);
	const mainExists = await mainFile.exists();
	if (!mainExists) {
		await Bun.write(config.outputCsvPath, `"timestamp","summary"\n`);
	}

	// Also ensure today's CSV file exists with a header
	const now = new Date();
	const [YYYY, MM, DD] = [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, "0"),
		String(now.getDate()).padStart(2, "0"),
	];
	const dirPath = path.join(
		path.dirname(config.outputCsvPath),
		`${YYYY}/${MM}`,
	);

	// Create directory structure - use Node's mkdir since Bun doesn't have it yet
	await mkdir(dirPath, { recursive: true });

	const dailyCsvPath = path.join(dirPath, `${DD}.csv`);
	const dailyFile = Bun.file(dailyCsvPath);

	if (!(await dailyFile.exists())) {
		await Bun.write(dailyCsvPath, `"timestamp","summary"\n`);
	}
}

export async function runOnce(config: Config): Promise<AggregatorResult> {
	log.debug("Starting data collection cycle");

	// Run all fetchers concurrently
	const fetchPromises: Record<string, Promise<string>> = {
		health: Promise.resolve(fetchHealthData()),
		meetings: Promise.resolve(fetchMeetingTranscripts()),
		weather: fetchWeather(),
		news: fetchNews(),
	};

	if (config.enableScreenTime)
		fetchPromises["screenTime"] = Promise.resolve(fetchScreenTime());
	if (config.enableMail)
		fetchPromises["mail"] = Promise.resolve(fetchMailData());
	if (config.enableCalendar && config.enableCalendarIcalBuddy)
		fetchPromises["calendar"] = Promise.resolve(fetchCalendarIcalBuddy());
	if (config.enableIMessage)
		fetchPromises["iMessage"] = Promise.resolve(fetchIMessage());

	// Wait for all fetchers and collect results
	const entries = await Promise.all(
		Object.entries(fetchPromises).map(async ([source, promise]) => {
			try {
				const content = await promise;
				return { source, content };
			} catch (error) {
				log.error(`Error fetching ${source} data:`, error);
				return { source, content: "" };
			}
		}),
	);

	// Filter out empty results
	const rawSections = entries.filter((entry) => entry.content.trim() !== "");

	// Join all context for the LLM
	const fullContext = rawSections
		.map((section) => section.content)
		.join("\n\n");

	// Get the summary from the LLM
	log.debug("Generating summary with LLM");
	const summary = await summarizeWithLLM(fullContext);

	// Create result
	const timestamp = getTimestamp();
	const result: AggregatorResult = {
		summary,
		fullContext,
		rawSections,
		timestamp,
	};

	// ---- side effect: append to daily CSV ----
	log.debug("Writing results to CSV");
	const now = new Date();
	const [YYYY, MM, DD] = [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, "0"),
		String(now.getDate()).padStart(2, "0"),
	];
	const dailyCsvPath = path.join(
		path.dirname(config.outputCsvPath),
		`${YYYY}/${MM}/${DD}.csv`,
	);

	// Append the summary to today's CSV file
	const csvLine = `"${timestamp}","${summary.replace(/"/g, '""').replace(/\r?\n/g, " ")}"\n`;

	// Use Node's appendFile since Bun.write with append option has type issues
	await appendFile(dailyCsvPath, csvLine);

	log.info("Data collection cycle completed");
	return result;
}
