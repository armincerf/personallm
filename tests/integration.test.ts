import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import path from "node:path";
import { createConfig } from "../src/config/loader.js";
import { runOnce } from "../src/aggregator.js";

const OUT_DIR = path.resolve(__dirname, "output");
const todayCsv = (): string => {
	const n = new Date();
	return path.join(
		OUT_DIR,
		`${n.getFullYear()}/${String(n.getMonth() + 1).padStart(2, "0")}/${String(
			n.getDate(),
		).padStart(2, "0")}.csv`,
	);
};

describe("Aggregator end‑to‑end", () => {
	// Use test configuration with minimal enabled features
	const testConfig = createConfig({
		outputCsvPath: path.join(OUT_DIR, "dummy.csv"),
		// Disable features that might timeout or fail in CI
		enableIMessage: false,
		enableCalendar: false,
		enableCalendarIcalBuddy: false,
		enableHealth: false,
		enableMail: false,
		enableScreenTime: false,
		enableTranscripts: false,
	});

	beforeEach(() => {
		if (fs.existsSync(todayCsv())) fs.rmSync(todayCsv());
		fs.mkdirSync(path.dirname(todayCsv()), { recursive: true });
	});

	it("runs one cycle and writes CSV", async () => {
		const result = await runOnce(testConfig);

		// Assert result has expected structure and data
		expect(result.summary).toMatch(/\w+/); // not empty
		expect(result.fullContext).toBeTruthy(); // context was generated
		expect(result.rawSections.length).toBeGreaterThan(0); // at least some data was collected
		expect(result.timestamp).toMatch(/\d{4}-\d{2}-\d{2}/); // has date in timestamp

		// Check CSV file was written
		expect(fs.existsSync(todayCsv())).toBe(true);
		expect(fs.existsSync(todayCsv().replace(".csv", ".ctx.br"))).toBe(true);
		const csv = fs.readFileSync(todayCsv(), "utf8").split("\n");
		expect(csv.length).toBeGreaterThan(1); // at least header + 1 line
	}, 60_000); // Increase timeout to 60 seconds
});
