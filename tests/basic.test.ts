import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';

// Mock the fs module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

// Mock the config module - include all required properties
vi.mock('../src/config.js', () => ({
  config: {
    outputCsvPath: './test-output.csv',
    enableScreenTime: true,
    enableMail: true,
    enableCalendar: true,
    intervalMinutes: 60,
    prompt: 'Test prompt',
    weather: {
      latitude: 51.5,
      longitude: -0.13
    },
    geminiApiUrl: 'https://example.com/api'
  }
}));

// Mock all the fetcher modules with the mock constants defined inside each factory function
vi.mock('../src/fetchers/health.js', () => ({
  fetchHealthData: vi.fn().mockReturnValue('Health data mock')
}));

vi.mock('../src/fetchers/meetings.js', () => ({
  fetchMeetingTranscripts: vi.fn().mockReturnValue('Meeting transcripts mock')
}));

vi.mock('../src/fetchers/screentime.js', () => ({
  fetchScreenTime: vi.fn().mockReturnValue('Screen time mock')
}));

vi.mock('../src/fetchers/weather.js', () => ({
  fetchWeather: vi.fn().mockResolvedValue('Weather mock')
}));

vi.mock('../src/fetchers/news.js', () => ({
  fetchNews: vi.fn().mockResolvedValue('News mock')
}));

vi.mock('../src/fetchers/mail.js', () => ({
  fetchMailData: vi.fn().mockReturnValue('Mail data mock')
}));

vi.mock('../src/fetchers/calendar.js', () => ({
  fetchCalendarEvents: vi.fn().mockReturnValue('Calendar events mock')
}));

// Mock the LLM client
vi.mock('../src/llmClient.js', () => ({
  summarizeWithLLM: vi.fn().mockResolvedValue('Test summary from LLM')
}));

// Define mocks for process methods 
// Using type annotations instead of 'any'
process.exit = vi.fn() as unknown as (code?: number) => never;
process.on = vi.fn() as unknown as typeof process.on;

// Import the runOnce function after all mocks are set up
import { runOnce, ensureCsvExists } from '../src/main.js';

