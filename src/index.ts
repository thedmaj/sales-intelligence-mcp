#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger.js';
import { tools } from './tools/index.js';
import type { MCPTool } from './tools/index.js';

const app = express();
const PORT = process.env.MCP_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`${req.method} ${req.path} - ${req.ip}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const uptimeFormatted = `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`;

  res.json({
    status: 'healthy',
    version: '1.0.0',
    uptime: uptimeFormatted,
    timestamp: new Date().toISOString(),
    tools: Object.keys(tools).length
  });
});

// MCP tool endpoints
app.post('/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const tool = tools[toolName] as MCPTool;

  if (!tool) {
    return res.status(404).json({
      error: `Tool '${toolName}' not found`,
      availableTools: Object.keys(tools)
    });
  }

  try {
    const result = await tool.handler(req.body, null); // No API client needed for direct mode

    res.json({
      tool: toolName,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Tool ${toolName} error:`, message);

    res.status(400).json({
      error: `Tool execution failed: ${message}`,
      tool: toolName,
      timestamp: new Date().toISOString()
    });
  }
});

// List available tools
app.get('/tools', (req, res) => {
  const toolList = Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }));

  res.json({
    tools: toolList,
    count: toolList.length
  });
});

// Root endpoint with API information
app.get('/', (req, res) => {
  res.json({
    name: 'Sales Intelligence MCP Server',
    version: '1.0.0',
    description: 'MCP server for sales intelligence, competitive analysis, and playbook discovery',
    endpoints: {
      health: '/health',
      tools: '/tools',
      execute: '/tools/:toolName'
    },
    documentation: 'https://github.com/thedmaj/sales-intelligence-mcp#readme'
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);

  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Sales Intelligence MCP Server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🛠️  Available tools: http://localhost:${PORT}/tools`);
  logger.info(`📖 Documentation: https://github.com/thedmaj/sales-intelligence-mcp#readme`);

  // Log configuration
  logger.info('Configuration:', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.MCP_LOG_LEVEL || 'info',
    toolsCount: Object.keys(tools).length
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;