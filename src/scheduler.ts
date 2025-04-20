import "./env.js"; // keep env side‑effect here
import { runOnce, ensureCsvExists } from "./aggregator.js";
import { loadConfig } from "./config/loader.js";
import { createLogger } from "./utils/logger.js";
import { AppError } from "./errors/index.js";

const log = createLogger({ namespace: "scheduler" });

function setupGracefulShutdown(cb: () => void): void {
	let shutting = false;
	const wrap = (sig: string) => {
		if (shutting) return;
		shutting = true;
		log.info(`${sig} received – shutting down…`);
		setTimeout(cb, 1000);
	};
	process.on("SIGINT", () => wrap("SIGINT"));
	process.on("SIGTERM", () => wrap("SIGTERM"));
}

export async function mainLoop(): Promise<never> {
	try {
		// Load config at startup
		const config = loadConfig();
		const intervalMs = config.intervalMinutes * 60 * 1000;

		log.info(
			`Starting PersonalLM data aggregator. Running every ${config.intervalMinutes} minutes.`,
		);

		// Log configuration information
		log.info("Configuration:");
		log.info(`- Model: ${config.geminiModelName}`);
		log.info(
			`- Location: Latitude ${config.weather.latitude}, Longitude ${config.weather.longitude}`,
		);

		const enabledFetchers = [
			config.enableScreenTime ? "Screen Time" : null,
			config.enableMail ? "Mail" : null,
			config.enableCalendar ? "Calendar" : null,
			config.enableIMessage ? "iMessage" : null,
		].filter(Boolean);

		log.info(`- Fetchers enabled: ${enabledFetchers.join(", ") || "None"}`);

		// Ensure CSV file exists - do this only once at startup
		await ensureCsvExists(config);
		setupGracefulShutdown(() => process.exit(0));

		// Main loop
		while (true) {
			try {
				// Ensure the daily CSV file for today exists before each run
				// This is particularly important when the process runs across midnight
				await ensureCsvExists(config);

				log.info("Starting data collection cycle");
				const result = await runOnce(config);
				log.info(
					`Completed cycle with ${result.rawSections.length} data sources`,
				);
			} catch (error) {
				if (error instanceof AppError) {
					log.error(
						`Application error during cycle: ${error.code} - ${error.message}`,
					);
				} else {
					log.error("Unexpected error during cycle:", error);
				}
			}

			log.info(`Waiting ${config.intervalMinutes} minutes until next run...`);
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}
	} catch (error) {
		log.error("Fatal scheduler error:", error);
		process.exit(1);
	}
}

// Re-export from scheduler.ts for PM2 compatibility
export * from "./aggregator.js";

// Only run if this file is executed directly
const scriptPath = new URL(import.meta.url).pathname;
const isMainModule = process.argv[1]?.endsWith(scriptPath) ?? false;

if (isMainModule) {
	mainLoop().catch((e) => {
		console.error("Fatal loop error:", e);
		process.exit(1);
	});
}
