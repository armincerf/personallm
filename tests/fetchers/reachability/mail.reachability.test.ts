import { describe, it, expect } from "vitest";
import { fetchMailData } from "../../../src/fetchers/mail.js";
import { config } from "../../../src/config.js";

// Skip mail test if mail fetcher is disabled
const skip = !config.enableMail;
const describeIf = skip ? describe.skip : describe;

describeIf("Mail Fetcher Reachability", () => {
	it("should attempt to fetch mail data without crashing", () => {
		let result: string | undefined;
		let error: unknown = null;

		try {
			result = fetchMailData();
		} catch (e) {
			error = e;
			console.error("Reachability test caught error:", e);
		}

		expect(error).toBeNull();
		expect(typeof result).toBe("string");
	});
});
