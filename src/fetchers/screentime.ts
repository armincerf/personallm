import { Database } from "bun:sqlite";
import { config } from "../config/index.js";
import { AppUsageSchema } from "../schemas.js";
import {
	toAppleTimestamp,
	detectNanoseconds,
} from "../utils/apple-timestamps.js";

export function fetchScreenTime(): string {
	// Skip if Screen Time is disabled
	if (!config.enableScreenTime) {
		return "";
	}

	try {
		const db = new Database(config.screenTimeDbPath);

		// Calculate timestamp for one day ago
		const since = toAppleTimestamp(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago by default

		// Check the timestamp scale by examining a few records
		const scaleSql = `
      SELECT AVG(ZENDDATE - ZSTARTDATE) as avg_duration
      FROM ZOBJECT 
      WHERE ZSTREAMNAME = "/app/inFocus" 
      LIMIT 10
    `;
		const scaleResult = db.query(scaleSql).get() as
			| { avg_duration: bigint | null }
			| undefined;

		// Get the average duration or default to null if no results
		const avgDuration = scaleResult?.avg_duration ?? null;
		const isNanoseconds = detectNanoseconds(avgDuration);

		// Adjust the query based on the timestamp scale
		const divisor = isNanoseconds ? 1000000000 : 1; // convert ns to seconds if needed

		// Query: sum usage durations by app bundle for usage entries in last 24h
		const sql = `
      SELECT ZOBJECT.ZVALUESTRING as appBundle, 
             SUM((ZOBJECT.ZENDDATE - ZOBJECT.ZSTARTDATE) / ${divisor}) as totalSeconds
      FROM ZOBJECT 
      WHERE ZSTREAMNAME = "/app/inFocus" 
        AND ZSTARTDATE > ? 
      GROUP BY ZOBJECT.ZVALUESTRING
      ORDER BY totalSeconds DESC
      LIMIT 5;`;

		const rowsRaw = db.query(sql).all(since);
		db.close();

		// Validate data shape
		const parsed = AppUsageSchema.array().safeParse(rowsRaw);
		if (!parsed.success) {
			console.error(
				"Screen Time data validation error:",
				parsed.error.format(),
			);
			return "";
		}
		const topApps = parsed.data;
		if (topApps.length === 0) {
			return "";
		}

		// Prepare human-readable summary (convert seconds to minutes)
		const appSummaries = topApps.map((row) => {
			const minutes = Math.round(row.totalSeconds / 60);
			return `${row.appBundle}: ${minutes} min`;
		});
		return `Screen Time (last 24h): ${appSummaries.join(", ")}`;
	} catch (err) {
		console.error("Error fetching Screen Time data:", err);
		return "";
	}
}
