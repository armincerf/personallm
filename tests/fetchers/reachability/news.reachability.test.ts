import { describe, it, expect } from "vitest";
import { fetchNews } from "../../../src/fetchers/news.js";

describe("News Fetcher Reachability", () => {
	it("parses at least one section or returns empty string", async () => {
		const result = await fetchNews();
		expect(typeof result).toBe("string");
		// Assert it never throws, even if feeds offline
	}, 20000);
});
