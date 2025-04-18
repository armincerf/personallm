// src/config.ts

// Define types for the config object for better type safety
interface WeatherConfig {
    latitude: number;
    longitude: number;
    useDaily: boolean;
    useCurrent: boolean;
  }
  
  interface NewsConfig {
    bbcRssUrl: string;
    includeHackerNews: boolean;
    subreddits: string[];
    numTopPosts: number;
  }
  
  interface AppConfig {
    intervalMinutes: number;
    prompt: string;
    healthDataPaths: string[];
    transcriptsDbPath: string;
    screenTimeDbPath: string;
    weather: WeatherConfig;
    news: NewsConfig;
    geminiApiUrl: string;
    geminiApiKey: string;
    outputCsvPath: string;
    enableScreenTime: boolean;
    enableMail: boolean;
    enableCalendar: boolean;
  }
  
  // Helper to read env vars via bracket notation with a default
  function env(key: string, defaultValue: string): string {
    return process.env[key] ?? defaultValue;
  }
  
  // Export the typed config object
  export const config: AppConfig = {
    // Interval in minutes (e.g., 60 for hourly)
    intervalMinutes: Number(env("INTERVAL_MINUTES", "60")),
  
    // Prompt to instruct the LLM on how to summarize the data.
    prompt: env("LLM_PROMPT", "Summarize the following information for my daily overview:"),
  
    // Paths to local data sources
    healthDataPaths: [
      env("HEALTH_DATA_PATH", "/Users/yourusername/Health/health_data.json"),
      env("WORKOUTS_DATA_PATH", "/Users/yourusername/Health/workouts.json")
    ],
    transcriptsDbPath: env("TRANSCRIPTS_DB_PATH", "/Users/yourusername/Data/meetings.sqlite"),
    screenTimeDbPath: env(
      "SCREEN_TIME_DB_PATH",
      "/Users/yourusername/Library/Application Support/ScreenTimeAgent/Database/CoreDuetData.db"
    ),
  
    // Weather API configuration
    weather: {
      latitude: Number(env("LATITUDE", "51.503")),
      longitude: Number(env("LONGITUDE", "-0.1276")),
      useDaily: env("USE_DAILY_WEATHER", "true") === "true",
      useCurrent: env("USE_CURRENT_WEATHER", "true") === "true"
    },
  
    // News sources configuration
    news: {
      bbcRssUrl: env("BBC_RSS_URL", "https://feeds.bbci.co.uk/news/rss.xml"),
      includeHackerNews: env("INCLUDE_HN", "true") === "true",
      subreddits: env("SUBREDDITS", "worldnews,technology")
        .split(",")
        .map((s) => s.trim()),
      numTopPosts: Number(env("NUM_TOP_POSTS", "5"))
    },
  
    // Gemini LLM API details
    geminiApiUrl: env("GEMINI_API_URL", "https://api.gemini.com/v1/summarize"),
    geminiApiKey: env("GEMINI_API_KEY", ""),
  
    // Output file for summaries
    outputCsvPath: env("OUTPUT_CSV_PATH", "/Users/yourusername/Data/summaries.csv"),
  
    // Toggles for optional data
    enableScreenTime: env("ENABLE_SCREEN_TIME", "false") === "true",
    enableMail: env("ENABLE_MAIL", "false") === "true",
    enableCalendar: env("ENABLE_CALENDAR", "false") === "true"
  };
  