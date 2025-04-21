import { readFileSync } from "node:fs";
import path from "node:path";
import { config } from "../config/index.js";
import { HealthDataSchema } from "../schemas.js";

const healthErrorStr = "Error fetching health data";

// Fetch health data from local JSON files
export function fetchHealthData(): string {
	if (!config.enableHealth || !config.healthDataDir) {
		console.log("Health data fetcher is disabled");
		return "";
	}
	// Determine today's Health Auto Export JSON file
	const now = new Date();
	const YYYY = now.getFullYear().toString();
	const MM = String(now.getMonth() + 1).padStart(2, "0");
	const DD = String(now.getDate()).padStart(2, "0");
	const filename = `HealthAutoExport-${YYYY}-${MM}-${DD}.json`;
	const filePath = path.join(config.healthDataDir, filename);
	try {
		const raw = readFileSync(filePath, "utf-8");
		const parsedJson = JSON.parse(raw);
		const parsed = HealthDataSchema.safeParse(parsedJson);
		if (!parsed.success) {
			console.error(
				`Health data validation error for file ${filePath}:`,
				parsed.error.format(),
			);
			return healthErrorStr;
		}
		const data = parsed.data;
		// If the JSON is an array of records, consider the latest entry
		const latest = Array.isArray(data) ? data[data.length - 1] : data;
		// Extract key metrics
		const parts: string[] = [];
		if (latest.steps !== undefined) {
			parts.push(`steps: ${latest.steps}`);
		}
		if (latest.calories !== undefined) {
			parts.push(`calories: ${latest.calories}`);
		}
		if (latest.heartRate !== undefined) {
			parts.push(`heartRate: ${latest.heartRate}`);
		}
		if (parts.length > 0) {
			return `Health Data: ${parts.join(", ")}`;
		}
	} catch (err) {
		console.error(`Health data fetch error for file ${filePath}:`, err);
	}
	return healthErrorStr;
}