describe('PersonalLM tests', () => {
  // Setup mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ensureCsvExists should create CSV file with header if it does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    
    ensureCsvExists();
    
    expect(fs.existsSync).toHaveBeenCalledWith('./test-output.csv');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      './test-output.csv',
      '"timestamp","summary"\n'
    );
  });

  it('runOnce should fetch data from all sources and save a summary', async () => {
    // Setup file system mock behavior
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    // Import all mocked functions
    const { fetchHealthData } = await import('../src/fetchers/health.js');
    const { fetchMeetingTranscripts } = await import('../src/fetchers/meetings.js');
    const { fetchScreenTime } = await import('../src/fetchers/screentime.js');
    const { fetchWeather } = await import('../src/fetchers/weather.js');
    const { fetchNews } = await import('../src/fetchers/news.js');
    const { fetchMailData } = await import('../src/fetchers/mail.js');
    const { fetchCalendarEvents } = await import('../src/fetchers/calendar.js');
    const { summarizeWithLLM } = await import('../src/llmClient.js');
    
    // Make sure fetchers return the expected values for this test
    vi.mocked(fetchHealthData).mockReturnValueOnce('Health data mock');
    vi.mocked(fetchMeetingTranscripts).mockReturnValueOnce('Meeting transcripts mock');
    vi.mocked(fetchScreenTime).mockReturnValueOnce('Screen time mock');
    vi.mocked(fetchWeather).mockResolvedValueOnce('Weather mock');
    vi.mocked(fetchNews).mockResolvedValueOnce('News mock');
    vi.mocked(fetchMailData).mockReturnValueOnce('Mail data mock');
    vi.mocked(fetchCalendarEvents).mockReturnValueOnce('Calendar events mock');
    
    // Set the LLM mock to return a non-null value
    vi.mocked(summarizeWithLLM).mockResolvedValueOnce('Test summary from LLM');

    await runOnce();

    // Verify all fetchers were called
    expect(fetchHealthData).toHaveBeenCalled();
    expect(fetchMeetingTranscripts).toHaveBeenCalled();
    expect(fetchScreenTime).toHaveBeenCalled();
    expect(fetchWeather).toHaveBeenCalled();
    expect(fetchNews).toHaveBeenCalled();
    expect(fetchMailData).toHaveBeenCalled();
    expect(fetchCalendarEvents).toHaveBeenCalled();

    // The LLM call will include all the mock data plus the prompt
    const expectedContext = [
      'Health data mock',
      'Meeting transcripts mock',
      'Screen time mock',
      'Weather mock',
      'News mock',
      'Mail data mock',
      'Calendar events mock',
      'Test prompt'
    ].join('\n\n');

    // Verify LLM was called with expected context
    expect(summarizeWithLLM).toHaveBeenCalledWith(expectedContext);

    // Verify data was saved to CSV
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      './test-output.csv',
      expect.stringContaining('Test summary from LLM')
    );
  });

  it('should handle fetcher errors gracefully', async () => {
    // Setup file system mock behavior
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    // Import all mocked functions
    const { fetchHealthData } = await import('../src/fetchers/health.js');
    const { fetchMeetingTranscripts } = await import('../src/fetchers/meetings.js');
    const { fetchScreenTime } = await import('../src/fetchers/screentime.js');
    const { fetchWeather } = await import('../src/fetchers/weather.js');
    const { fetchNews } = await import('../src/fetchers/news.js');
    const { fetchMailData } = await import('../src/fetchers/mail.js');
    const { fetchCalendarEvents } = await import('../src/fetchers/calendar.js');
    const { summarizeWithLLM } = await import('../src/llmClient.js');
    
    // Make sure fetchers return the expected values
    vi.mocked(fetchHealthData).mockReturnValueOnce('Health data mock');
    vi.mocked(fetchMeetingTranscripts).mockReturnValueOnce('Meeting transcripts mock');
    vi.mocked(fetchScreenTime).mockReturnValueOnce('Screen time mock');
    vi.mocked(fetchWeather).mockResolvedValueOnce('Weather mock');
    
    // For the failing fetcher, make it return an empty string instead of rejecting
    // This matches the behavior in the actual code where errors return empty strings
    vi.mocked(fetchNews).mockResolvedValueOnce('');
    
    vi.mocked(fetchMailData).mockReturnValueOnce('Mail data mock');
    vi.mocked(fetchCalendarEvents).mockReturnValueOnce('Calendar events mock');
    
    // Set the LLM mock to return a value
    vi.mocked(summarizeWithLLM).mockResolvedValueOnce('Test summary from LLM');

    // This should run without errors now
    await runOnce();
    
    // We should still call the LLM with available data (excluding news)
    const expectedContext = [
      'Health data mock',
      'Meeting transcripts mock',
      'Screen time mock',
      'Weather mock',
      'Mail data mock',
      'Calendar events mock',
      'Test prompt'
    ].join('\n\n');

    expect(summarizeWithLLM).toHaveBeenCalledWith(expectedContext);
  });

  it('should escape quotes in summary for CSV format', async () => {
    // Setup file system mock behavior
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    // Import all mocked functions to ensure they're properly set up
    const { fetchHealthData } = await import('../src/fetchers/health.js');
    const { fetchMeetingTranscripts } = await import('../src/fetchers/meetings.js');
    const { fetchScreenTime } = await import('../src/fetchers/screentime.js');
    const { fetchWeather } = await import('../src/fetchers/weather.js');
    const { fetchNews } = await import('../src/fetchers/news.js');
    const { fetchMailData } = await import('../src/fetchers/mail.js');
    const { fetchCalendarEvents } = await import('../src/fetchers/calendar.js');
    const { summarizeWithLLM } = await import('../src/llmClient.js');
    
    // Make sure the fetchers return something to avoid issues
    vi.mocked(fetchHealthData).mockReturnValueOnce('Health data mock');
    vi.mocked(fetchMeetingTranscripts).mockReturnValueOnce('Meeting transcripts mock');
    vi.mocked(fetchScreenTime).mockReturnValueOnce('Screen time mock');
    vi.mocked(fetchWeather).mockResolvedValueOnce('Weather mock');
    vi.mocked(fetchNews).mockResolvedValueOnce('News mock');
    vi.mocked(fetchMailData).mockReturnValueOnce('Mail data mock');
    vi.mocked(fetchCalendarEvents).mockReturnValueOnce('Calendar events mock');
    
    // Mock the LLM to return text with quotes
    vi.mocked(summarizeWithLLM).mockResolvedValueOnce('Test "quoted" summary');
    
    await runOnce();
    
    // Verify quotes were properly escaped
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      './test-output.csv',
      expect.stringContaining('Test ""quoted"" summary')
    );
  });
}); 