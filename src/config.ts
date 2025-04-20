// src/config.ts
import { ConfigSchema } from "./schemas.js";

/* ---------- safety guards ---------- */
if (!process.env["GEMINI_API_KEY"]) {
	console.error(
		"❌ FATAL ERROR: GEMINI_API_KEY environment variable is not set.",
	);
	process.exit(1);
}

/* ---------- build raw config ---------- */
const rawConfig = {
	/* ——— intervals & secrets stay backed by env ——— */
	intervalMinutes: Number(process.env["INTERVAL_MINUTES"] || 60),
	geminiModelName:
		process.env["GEMINI_MODEL_NAME"] || "gemini-2.5-flash-preview-04-17",
	geminiApiKey: process.env["GEMINI_API_KEY"] || "",

	/* ——— host‑specific paths still read from env ——— */
	healthDataDir:
		process.env["HEALTH_DATA_DIR"] || process.env["HEALTH_DATA_PATH"],
	transcriptsDbPath: process.env["TRANSCRIPTS_DB_PATH"],
	screenTimeDbPath: process.env["SCREEN_TIME_DB_PATH"],
	iMessageDbPath:
		process.env["IMESSAGE_DB_PATH"] ||
		`${process.env["HOME"]}/Library/Messages/chat.db`,

	/* ——— static defaults / toggles ——— */
	weather: {
		latitude: 51.503,
		longitude: -0.1276,
	},

	enableScreenTime: false,
	enableMail: false,
	enableCalendar: true,
	enableCalendarIcalBuddy: true,
	enableHealth: false,
	enableTranscripts: false,
	enableIMessage: true,

	/** chats to fetch (chat_identifier OR full iMessage address fetched from chat.db) */
	iMessageChatsToRead: [
		// Family
		"1",
		"128",

		// T & D
		"5",
	],

	news: {
		/** Comma‑separated list of RSS feeds */
		rssFeeds: (process.env["RSS_FEEDS"]
			?.split(",")
			.map((s) => s.trim())
			.filter(Boolean) as string[] | undefined) ?? [
			"https://feeds.bbci.co.uk/news/rss.xml?edition=uk",
		],
		includeHackerNews: true,
		subreddits: ["worldnews", "technology", "science", "UpliftingNews"],
		numTopPosts: 7,
	},

	// Output file for summaries
	outputCsvPath: process.env["OUTPUT_CSV_PATH"] || "./data/summaries.csv",

	prompt: `
  You are a helpful butler assistant writing a light‑hearted summary of the user's (Alex) day.
  - the time of day is ${new Date()
		.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		})
		.replace(/^0/, "")}
  • Use **Markdown**.
  • Convert each news, Reddit or Hacker News headline in the context into "[title](link)" markdown.
  • Bullet‑points welcome; keep it short; avoid needless negativity or news about war or politics.
  • Mention weather only if it will materially affect plans today,
   e.g if a run is planned and there is rain forecast.
   If you do mention it, link to the ios weather app.
  - mention anything that the user might need to know about the day ahead, referencing messages from the user's iMessage history if relevant.
  `,
};

/* ---------- validate ---------- */
export const config = ConfigSchema.parse(rawConfig);
