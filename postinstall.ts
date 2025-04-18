#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { checkRequiredEnvVars } from "./setup";

async function main() {
  console.log("🔍 Checking PersonalLM configuration...");
  
  // Check if .env file exists and contains required variables
  if (!existsSync(".env") || !checkRequiredEnvVars()) {
    console.log("📝 Required configuration not found. Running setup...");
    
    // Spawn setup.ts as a child process
    const setup = spawn("bun", ["setup.ts"], {
      stdio: "inherit",
    });
    
    // Wait for setup to complete
    await new Promise<void>((resolve, reject) => {
      setup.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Setup process exited with code ${code}`));
        }
      });
      
      setup.on("error", (err) => {
        reject(err);
      });
    });
    
    console.log("✅ Setup completed successfully!");
  } else {
    console.log("✅ PersonalLM is already configured.");
  }
}

main().catch((err) => {
  console.error("❌ Postinstall failed:", err);
  process.exit(1);
}); 