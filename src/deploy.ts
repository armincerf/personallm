import { createLogger } from "./utils/logger";

export async function deployWeb(): Promise<void> {
	const log = createLogger({ namespace: "deploy" });

	log.info("Deploying web content");

	const originalDir = process.cwd();
	const webDir = "web";

	try {
		process.chdir(webDir);

		// Run build
		const buildProc = Bun.spawn(["bun", "run", "build"], {
			stdio: ["inherit", "inherit", "inherit"],
		});
		const buildExit = await buildProc.exited;
		if (buildExit !== 0) throw new Error("Build failed");

		// Run deploy
		const deployProc = Bun.spawn(["bun", "run", "deploy"], {
			stdio: ["inherit", "inherit", "inherit"],
		});
		const deployExit = await deployProc.exited;
		if (deployExit !== 0) throw new Error("Deploy failed");

		process.chdir(originalDir);
	} catch (error) {
		log.error(
			`Error during deploy: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.chdir(originalDir);
		throw error;
	}
}
