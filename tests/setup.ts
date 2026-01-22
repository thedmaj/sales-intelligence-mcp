// Jest setup for MCP server tests

// Mock environment variables
process.env.API_BASE_URL = 'https://test.example.com';
process.env.API_KEY = 'test_api_key_12345';
process.env.MCP_TIMEOUT = '5000';
process.env.MCP_LOG_LEVEL = 'error';

// Global test utilities
global.console = {
  ...console,
  // Suppress error logs in tests unless explicitly needed
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};

// Setup test timeout
jest.setTimeout(10000);