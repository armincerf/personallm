/**
 * Calendar fetcher using icalBuddy
 *
 * A more efficient, faster approach that directly uses the icalBuddy CLI tool
 * instead of AppleScript. Requires icalBuddy to be installed:
 * `brew install ical-buddy`
 */
import { config } from "../config/index.js";

const TIMEOUT_MS = 3_000; // icalBuddy is instant; fail fast
const DELIM = " || "; // keep the same delimiter you parse later

export async function fetchCalendarIcalBuddy(): Promise<string> {
	if (!config.enableCalendar) return "";

	try {
		// Use Bun.spawn for better performance
		const proc = Bun.spawn(
			[
				"icalBuddy",
				"--includeCalNames", // prepend calendar name (optional)
				"--noRelativeDates", // force absolute dates
				"--timeFormat",
				"%H:%M", // 24‑h times
				"eventsToday", // only today's events
			],
			{
				timeout: TIMEOUT_MS,
			},
		);

		const output = await Bun.readableStreamToText(proc.stdout);
		const raw = output.trim();

		if (!raw) return "";
		const compact = raw.replace(/\n+/g, DELIM); // single‑line like your other fetchers
		return `Calendar: ${compact}`;
	} catch (err) {
		// common failure is command not found or permission denied
		console.error(
			"icalBuddy fetch failed:",
			err instanceof Error ? err.message : String(err),
		);
		return "";
	}
}
