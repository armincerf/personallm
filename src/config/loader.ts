import { existsSync } from "node:fs";
import { ConfigError } from "../errors/index.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger({ namespace: "config" });

export type WeatherConfig = {
	latitude: number;
	longitude: number;
};

export type NewsConfig = {
	rssFeeds: string[];
	includeHackerNews: boolean;
	subreddits: string[];
	numTopPosts: number;
};

export type Config = {
	intervalMinutes: number;
	geminiModelName: string;
	geminiApiKey: string;

	healthDataDir?: string;
	transcriptsDbPath?: string;
	screenTimeDbPath?: string;
	iMessageDbPath?: string;

	weather: WeatherConfig;

	enableScreenTime: boolean;
	enableMail: boolean;
	enableCalendar: boolean;
	enableCalendarIcalBuddy: boolean;
	enableHealth: boolean;
	enableTranscripts: boolean;
	enableIMessage: boolean;

	iMessageChatsToRead: string[];

	news: NewsConfig;

	outputCsvPath: string;

	prompt: string;
};

const DEFAULT_CONFIG: Config = {
	// Interval and API settings
	intervalMinutes: 60,
	geminiModelName: "gemini-2.5-flash-preview-04-17",
	geminiApiKey: "",

	// Weather defaults (London)
	weather: {
		latitude: 51.503,
		longitude: -0.1276,
	},

	// Feature toggles
	enableScreenTime: false,
	enableMail: false,
	enableCalendar: true,
	enableCalendarIcalBuddy: true,
	enableHealth: false,
	enableTranscripts: false,
	enableIMessage: true,

	// iMessage settings
	iMessageChatsToRead: ["1", "128", "5"],

	// News settings
	news: {
		rssFeeds: ["https://feeds.bbci.co.uk/news/rss.xml?edition=uk"],
		includeHackerNews: true,
		subreddits: ["worldnews", "technology", "science", "UpliftingNews"],
		numTopPosts: 7,
	},

	// Output settings
	outputCsvPath: "./data/summaries.csv",

	// LLM prompt
	prompt: `
  You are a helpful assistant writing a light‑hearted morning brief.
  • Use **Markdown**.
  • Convert each news, Reddit or Hacker News headline in the context into "[title](link)" markdown.
  • Bullet‑points welcome; keep it short; avoid needless negativity.
  • Mention weather only if it will materially affect plans today.
  `,
};

export function loadConfig(overrides: Partial<Config> = {}): Config {
	try {
		// Required environment variables
		if (!process.env["GEMINI_API_KEY"]) {
			throw new ConfigError("GEMINI_API_KEY environment variable is not set");
		}

		// Build config from defaults, environment variables and overrides
		const config = {
			...DEFAULT_CONFIG,

			// Interval & API settings from env
			intervalMinutes:
				Number(process.env["INTERVAL_MINUTES"]) ||
				DEFAULT_CONFIG.intervalMinutes,
			geminiModelName:
				process.env["GEMINI_MODEL_NAME"] || DEFAULT_CONFIG.geminiModelName,
			geminiApiKey: process.env["GEMINI_API_KEY"] || "",

			// Path settings from env
			healthDataDir:
				process.env["HEALTH_DATA_DIR"] || process.env["HEALTH_DATA_PATH"],
			transcriptsDbPath: process.env["TRANSCRIPTS_DB_PATH"],
			screenTimeDbPath: process.env["SCREEN_TIME_DB_PATH"],
			iMessageDbPath:
				process.env["IMESSAGE_DB_PATH"] ||
				`${process.env["HOME"]}/Library/Messages/chat.db`,
			...DEFAULT_CONFIG.news,

			// Output path from env
			outputCsvPath:
				process.env["OUTPUT_CSV_PATH"] || DEFAULT_CONFIG.outputCsvPath,

			// Apply any overrides for tests
			...overrides,
		} as Config;

		// Validate paths exist if features are enabled
		if (config.enableHealth && !config.healthDataDir) {
			log.warn("Health data fetcher enabled but no HEALTH_DATA_DIR specified");
		}

		if (
			config.enableTranscripts &&
			(!config.transcriptsDbPath || !existsSync(config.transcriptsDbPath))
		) {
			log.warn(
				"Meeting transcripts fetcher enabled but TRANSCRIPTS_DB_PATH not found",
			);
		}

		if (
			config.enableScreenTime &&
			(!config.screenTimeDbPath || !existsSync(config.screenTimeDbPath))
		) {
			log.warn("Screen time fetcher enabled but SCREEN_TIME_DB_PATH not found");
		}

		if (
			config.enableIMessage &&
			(!config.iMessageDbPath || !existsSync(config.iMessageDbPath))
		) {
			log.warn("iMessage fetcher enabled but IMESSAGE_DB_PATH not found");
		}

		return config;
	} catch (error) {
		if (error instanceof ConfigError) {
			throw error;
		}
		throw new ConfigError(
			`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// Factory function for tests
export function createConfig(overrides: Partial<Config> = {}): Config {
	return loadConfig(overrides);
}
