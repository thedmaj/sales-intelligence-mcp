import { findSalesContentTool } from './findSalesContent.js';
import { getCompetitiveIntelTool } from './getCompetitiveIntel.js';
import { findProcessWorkflowsTool } from './findProcessWorkflows.js';
import { discoverPlaybooksTool } from './discoverPlaybooks.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any, apiClient: any) => Promise<string>;
}

/**
 * All available MCP tools for sales intelligence
 */
export const tools: Record<string, MCPTool> = {
  [findSalesContentTool.name]: findSalesContentTool,
  [getCompetitiveIntelTool.name]: getCompetitiveIntelTool,
  [findProcessWorkflowsTool.name]: findProcessWorkflowsTool,
  [discoverPlaybooksTool.name]: discoverPlaybooksTool,
};

/**
 * Get tool by name
 */
export function getTool(name: string): MCPTool | undefined {
  return tools[name];
}

/**
 * Get all tool names
 */
export function getToolNames(): string[] {
  return Object.keys(tools);
}

/**
 * Get tool count
 */
export function getToolCount(): number {
  return Object.keys(tools).length;
}

export default tools;