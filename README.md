# PersonalLM

A continuous data aggregation script that collects personal data from various sources, summarizes it using Gemini 2.5 Pro LLM, and stores the results in a CSV file.

## Features

- Collects data from multiple sources:
  - Health data from local JSON files
  - Meeting transcripts from SQLite database
  - macOS Screen Time usage
  - Weather data (using Open-Meteo API)
  - News from multiple RSS feeds, Hacker News, and Reddit (with clickable links)
  - Mail data (using macOS AppleScript)
  - Calendar events (using macOS AppleScript)
  - iMessage conversations (directly from Messages SQLite database)
- Uses Gemini 2.5 Pro to summarize collected data with Markdown formatting
- Runs periodically with PM2
- Stores summaries in a timestamped CSV file

## Technical Features

- Concurrent data fetching with Promise.all for better performance
- Proper environment variable loading before config initialization
- Safe AppleScript execution via stdin piping
- Robust SQLite date filtering that works with any datetime format
- Automatic detection of ScreenTime database timestamp format (seconds or nanoseconds)
- RSS feeds filtered to only show today's news
- News items include clickable links in Markdown format
- XML parsing that handles CDATA sections and attributes
- CSV handling with proper escaping of quotes and newlines
- Graceful shutdown handling for SIGINT/SIGTERM signals
- Strong TypeScript typing with strict compiler options

## Setup

1. Install dependencies:

```bash
bun install
```

The installation process will automatically run the setup script, which will:
- Detect your macOS username
- Check for available data sources and auto-disable unavailable ones
- Create necessary directories
- Ask for Gemini API key and other configuration details
- Ask for your location (e.g., "Milton Keynes, UK") and convert it to coordinates
- Generate a `.env` file with your settings
- Update the config.ts file to use environment variables

2. Run in development mode:

```bash
bun run dev
```

## Manual Setup

If you need to run setup again or want to change your configuration:

```bash
bun run setup
```

## Manual Configuration (Alternative to Setup Script)

If you prefer to configure manually, edit the `.env` file:
- Set API keys
- Configure data source paths
- Set aggregation interval
- Enable/disable specific data sources
- Configure RSS feeds (comma-separated list in RSS_FEEDS)

## PM2 Deployment

1. Install PM2 globally:

```bash
npm install -g pm2
```

2. Start the application with PM2:

```bash
bun run pm2
```

Or directly:

```bash
pm2 start pm2_process.json
```

3. Configure PM2 to start on system boot (optional):

```bash
pm2 startup
pm2 save
```

## Permissions

For Screen Time, Mail, and Calendar access, you might need to grant permissions:
- For Screen Time: Full Disk Access in System Preferences > Security & Privacy
- For Mail and Calendar: Automation access to control these applications

## Logs

When running with PM2, logs are stored in the `logs` directory.

## License

MIT
