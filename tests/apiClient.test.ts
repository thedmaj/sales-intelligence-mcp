import { ApiClient } from '../src/auth/apiClient';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ApiClient', () => {
  let apiClient: ApiClient;
  const mockConfig = {
    baseUrl: 'https://test.example.com',
    apiKey: 'test_key_123',
    timeout: 5000
  };

  beforeEach(() => {
    apiClient = new ApiClient(mockConfig);
    jest.clearAllMocks();
  });

  describe('request', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true, data: 'test' })
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiClient.request('/test', { query: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.example.com/api/mcp/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_key_123',
            'Content-Type': 'application/json',
            'User-Agent': 'sales-intelligence-mcp/1.0.0'
          }),
          body: JSON.stringify({ query: 'test' })
        })
      );

      expect(result).toEqual({ success: true, data: 'test' });
    });

    it('should handle 401 authentication error', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('{"error": "Invalid API key"}')
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiClient.request('/test', {}))
        .rejects
        .toThrow('Authentication failed. Please check your API key');
    });

    it('should handle 429 rate limit error', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        headers: {
          get: jest.fn().mockReturnValue('60')
        },
        text: jest.fn().mockResolvedValue('{"error": "Rate limited"}')
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiClient.request('/test', {}))
        .rejects
        .toThrow('Rate limit exceeded. Please wait 60 seconds');
    });

    it('should handle timeout error', async () => {
      // Mock AbortController
      const mockAbort = jest.fn();
      global.AbortController = jest.fn().mockImplementation(() => ({
        abort: mockAbort,
        signal: {}
      }));

      mockFetch.mockImplementation(() => {
        const error = new Error('Request timeout');
        error.name = 'AbortError';
        throw error;
      });

      await expect(apiClient.request('/test', {}))
        .rejects
        .toThrow('Request timeout after 5000ms');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(apiClient.request('/test', {}))
        .rejects
        .toThrow('Network error');
    });

    it('should handle malformed response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Invalid JSON')
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiClient.request('/test', {}))
        .rejects
        .toThrow('API request failed (500)');
    });
  });

  describe('testConnection', () => {
    it('should return connected true for successful test', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true })
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiClient.testConnection();

      expect(result).toEqual({
        connected: true,
        serverInfo: {
          baseUrl: 'https://test.example.com',
          version: '1.0.0'
        }
      });
    });

    it('should return connected false for failed test', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const result = await apiClient.testConnection();

      expect(result).toEqual({
        connected: false,
        error: 'Connection failed'
      });
    });
  });

  describe('getUsageStats', () => {
    it('should return usage stats when available', async () => {
      const mockStats = { requests: 100, quota: 1000 };
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockStats)
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiClient.getUsageStats();

      expect(result).toEqual(mockStats);
    });

    it('should return null when stats not available', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'));

      const result = await apiClient.getUsageStats();

      expect(result).toBeNull();
    });
  });
});