// tests/setup.ts
// Load environment variables from .env first - this will be loaded once before all tests
import "../src/env.js";
console.log("✅ Preload: Environment variables loaded.");

// Pre-import config here to catch errors early if needed during setup phase
try {
	await import("../src/config.js");
	console.log("✅ Preload: Config parsed successfully.");
} catch (e) {
	console.error("❌ Preload: Failed to parse config!", e);
	// Let individual tests handle skip logic instead of exiting here
}

// Configure Vitest to use this setup file for all tests
export async function setup() {
	// This function will be called by Vitest before running tests
	return {
		// Return any values you want to pass to teardown
	};
}

export async function teardown() {
	// Clean up resources if needed
}
