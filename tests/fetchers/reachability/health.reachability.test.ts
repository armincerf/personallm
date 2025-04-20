import { describe, it, expect } from "vitest";
import { fetchHealthData } from "../../../src/fetchers/health.js";

describe("Health Fetcher Reachability", () => {
	it("should attempt to read health data without crashing", () => {
		let result: string | undefined;
		let error: unknown = null;

		try {
			result = fetchHealthData();
		} catch (e) {
			error = e;
			console.error("Reachability test caught error:", e);
		}

		expect(error).toBeNull();
		expect(typeof result).toBe("string");
	});
});
