import { config } from "../config.js";
import { runAppleScript } from "../utils/apple-script.js";

// Constants
const EVENT_DELIMITER = " || ";

export function fetchCalendarEvents(): string {
  if (!config.enableCalendar) return "";
  
  try {
    // AppleScript to get events for the rest of today (from now until midnight)
    const script = `
      set outText to ""
      tell application "Calendar"
        set nowDate to current date
        set todayStart to date (short date string of nowDate) -- today at 00:00
        set todayEnd to todayStart + 1 * days
        set allEvents to {}
        repeat with cal in calendars
          set allEvents to allEvents & (events of cal whose start date ≥ nowDate and start date < todayEnd)
        end repeat
        repeat with ev in allEvents
          set eventTime to time string of (start date of ev)
          set outText to outText & (summary of ev) & " at " & eventTime & "${EVENT_DELIMITER}"
        end repeat
      end tell
      return outText
    `;
    
    // Execute the script safely
    const result = runAppleScript(script);
    if (!result) return "";
    
    // result is "Event1 at HH:MM:SS || Event2 at HH:MM:SS || ... || "
    const eventsStr = result.replace(new RegExp(`\\s*${EVENT_DELIMITER}\\s*$`), "");
    
    // Count events by splitting on delimiter
    const count = eventsStr === "" ? 0 : eventsStr.split(EVENT_DELIMITER).length;
    return count > 0 ? `Calendar: ${count} events today -> ${eventsStr}` : "";
  } catch (err) {
    console.error("Calendar fetch error (check permissions):", err);
    return "";
  }
} 