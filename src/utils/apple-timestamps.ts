/** Apple epoch offset between 1970‑01‑01 and 2001‑01‑01 in seconds */
export const APPLE_EPOCH_OFFSET = 978307200;

/**
 * Converts a JavaScript timestamp (ms since 1970) to Apple's Core Data timestamp (seconds since 2001)
 */
export function toAppleTimestamp(dateMs: number): number {
	return Math.floor(dateMs / 1000) - APPLE_EPOCH_OFFSET;
}

/**
 * Converts Apple "Core Data" timestamp (sec or ns) to JS Date
 */
export function appleToDate(ts: number | bigint, isNs: boolean): Date {
	const ts_bigint = typeof ts === "number" ? BigInt(Math.floor(ts)) : ts;

	if (isNs) {
		// Convert nanoseconds to seconds first
		const seconds = Number(ts_bigint / 1_000_000_000n);
		return new Date((seconds + APPLE_EPOCH_OFFSET) * 1000);
	}

	// Already in seconds
	return new Date((Number(ts_bigint) + APPLE_EPOCH_OFFSET) * 1000);
}

/**
 * Detects if timestamps in an Apple database are in nanoseconds or seconds
 * @param avgDuration Average duration between timestamps
 * @returns True if timestamps appear to be in nanoseconds
 */
export function detectNanoseconds(avgDuration: bigint | null): boolean {
	if (avgDuration === null) return false; // Default to seconds if no data
	return avgDuration > 100_000n; // If avg is over 100,000, it's likely nanoseconds
}
