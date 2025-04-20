import { readFile } from "node:fs/promises";
import path from "node:path";
import { brotliDecompress } from "node:zlib";
import { promisify } from "node:util";
import type { FetcherResult } from "../aggregator.js";

const brotliDecompressAsync = promisify(brotliDecompress);

export async function loadPreviousSummary(baseCsvPath: string): Promise<{
	summary: string | null;
	context: string | null;
}> {
	const d = new Date();
	d.setDate(d.getDate() - 1);

	const dir = path.join(
		path.dirname(baseCsvPath),
		`${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`,
	);
	const day = `${String(d.getDate()).padStart(2, "0")}`;

	const csv = path.join(dir, `${day}.csv`);
	const ctx = path.join(dir, `${day}.ctx.br`);

	let summary: string | null = null;
	if (await Bun.file(csv).exists()) {
		const lines = (await Bun.file(csv).text()).trim().split("\n");
		summary = lines.at(-1)?.split('","').at(-1)?.replace(/"$/, "") ?? null;
	}

	let fullContext: string | null = null;
	try {
		if (await Bun.file(ctx).exists()) {
			const buf = await readFile(ctx);
			const decompressed = await brotliDecompressAsync(buf);
			// Parse as a single JSON object (the latest run's context)
			const contextText = new TextDecoder().decode(decompressed);
			try {
				const contextData = JSON.parse(contextText);
				// Just return the raw sections content joined together
				if (contextData.sections && Array.isArray(contextData.sections)) {
					fullContext = contextData.sections
						.map((section: FetcherResult) => section.content)
						.join("\n\n");
				}
			} catch (jsonError) {
				console.error("Failed to parse context JSON:", jsonError);
			}
		}
	} catch (error) {
		console.error("Failed to decompress context file:", error);
		fullContext = null;
	}

	return { summary, context: fullContext };
}
