import { defineConfig, passthroughImageService } from "astro/config";
import node from "@astrojs/node";
import tailwindVite from "@tailwindcss/vite";

import preact from "@astrojs/preact";

export default defineConfig({
	image: {
		service: passthroughImageService(),
	},
	output: "static",

	vite: {
		plugins: [tailwindVite()],
	},

	integrations: [preact()],
});
