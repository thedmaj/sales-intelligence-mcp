#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools/index.js';
import { ApiClient } from './auth/apiClient.js';
import { logger } from './utils/logger.js';

// Environment validation
const requiredEnvVars = ['API_BASE_URL', 'API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('\n📖 Setup guide: https://github.com/yourorg/sales-intelligence-mcp#setup');
  process.exit(1);
}

// Configuration
const config = {
  baseUrl: process.env.API_BASE_URL!,
  apiKey: process.env.API_KEY!,
  timeout: parseInt(process.env.MCP_TIMEOUT || '30000'),
  maxResults: parseInt(process.env.MCP_MAX_RESULTS || '20'),
  cacheEnabled: process.env.MCP_CACHE_ENABLED !== 'false',
  logLevel: process.env.MCP_LOG_LEVEL || 'error'
};

const server = new Server(
  {
    name: 'sales-intelligence-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize API client
const apiClient = new ApiClient(config);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    logger.debug('Listing available MCP tools', { toolCount: Object.keys(tools).length });

    return {
      tools: Object.values(tools).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  } catch (error) {
    logger.error('Error listing tools', { error });
    throw error;
  }
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();

  try {
    logger.debug('Executing tool', { toolName: name, args });

    const tool = tools[name];
    if (!tool) {
      logger.error('Unknown tool requested', { toolName: name });
      throw new Error(`Unknown tool: ${name}`);
    }

    const result = await tool.handler(args, apiClient);
    const duration = Date.now() - startTime;

    logger.debug('Tool execution completed', {
      toolName: name,
      duration: `${duration}ms`,
      resultLength: result.length
    });

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Tool execution failed', {
      toolName: name,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : String(error)
    });

    throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  logger.info('Sales Intelligence MCP server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Sales Intelligence MCP server terminated');
  process.exit(0);
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);

logger.info('🚀 Sales Intelligence MCP server started', {
  version: '1.0.0',
  baseUrl: config.baseUrl,
  timeout: config.timeout,
  toolsAvailable: Object.keys(tools).length
});

// Health check endpoint (via stderr so it doesn't interfere with stdio transport)
console.error('✅ Sales Intelligence MCP server is ready for connections');