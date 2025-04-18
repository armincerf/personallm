import { config } from "../config.js";
import { runAppleScript } from "../utils/apple-script.js";

// Constants for delimiter patterns
const SUBJECT_DELIMITER = " || ";
const RESULT_DELIMITER = "##";

export function fetchMailData(): string {
  if (!config.enableMail) return "";
  
  try {
    // AppleScript to get unread count and subjects of the 5 most recent inbox emails
    const script = `
      tell application "Mail"
        set unreadCount to unread count of inbox
        set recentSubs to ""
        try
          set recentMessages to items 1 thru 5 of (get messages of inbox)
          repeat with m in recentMessages
            set recentSubs to recentSubs & (subject of m) & "${SUBJECT_DELIMITER}"
          end repeat
        end try
        return (unreadCount as string) & "${RESULT_DELIMITER}" & recentSubs
      end tell
    `;
    
    // Execute the script safely
    const result = runAppleScript(script);
    if (!result) return "";
    
    // The result is expected in format "unreadCount##subject1 || subject2 || subject3 || ... || "
    const [unreadStr, subjectsStr] = result.split(RESULT_DELIMITER);
    const unreadCount = Number.parseInt(unreadStr, 10);
    let output = `Mail: ${unreadCount} unread`;
    
    if (subjectsStr) {
      // Remove trailing delimiter and trim
      const subjects = subjectsStr.replace(new RegExp(`\\s*${SUBJECT_DELIMITER}\\s*$`), "");
      output += `. Recent subjects: ${subjects}`;
    }
    
    return output;
  } catch (err) {
    console.error("Mail fetch error (ensure Accessibility/Automation permissions):", err);
    return "";
  }
} 