import { createLogger } from "./utils/logger.js";
import { mainLoop, runOnce } from "./scheduler.js";
import { loadConfig } from "./config/loader.js";
import { ensureCsvExists } from "./aggregator.js";
import { deployWeb } from "./deploy.js";

const log = createLogger({ namespace: "cli" });

export type CliOptions = {
	once: boolean;
	setup: boolean;
	help: boolean;
	version: boolean;
	deployWeb: boolean;
};

export function parseArguments(args = Bun.argv): CliOptions {
	// Default options
	const options: CliOptions = {
		once: false,
		deployWeb: false,
		setup: false,
		help: false,
		version: false,
	};

	// Skip first two args (bun executable and script path)
	const cliArgs = args.slice(2);

	for (const arg of cliArgs) {
		if (arg === "--once" || arg === "-o") {
			options.once = true;
		} else if (arg === "--setup" || arg === "-s") {
			options.setup = true;
		} else if (arg === "--help" || arg === "-h") {
			options.help = true;
		} else if (arg === "--version" || arg === "-v") {
			options.version = true;
		} else if (arg === "--deploy-web" || arg === "-d") {
			options.deployWeb = true;
		}
	}

	return options;
}

function showHelp(): void {
	console.log(`
PersonalLM - Personal data aggregator and summarizer

Usage:
  bun run src/cli.ts [options]

Options:
  --once, -o     Run once and exit
  --setup, -s    Setup CSV files without running a collection cycle
  --help, -h     Show this help
  --version, -v  Show version information
`);
}

function showVersion(): void {
	console.log("PersonalLM v0.1.0");
}

export async function run(): Promise<void> {
	const options = parseArguments();

	if (options.help) {
		showHelp();
		return;
	}

	if (options.version) {
		showVersion();
		return;
	}

	const config = loadConfig();

	if (options.setup) {
		log.info("Setting up CSV files without running collection cycle");
		await ensureCsvExists(config);
		log.info("Setup complete");
		return;
	}

	if (options.once) {
		log.info("Running one collection cycle");
		await ensureCsvExists(config);
		const result = await runOnce(config);
		log.info(
			`Completed with ${result.rawSections.length} data sources. deploy flag is ${options.deployWeb}`,
		);
		// why is the flag always false :(
		//if (options.deployWeb) {
		log.info("Deploying web content");
		await deployWeb();
		//}
		return;
	}

	// Run the scheduler loop by default
	await mainLoop();
}

// Only run if this file is executed directly
const scriptPath = new URL(import.meta.url).pathname;
const isMainModule = process.argv[1]?.endsWith(scriptPath) ?? false;

if (isMainModule) {
	run().catch((error) => {
		log.error("Fatal CLI error:", error);
		process.exit(1);
	});
}
