// src/env.ts
// This file should be imported before any other modules to ensure environment variables are loaded

import { existsSync, readFileSync } from "node:fs";

// Load environment variables from .env file
function loadEnv(): void {
  try {
    if (existsSync(".env")) {
      const envText = readFileSync(".env", "utf-8");
      const envLines = envText.split('\n');
      
      for (const line of envLines) {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) continue;
        
        // Parse KEY=VALUE format
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          
          // Only set if not already in process.env
          if (!(key in process.env)) {
            process.env[key] = value;
          }
        }
      }
      console.log("✅ Environment variables loaded from .env file");
    }
  } catch (err) {
    console.error("⚠️ Error loading environment variables:", err);
  }
}

// Load environment variables immediately when this module is imported
loadEnv(); 