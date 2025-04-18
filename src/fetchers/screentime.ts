import { Database } from "bun:sqlite";
import { config } from "../config.js";

interface AppUsage {
  appBundle: string;
  totalSeconds: number;
}

// Convert JavaScript timestamp to Apple's Core Data timestamp (seconds since 2001-01-01)
function toAppleTimestamp(dateMs: number): number {
  // Apple reference epoch offset in seconds (2001-01-01 00:00:00 UTC)
  const appleEpochOffset = 978307200;  // seconds between 1970 and 2001
  return Math.floor(dateMs/1000) - appleEpochOffset;
}

export function fetchScreenTime(): string {
  // Skip if Screen Time is disabled
  if (!config.enableScreenTime) {
    console.log("Screen Time fetcher is disabled");
    return "";
  }

  try {
    const db = new Database(config.screenTimeDbPath);
    
    // Calculate timestamp for one day ago
    const since = toAppleTimestamp(Date.now() - 24 * 60 * 60 * 1000);  // 24 hours ago by default
    
    // First, check the timestamp scale by examining a few records
    // This helps us determine if ZSTARTDATE/ZENDDATE are in seconds or nanoseconds
    const scaleSql = `
      SELECT AVG(ZENDDATE - ZSTARTDATE) as avg_duration
      FROM ZOBJECT 
      WHERE ZSTREAMNAME = "/app/inFocus" 
      LIMIT 10
    `;
    const scaleResult = db.query(scaleSql).get() as { avg_duration: number } | undefined;
    
    // Determine if timestamps are in nanoseconds by checking if avg_duration is over 100,000
    // (a typical app session is seconds to minutes, so if it's in the 100,000+ range, it's likely nanoseconds)
    const isNanoseconds = scaleResult && scaleResult.avg_duration > 100000;
    console.log(`Screen Time timestamps appear to be in ${isNanoseconds ? 'nanoseconds' : 'seconds'}`);
    
    // Adjust the query based on the timestamp scale
    const divisor = isNanoseconds ? 1000000000 : 1; // convert ns to seconds if needed
    
    // Query: sum usage durations by app bundle for usage entries in last 24h
    const sql = `
      SELECT ZOBJECT.ZVALUESTRING as appBundle, 
             SUM((ZOBJECT.ZENDDATE - ZOBJECT.ZSTARTDATE) / ${divisor}) as totalSeconds
      FROM ZOBJECT 
      WHERE ZSTREAMNAME = "/app/inFocus" 
        AND ZSTARTDATE > ? 
      GROUP BY ZOBJECT.ZVALUESTRING
      ORDER BY totalSeconds DESC
      LIMIT 5;`;
    
    const topApps = db.query(sql).all(since) as AppUsage[];
    db.close();
    
    if (!topApps || topApps.length === 0) {
      return "";
    }
    
    // Prepare human-readable summary (convert seconds to minutes)
    const appSummaries = topApps.map(row => {
      const minutes = Math.round(row.totalSeconds / 60);
      return `${row.appBundle}: ${minutes} min`;
    });
    
    return `Screen Time (last 24h): ${appSummaries.join(", ")}`;
  } catch (err) {
    console.error("Error fetching Screen Time data:", err);
    return "";
  }
} 