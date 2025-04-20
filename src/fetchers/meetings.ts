import { Database } from "bun:sqlite";
import { config } from "../config.js";
import { TranscriptRowSchema } from "../schemas.js";

// Example schema assumption: a table "transcripts" with columns (id, datetime, content)
export function fetchMeetingTranscripts(): string {
	if (!config.enableTranscripts) {
		console.log("Meeting transcripts fetcher is disabled");
		return "";
	}
	try {
		const db = new Database(config.transcriptsDbPath);

		// Get transcripts from the last 24 hours
		// This approach works regardless of whether datetime is stored as:
		// - ISO string (text)
		// - UNIX timestamp (integer seconds)
		// - Julian date (SQLite's native datetime format)
		const query = `
      SELECT content FROM transcripts 
      WHERE datetime(datetime, 'unixepoch') > datetime('now', '-1 day')
      OR datetime > datetime('now', '-1 day')
      ORDER BY datetime DESC
      LIMIT 10
    `;

		const rowsRaw = db.query(query).all();
		db.close();
		// Validate rows shape
		const parsed = TranscriptRowSchema.array().safeParse(rowsRaw);
		if (!parsed.success) {
			console.error(
				"Meeting transcripts validation error:",
				parsed.error.format(),
			);
			return "";
		}
		const rows = parsed.data;
		if (rows.length === 0) {
			return "";
		}
		const allText = rows.map((r) => r.content).join("\n\n---\n\n");
		return `Meeting Transcripts:\n${allText}`;
	} catch (err) {
		console.error("Error fetching meeting transcripts:", err);
		return "";
	}
}
