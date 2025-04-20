import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import path from "node:path";
import type { APIRoute } from "astro";

// Helper to get context file path
function getContextFilePath(year: string, month: string, day: string): string {
	// Get the path to the context file
	// Context files are now stored as data/YYYY/MM/DD.ctx.br
	return path.join(
		process.cwd(), // .../project/web
		"..", // .../project
		"data", // .../project/data
		year, // .../project/data/YYYY
		month, // .../project/data/YYYY/MM
		`${day}.ctx.br`, // .../project/data/YYYY/MM/DD.ctx.br
	);
}

export const GET: APIRoute = async ({ params }) => {
	const { year, month, day } = params;

	// Ensure all params are present
	if (!year || !month || !day) {
		return new Response(JSON.stringify({ error: "Missing parameters" }), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	try {
		// Get the file path for the context file
		const filePath = getContextFilePath(year, month, day);

		// Read and decompress the file
		const compressedData = readFileSync(filePath);
		const jsonBuffer = brotliDecompressSync(compressedData);
		const jsonString = jsonBuffer.toString("utf-8");

		// Validate that the result is valid JSON
		// This will throw if the JSON is invalid
		JSON.parse(jsonString);

		// Return the JSON data
		return new Response(jsonString, {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "max-age=3600", // Cache for 1 hour
			},
		});
	} catch (error) {
		console.error(
			`Error serving context file: ${error instanceof Error ? error.message : String(error)}`,
		);

		return new Response(
			JSON.stringify({
				error: "Failed to load context file",
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	}
};
