import { readFileSync } from "node:fs";
import { config } from "../config.js";

interface HealthData {
  date: string;
  steps?: number;
  calories?: number;
  heartRate?: number;
  [key: string]: unknown;
}

// Fetch health data from local JSON files
export function fetchHealthData(): string {
  const summaries: string[] = [];
  for (const filePath of config.healthDataPaths) {
    try {
      const raw = readFileSync(filePath, "utf-8");
      const data: HealthData | HealthData[] = JSON.parse(raw);
      // If the JSON is an array of records, consider the latest entry
      let latest: HealthData;
      if (Array.isArray(data)) {
        latest = data[data.length - 1];
      } else {
        latest = data;
      }
      // Simplify the health data to key metrics
      const { steps, calories, heartRate } = latest;
      const summary = [
        steps !== undefined ? `steps: ${steps}` : null,
        calories !== undefined ? `calories: ${calories}` : null,
        heartRate !== undefined ? `heartRate: ${heartRate}` : null
      ].filter(Boolean).join(", ");
      if (summary) {
        summaries.push(summary);
      }
    } catch (err) {
      console.error(`Health data fetch error for file ${filePath}:`, err);
      // Continue to next file on error (file not found or parse issue)
    }
  }
  if (summaries.length === 0) return "";  // no data
  return `Health Data: ${summaries.join(" | ")}`;
} 