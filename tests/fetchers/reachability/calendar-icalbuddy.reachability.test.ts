import { describe, it, expect } from "vitest";
import { fetchCalendarIcalBuddy } from "../../../src/fetchers/calendar-icalbuddy.js";

describe("Calendar (icalBuddy) Fetcher Reachability", () => {
	it("should attempt to fetch calendar events without crashing", async () => {
		let result: string | undefined;
		let error: unknown = null;

		try {
			result = await fetchCalendarIcalBuddy();
		} catch (e) {
			error = e;
			console.error("Reachability test caught error:", e);
		}

		expect(error).toBeNull();
		expect(typeof result).toBe("string");
	});
});
