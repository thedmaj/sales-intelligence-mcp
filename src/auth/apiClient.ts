import { logger } from '../utils/logger.js';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

export class ApiClient {
  constructor(private config: ApiClientConfig) {}

  async request<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    logger.debug('API request starting', { url, endpoint });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey.startsWith('Bearer ') || this.config.apiKey.startsWith('MCP-Key ')
            ? this.config.apiKey
            : `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'sales-intelligence-mcp/1.0.0',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your API key');
        }
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || '60';
          throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds`);
        }
        throw new Error(`API request failed (${response.status})`);
      }

      // Check Content-Type header
      const contentType = response.headers.get('content-type') || '';
      
      // Read response as text first (can only read body once)
      const text = await response.text();
      
      // Check if response is HTML (common error case)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        const preview = text.substring(0, 200);
        logger.error('Received HTML response instead of JSON', {
          url,
          contentType,
          status: response.status,
          preview
        });
        throw new Error(`API returned HTML instead of JSON. This usually means: 1) The endpoint doesn't exist, 2) Authentication failed, or 3) Server is redirecting to frontend. URL: ${url}`);
      }
      
      // Check Content-Type if not HTML
      if (!contentType.includes('application/json')) {
        const preview = text.substring(0, 200);
        logger.error('Received non-JSON response', {
          url,
          contentType,
          status: response.status,
          preview
        });
        throw new Error(`API returned ${contentType} instead of JSON. Response preview: ${preview}`);
      }
      
      // Try to parse as JSON
      try {
        const result = JSON.parse(text);
        return result as T;
      } catch (parseError: any) {
        const preview = text.substring(0, 200);
        logger.error('Failed to parse JSON response', {
          url,
          contentType,
          status: response.status,
          error: parseError.message,
          preview
        });
        throw new Error(`Failed to parse JSON response: ${parseError.message}. Response preview: ${preview}`);
      }

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }

      throw error;
    }
  }

  async testConnection(): Promise<{ connected: boolean; error?: string; serverInfo?: any }> {
    try {
      const result = await this.request('/health', {});
      return {
        connected: true,
        serverInfo: {
          baseUrl: this.config.baseUrl,
          version: '1.0.0'
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        connected: false,
        error: message
      };
    }
  }
}