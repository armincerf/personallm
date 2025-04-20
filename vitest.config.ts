import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		setupFiles: ["./tests/setup.ts"], // Use our centralized setup file for all tests
		include: ["tests/**/*.test.ts"],
		exclude: ["node_modules"],
		environment: "node",
	},
});
