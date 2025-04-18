import { config } from "../config.js";
import { extractElements } from "../utils/xml-parser.js";

// Helper to fetch text from a URL
async function fetchText(url: string, options: RequestInit = {}): Promise<string> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

// Fetch BBC News headlines via RSS
async function fetchBBC(): Promise<string[]> {
  try {
    const rssText = await fetchText(config.news.bbcRssUrl);
    
    // Use the more robust XML parser instead of regex
    const titles = extractElements(rssText, "title");
    
    // First title is usually the feed title, so skip it
    if (titles.length > 0) titles.shift();
    
    return titles.slice(0, config.news.numTopPosts);
  } catch (err) {
    console.error("BBC news fetch error:", err);
    return [];
  }
}

interface HackerNewsHit {
  title: string;
}

interface HackerNewsResponse {
  hits: HackerNewsHit[];
}

// Fetch Hacker News top story titles using HN Algolia API
async function fetchHackerNews(): Promise<string[]> {
  const HN_API = "https://hn.algolia.com/api/v1/search?tags=front_page";
  try {
    const response = await fetch(HN_API);
    const json = await response.json() as HackerNewsResponse;
    if (!json.hits) return [];
    return json.hits.slice(0, config.news.numTopPosts).map(item => item.title);
  } catch (err) {
    console.error("Hacker News fetch error:", err);
    return [];
  }
}

interface RedditPost {
  data: {
    title: string;
  };
}

interface RedditResponse {
  data?: {
    children?: RedditPost[];
  };
}

// Fetch top posts from specified subreddits (using Reddit JSON)
async function fetchReddit(): Promise<Record<string, string[]>> {
  const results: Record<string, string[]> = {};
  for (const sub of config.news.subreddits) {
    const url = `https://www.reddit.com/r/${sub}/top.json?t=day&limit=${config.news.numTopPosts}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "BunNewsFetcher/1.0" }  // custom UA to avoid 429 error
      });
      if (!res.ok) throw new Error(`Reddit API HTTP ${res.status}`);
      const data = await res.json() as RedditResponse;
      const posts = data.data?.children?.map(child => child.data.title) || [];
      results[sub] = posts.slice(0, config.news.numTopPosts);
    } catch (err) {
      console.error(`Reddit fetch error for r/${sub}:`, err);
      results[sub] = [];
    }
  }
  return results;
}

export async function fetchNews(): Promise<string> {
  const sections: string[] = [];
  const bbcHeadlines = config.news.bbcRssUrl ? await fetchBBC() : [];
  if (bbcHeadlines.length) {
    sections.push(`BBC: ${bbcHeadlines.join(" | ")}`);
  }
  if (config.news.includeHackerNews) {
    const hnHeadlines = await fetchHackerNews();
    if (hnHeadlines.length) {
      sections.push(`Hacker News: ${hnHeadlines.join(" | ")}`);
    }
  }
  if (config.news.subreddits.length) {
    const redditData = await fetchReddit();
    for (const [sub, titles] of Object.entries(redditData)) {
      if (titles.length) {
        sections.push(`Reddit (${sub}): ${titles.join(" | ")}`);
      }
    }
  }
  return sections.length ? `News: ${sections.join(" || ")}` : "";
} 