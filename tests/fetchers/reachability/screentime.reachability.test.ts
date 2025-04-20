import { describe, it, expect } from "vitest";
import { fetchScreenTime } from "../../../src/fetchers/screentime.js";
import { config } from "../../../src/config.js";
import { existsSync } from "node:fs";

// Skip if Screen Time is disabled or the database file does not exist
const skip =
	!config.enableScreenTime ||
	!config.screenTimeDbPath ||
	!existsSync(config.screenTimeDbPath);
const describeIf = skip ? describe.skip : describe;

describeIf("Screen Time Fetcher Reachability", () => {
	it("should attempt to fetch screen time without crashing", () => {
		let result: string | undefined;
		let error: unknown = null;

		try {
			result = fetchScreenTime();
		} catch (e) {
			error = e;
			console.error("Reachability test caught error:", e);
		}

		expect(error).toBeNull();
		expect(typeof result).toBe("string");
	});
});
