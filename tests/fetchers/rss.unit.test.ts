import { describe, it, expect, vi } from "vitest";
import Parser from "rss-parser";
import { fetchNews } from "../../src/fetchers/news.js";

describe("RSS parsing (today filter)", () => {
	it("keeps only today's items", async () => {
		// Stub Parser.parseURL once → always yields two items, one today, one yesterday
		vi.spyOn(Parser.prototype, "parseURL").mockResolvedValueOnce({
			items: [
				{
					title: "Today headline",
					link: "https://example.com/a",
					pubDate: new Date().toUTCString(),
				},
				{
					title: "Old headline",
					link: "https://example.com/b",
					pubDate: new Date(Date.now() - 864e5).toUTCString(),
				},
			],
		} as unknown as Awaited<ReturnType<Parser["parseURL"]>>);

		const out = await fetchNews();
		expect(out).toContain("Today headline");
		expect(out).not.toContain("Old headline");
	});
});
