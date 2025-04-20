import { describe, it, expect } from "vitest";
import { fetchMeetingTranscripts } from "../../../src/fetchers/meetings.js";
import { config } from "../../../src/config.js";
import { existsSync } from "node:fs";

// Skip if the transcripts database file does not exist
const skip = !config.transcriptsDbPath || !existsSync(config.transcriptsDbPath);
const describeIf = skip ? describe.skip : describe;

describeIf("Meetings Fetcher Reachability", () => {
	it("should attempt to fetch meeting transcripts without crashing", () => {
		let result: string | undefined;
		let error: unknown = null;

		try {
			result = fetchMeetingTranscripts();
		} catch (e) {
			error = e;
			console.error("Reachability test caught error:", e);
		}

		expect(error).toBeNull();
		expect(typeof result).toBe("string");
	});
});
