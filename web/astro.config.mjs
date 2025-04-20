import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindVite from "@tailwindcss/vite";

import preact from "@astrojs/preact";

export default defineConfig({
  output: "server",

  adapter: node({
      mode: "standalone",
	}),

  vite: {
      plugins: [tailwindVite()],
	},

  integrations: [preact()],
});