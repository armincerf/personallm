import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the config module
vi.mock('../src/config.js', () => ({
  config: {
    geminiApiUrl: 'https://api.example.com/gemini',
    geminiApiKey: 'test-api-key'
  }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('LLM Client tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call the LLM API with correct parameters', async () => {
    // Mock successful response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ summary: 'Test summary from LLM' })
    });

    const { summarizeWithLLM } = await import('../src/llmClient.js');
    const result = await summarizeWithLLM('Test context');

    // Verify API was called with correct URL and parameters
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/gemini',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key'
        }),
        body: expect.stringContaining('Test context')
      })
    );

    // Verify result
    expect(result).toBe('Test summary from LLM');
  });

  it('should handle API errors gracefully', async () => {
    // Mock failed response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const { summarizeWithLLM } = await import('../src/llmClient.js');
    const result = await summarizeWithLLM('Test context');

    // Should return error message
    expect(result).toBe('(LLM summarization error)');
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle network errors gracefully', async () => {
    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { summarizeWithLLM } = await import('../src/llmClient.js');
    const result = await summarizeWithLLM('Test context');

    // Should return error message
    expect(result).toBe('(LLM summarization error)');
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle API error responses', async () => {
    // Mock response with error message
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        error: { 
          message: 'Model overloaded' 
        }
      })
    });

    const { summarizeWithLLM } = await import('../src/llmClient.js');
    const result = await summarizeWithLLM('Test context');

    // Should return error message
    expect(result).toBe('(LLM summarization error)');
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle different response formats', async () => {
    // Mock response with different structure (like the choices array used by some LLM APIs)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        choices: [
          { 
            message: { 
              content: 'Alternative format summary' 
            }
          }
        ]
      })
    });

    const { summarizeWithLLM } = await import('../src/llmClient.js');
    const result = await summarizeWithLLM('Test context');

    // Should extract the summary from the choices array
    expect(result).toBe('Alternative format summary');
  });
}); 