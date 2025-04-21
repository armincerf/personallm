import path from "node:path";
import { mkdir, appendFile, readdir } from "node:fs/promises";
import { brotliCompress } from "node:zlib";
import { promisify } from "node:util";
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
import { loadPreviousSummary } from "./utils/history.js";
import { writeSummaryAsMd } from "./utils/writeMarkdown.js";

const log = createLogger({ namespace: "aggregator" });
const brotliCompressAsync = promisify(brotliCompress);

export type FetcherResult = {
	source: string;
	content: string;
};

export type AggregatorResult = {
	summary: string;
	fullContext: string;
	rawSections: FetcherResult[];
	timestamp: string;
	markdownPath?: string;
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

async function appendContext(
	dailyCtxPath: string,
	timestamp: string,
	sections: FetcherResult[],
): Promise<void> {
	const jsonLine = `${JSON.stringify({ ts: timestamp, sections })}`;
	const jsonBuffer = Buffer.from(jsonLine, "utf-8");

	// Compress with Brotli at maximum compression (quality = 11)
	const compressedData = await brotliCompressAsync(jsonBuffer, {
		params: {
			[require("node:zlib").constants.BROTLI_PARAM_QUALITY]: 11,
		},
	});

	try {
		// Always overwrite with new data - don't append
		await Bun.write(dailyCtxPath, new Uint8Array(compressedData));
		log.debug(`Wrote compressed context to ${dailyCtxPath}`);
	} catch (error) {
		log.error(`Error writing context file: ${error}`);
		throw error;
	}
}

async function getNextSummaryIndex(date: Date): Promise<number> {
	const projectRoot = process.cwd(); // Assuming running from project root
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	const mdDir = path.join(
		projectRoot,
		"web",
		"src",
		"content",
		"summaries",
		year,
		month,
	);
	const filePrefix = `${day}-`; // e.g., "20-"

	try {
		// Ensure directory exists before reading
		await mkdir(mdDir, { recursive: true });
		const files = await readdir(mdDir);
		const summariesForDay = files.filter(
			(f) => f.startsWith(filePrefix) && f.endsWith(".md"),
		);
		return summariesForDay.length + 1; // Next index is count + 1
	} catch (error) {
		log.error(
			`Error reading summary directory ${mdDir} to determine index: ${error}`,
		);
		return 1; // Default to 1 if directory can't be read
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
	const { summary: ySummary } = await loadPreviousSummary(config.outputCsvPath);

	const personalisedPrompt = `${config.prompt}
${
	ySummary
		? `\nYesterday you already told the user:\n"""${ySummary}"""\nAvoid repeating the same news unless there is a major development.`
		: ""
}`;

	const summary = await summarizeWithLLM(fullContext, personalisedPrompt);

	// --- Timestamp and Date setup ---
	const timestamp = getTimestamp();
	const now = new Date(); // Use a single date object for consistency
	const [YYYY, MM, DD] = [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, "0"),
		String(now.getDate()).padStart(2, "0"),
	];

	// --- Prepare paths ---
	const dailyCsvPath = path.join(
		path.dirname(config.outputCsvPath),
		`${YYYY}/${MM}/${DD}.csv`,
	);
	const dailyCtxPath = dailyCsvPath.replace(/\.csv$/, ".ctx.br");

	// Ensure directories and daily CSV exist
	await ensureCsvExists(config);

	// --- Side Effect 1: Append summary to daily CSV ---
	log.debug(`Appending summary to ${dailyCsvPath}`);
	const csvLine = `"${timestamp}","${summary.replace(/"/g, '""').replace(/\r?\n/g, " ")}"\n`;
	await appendFile(dailyCsvPath, csvLine);

	// --- Side Effect 2: Write compressed context (OVERWRITES daily file) ---
	log.debug(`Writing context to ${dailyCtxPath}`);
	await appendContext(dailyCtxPath, timestamp, rawSections);

	// --- Side Effect 3: Write Markdown file for the web interface ---
	log.debug("Determining index and writing summary Markdown file");
	const summaryIndex = await getNextSummaryIndex(now);
	const summaryTitle = `Summary #${summaryIndex} for ${YYYY}-${MM}-${DD}`; // Example title

	// Calculate expected markdown path for logging/return value
	const mdPath = path.join(
		process.cwd(),
		"web",
		"src",
		"content",
		"summaries",
		`${YYYY}/${MM}/${DD}-${summaryIndex}.md`,
	);

	await writeSummaryAsMd({
		date: now,
		index: summaryIndex,
		title: summaryTitle, // You can customize this title
		summary: summary, // The summary content from the LLM
	});
	log.debug(`Markdown file writing initiated for ${mdPath}`);

	// --- Create final result ---
	const result: AggregatorResult = {
		summary,
		fullContext,
		rawSections,
		timestamp,
		markdownPath: mdPath, // Include the path in the result
	};

	log.info(`Data collection cycle completed. Index: ${summaryIndex}`);
	return result;
}
