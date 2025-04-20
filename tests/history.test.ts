import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import path from "node:path";
import { loadPreviousSummary } from "../src/utils/history.js";
import { mkdir } from "node:fs/promises";

const TEST_DIR = path.resolve(__dirname, "output/history_test");

describe("loadPreviousSummary", () => {
	beforeEach(async () => {
		// Clean up and recreate test directory
		if (fs.existsSync(TEST_DIR)) {
			fs.rmSync(TEST_DIR, { recursive: true, force: true });
		}

		// Setup yesterday's date for testing
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const year = yesterday.getFullYear();
		const month = String(yesterday.getMonth() + 1).padStart(2, "0");
		const day = String(yesterday.getDate()).padStart(2, "0");

		// Create directory structure
		const dirPath = path.join(TEST_DIR, `${year}/${month}`);
		await mkdir(dirPath, { recursive: true });

		// Create CSV file with test data
		const csvPath = path.join(dirPath, `${day}.csv`);
		fs.writeFileSync(
			csvPath,
			`"timestamp","summary"\n"2023-01-01 08:00:00","Test summary from yesterday"`,
		);

		// Create a mock context file
		// In a real test, we'd compress this with Zstd, but for simplicity we'll just create a file
		const ctxPath = path.join(dirPath, `${day}.ctx.zst`);

		// Create a simple Zstd-compressed mock file (this is just a placeholder)
		// In reality this test would need actual compression/decompression logic
		const mockBuffer = new Uint8Array([0x28, 0xb5, 0x2f, 0xfd]); // Just a mock zstd magic header
		fs.writeFileSync(ctxPath, mockBuffer);
	});

	it("loads previous summary from CSV", async () => {
		// The test path is just a dummy since the function will use the day-1 logic
		const result = await loadPreviousSummary(path.join(TEST_DIR, "dummy.csv"));

		// We expect to find the summary
		expect(result.summary).toBe("Test summary from yesterday");

		// Context will be null since our mock file isn't actually valid Zstd data
		expect(result.context).toBe(null);
	});
});
