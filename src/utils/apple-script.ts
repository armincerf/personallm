import { execSync } from "node:child_process";

/**
 * Executes an AppleScript safely by piping the script content via stdin
 * rather than passing it as a command-line argument.
 * 
 * @param script The AppleScript to execute
 * @returns The output of the script as a string
 */
export function runAppleScript(script: string): string {
  try {
    const result = execSync("osascript", {
      input: script,
      encoding: "utf-8"
    });
    return result.trim();
  } catch (err) {
    console.error("Error running AppleScript:", err);
    return "";
  }
} 