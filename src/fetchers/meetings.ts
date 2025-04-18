import { Database } from "bun:sqlite";
import { config } from "../config.js";

interface TranscriptRow {
  content: string;
}

// Example schema assumption: a table "transcripts" with columns (id, datetime, content)
export function fetchMeetingTranscripts(): string {
  try {
    const db = new Database(config.transcriptsDbPath);
    
    // Get transcripts from the last 24 hours
    // This approach works regardless of whether datetime is stored as:
    // - ISO string (text)
    // - UNIX timestamp (integer seconds)
    // - Julian date (SQLite's native datetime format)
    const query = `
      SELECT content FROM transcripts 
      WHERE datetime(datetime, 'unixepoch') > datetime('now', '-1 day')
      OR datetime > datetime('now', '-1 day')
      ORDER BY datetime DESC
      LIMIT 10
    `;
    
    const rows = db.query(query).all() as TranscriptRow[];
    db.close();
    
    if (!rows || rows.length === 0) {
      return ""; // no recent transcripts
    }
    
    // Concatenate all transcripts content
    const allText = rows.map(r => r.content).join("\n\n---\n\n");
    return `Meeting Transcripts:\n${allText}`;
  } catch (err) {
    console.error("Error fetching meeting transcripts:", err);
    return "";
  }
} 