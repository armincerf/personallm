/**
 * Central export so every file can do
 *   import { config } from "../config/index.js";
 * (Instead of reaching into loader.ts directly.)
 */
import { loadConfig } from "./loader.js";

export const config = loadConfig();
/* re‑export the Config type so callers don't need two imports */
export type { Config } from "./loader.js";
