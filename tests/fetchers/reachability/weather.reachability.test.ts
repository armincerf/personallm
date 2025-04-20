import { describe, it, expect } from "vitest";
import { fetchWeather } from "../../../src/fetchers/weather.js";

describe("Weather Fetcher Reachability", () => {
	it("should attempt to fetch weather without crashing", async () => {
		let result: string | undefined;
		let error: unknown = null;

		try {
			result = await fetchWeather();
		} catch (e) {
			error = e;
			console.error("Reachability test caught error:", e);
		}

		expect(error).toBeNull();
		expect(typeof result).toBe("string");
	}, 15000);
});
