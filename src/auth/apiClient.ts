import fetch, { Response } from 'node-fetch';
import { logger } from '../utils/logger.js';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  maxResults?: number;
  cacheEnabled?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    queryTime: number;
    resultCount: number;
    cacheHit: boolean;
  };
}

export class ApiClient {
  constructor(private config: ApiClientConfig) {}

  /**
   * Make authenticated request to MCP API endpoint
   */
  async request<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.config.baseUrl}/api/mcp${endpoint}`;
    const startTime = Date.now();

    logger.debug('API request starting', { url, endpoint });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'sales-intelligence-mcp/1.0.0',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      logger.debug('API response received', {
        url,
        status: response.status,
        duration: `${duration}ms`
      });

      if (!response.ok) {
        await this.handleErrorResponse(response, endpoint);
      }

      const result = await response.json() as T;
      return result;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        logger.error('API request timeout', {
          url,
          timeout: this.config.timeout
        });
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }

      logger.error('API request failed', {
        url,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Handle error responses with user-friendly messages
   */
  private async handleErrorResponse(response: Response, endpoint: string): Promise<never> {
    let errorMessage = `API request failed (${response.status})`;

    try {
      const errorBody = await response.text();
      const errorData = JSON.parse(errorBody);

      if (errorData.content?.[0]?.text) {
        errorMessage = errorData.content[0].text;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use default error message if we can't parse response
    }

    // Enhance error messages based on status code
    switch (response.status) {
      case 401:
        throw new Error(`Authentication failed. Please check your API key. ${errorMessage}`);

      case 403:
        throw new Error(`Access denied. Your API key may not have sufficient permissions. ${errorMessage}`);

      case 429:
        const retryAfter = response.headers.get('retry-after') || '60';
        throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds before trying again. ${errorMessage}`);

      case 404:
        throw new Error(`API endpoint not found. The server may not support MCP queries yet. ${errorMessage}`);

      case 500:
        throw new Error(`Server error. Please try again later or contact support. ${errorMessage}`);

      case 502:
      case 503:
      case 504:
        throw new Error(`Service temporarily unavailable. Please try again in a few moments. ${errorMessage}`);

      default:
        throw new Error(errorMessage);
    }
  }

  /**
   * Test API connectivity and authentication
   */
  async testConnection(): Promise<{
    connected: boolean;
    error?: string;
    serverInfo?: any;
  }> {
    try {
      logger.debug('Testing API connection');

      // Try a simple query to test connectivity
      await this.request('/find_sales_content', {
        query: 'test connectivity',
        limit: 1
      });

      logger.debug('API connection test successful');

      return {
        connected: true,
        serverInfo: {
          baseUrl: this.config.baseUrl,
          version: '1.0.0'
        }
      };

    } catch (error) {
      logger.error('API connection test failed', { error });

      return {
        connected: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get API usage statistics (if available)
   */
  async getUsageStats(): Promise<any> {
    try {
      return await this.request('/usage_stats', {});
    } catch (error) {
      logger.debug('Usage stats not available', { error });
      return null;
    }
  }
}

export default ApiClient;