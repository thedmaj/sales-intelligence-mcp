#!/usr/bin/env node

import * as readline from 'readline';
import { tools } from './tools/index.js';
import { logger } from './utils/logger.js';
import { ApiClient } from './auth/apiClient.js';

interface MCPMessage {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: number | string;
}

interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  id?: number | string;
}

class SalesIntelligenceMCPServer {
  private rl: readline.Interface;
  private apiClient: ApiClient | null = null;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.rl.on('line', (line) => {
      try {
        const message: MCPMessage = JSON.parse(line.trim());
        this.handleMessage(message);
      } catch (error) {
        this.sendError(null, -32700, 'Parse error');
      }
    });

    this.rl.on('close', () => {
      process.exit(0);
    });

    process.on('SIGINT', () => {
      this.rl.close();
    });

    process.on('SIGTERM', () => {
      this.rl.close();
    });
  }

  private async handleMessage(message: MCPMessage) {
    try {
      switch (message.method) {
        case 'initialize':
          await this.handleInitialize(message);
          break;
        case 'tools/list':
          await this.handleListTools(message);
          break;
        case 'tools/call':
          await this.handleToolCall(message);
          break;
        default:
          this.sendError(message.id, -32601, `Method not found: ${message.method}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendError(message.id, -32603, `Internal error: ${errorMessage}`);
    }
  }

  private async handleInitialize(message: MCPMessage) {
    const response: MCPResponse = {
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'sales-intelligence-mcp',
          version: '1.0.0'
        }
      },
      id: message.id
    };

    this.sendResponse(response);
  }

  private async handleListTools(message: MCPMessage) {
    const toolsList = Object.values(tools).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));

    const response: MCPResponse = {
      jsonrpc: '2.0',
      result: {
        tools: toolsList
      },
      id: message.id
    };

    this.sendResponse(response);
  }

  private async handleToolCall(message: MCPMessage) {
    const { name, arguments: args } = message.params;

    const tool = tools[name];
    if (!tool) {
      this.sendError(message.id, -32602, `Tool "${name}" not found. Available tools: ${Object.keys(tools).join(', ')}`);
      return;
    }

    try {
      logger.info(`Executing tool: ${name}`, { args });
      const result = await tool.handler(args, this.apiClient);

      const response: MCPResponse = {
        jsonrpc: '2.0',
        result: {
          content: [
            {
              type: 'text',
              text: result
            }
          ]
        },
        id: message.id
      };

      this.sendResponse(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Tool ${name} execution failed:`, { error: errorMessage, args });
      this.sendError(message.id, -32603, `Tool execution failed: ${errorMessage}`);
    }
  }

  private sendResponse(response: MCPResponse) {
    console.log(JSON.stringify(response));
  }

  private sendError(id: number | string | null | undefined, code: number, message: string) {
    const response: MCPResponse = {
      jsonrpc: '2.0',
      error: {
        code,
        message
      },
      id: id ?? undefined
    };

    console.log(JSON.stringify(response));
  }

  run() {
    // Initialize API client if environment variables are provided
    const apiBaseUrl = process.env.API_BASE_URL;
    const apiKey = process.env.API_KEY;

    if (apiBaseUrl && apiKey) {
      this.apiClient = new ApiClient({
        baseUrl: apiBaseUrl,
        apiKey: apiKey,
        timeout: parseInt(process.env.MCP_TIMEOUT || '10000')
      });
      logger.info('API client configured for real data', { baseUrl: apiBaseUrl });
    } else {
      logger.info('No API configuration found, using demo data');
    }

    logger.info('Sales Intelligence MCP Server starting on stdio transport');
    logger.info(`Available tools: ${Object.keys(tools).join(', ')}`);

    // Send server ready notification to stderr so it doesn't interfere with JSON-RPC
    process.stderr.write(`Sales Intelligence MCP Server ready with ${Object.keys(tools).length} tools\n`);
    if (this.apiClient) {
      process.stderr.write(`Connected to API: ${apiBaseUrl}\n`);
    } else {
      process.stderr.write(`Running in demo mode\n`);
    }
  }
}

// Start server
const server = new SalesIntelligenceMCPServer();
server.run();