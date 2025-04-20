import Parser from "rss-parser";
import { config } from "../config.js";
import { HackerNewsResponseSchema, RedditResponseSchema } from "../schemas.js";

const parser = new Parser();
const TODAY = new Date(); // evaluated once per run

/* ---------- utilities ---------- */
function isToday(pubDate?: string): boolean {
	if (!pubDate) return false;
	const d = new Date(pubDate);
	return (
		d.getUTCFullYear() === TODAY.getUTCFullYear() &&
		d.getUTCMonth() === TODAY.getUTCMonth() &&
		d.getUTCDate() === TODAY.getUTCDate()
	);
}

/* ---------- RSS ---------- */
async function fetchRSS(): Promise<string[]> {
	const headlines: string[] = [];
	for (const feedUrl of config.news.rssFeeds) {
		try {
			const feed = await parser.parseURL(feedUrl);
			const todayItems =
				feed.items
					?.filter((it) => isToday(it.pubDate))
					.slice(0, config.news.numTopPosts) || [];

			for (const it of todayItems) {
				const link = it.link ?? feedUrl;
				headlines.push(`[${it.title}](${link})`);
			}
		} catch (err) {
			console.error(`RSS fetch error for ${feedUrl}:`, err);
		}
	}
	return headlines;
}

/* ---------- Hacker News ---------- */
async function fetchHackerNews(): Promise<string[]> {
	if (!config.news.includeHackerNews) return [];
	const HN_API = `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${config.news.numTopPosts}`;
	try {
		const res = await fetch(HN_API);
		const json = await res.json();
		const parsed = HackerNewsResponseSchema.safeParse(json);
		if (!parsed.success) return [];
		return parsed.data.hits.map((h) => {
			const link =
				h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`;
			return `[${h.title}](${link})`;
		});
	} catch (err) {
		console.error("Hacker News fetch error:", err);
		return [];
	}
}

/* ---------- Reddit ---------- */
async function fetchReddit(): Promise<string[]> {
	const out: string[] = [];
	for (const sub of config.news.subreddits) {
		const url = `https://www.reddit.com/r/${sub}/top.json?t=day&limit=${config.news.numTopPosts}`;
		try {
			const res = await fetch(url, {
				headers: { "User-Agent": "BunNewsFetcher/1.0" },
			});
			const json = await res.json();
			const parsed = RedditResponseSchema.safeParse(json);
			if (!parsed.success) continue;

			const children = parsed.data.data?.children;
			if (!children) continue;

			for (const child of children) {
				const { title, permalink } = child.data;
				out.push(`[${title}](https://reddit.com${permalink})`);
			}
		} catch (err) {
			console.error(`Reddit fetch error (${sub}):`, err);
		}
	}
	return out;
}

/* ---------- Public API ---------- */
export async function fetchNews(): Promise<string> {
	const [rss, hn, reddit] = await Promise.all([
		fetchRSS(),
		fetchHackerNews(),
		fetchReddit(),
	]);

	const sections: string[] = [];
	if (rss.length) sections.push(`RSS: ${rss.join(" | ")}`);
	if (hn.length) sections.push(`Hacker News: ${hn.join(" | ")}`);
	if (reddit.length) sections.push(`Reddit: ${reddit.join(" | ")}`);

	return sections.length ? `News: ${sections.join(" || ")}` : "";
}
