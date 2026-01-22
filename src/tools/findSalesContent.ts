import { z } from 'zod';
import { distance } from 'fastest-levenshtein';
import { searchPlays, demoPlays } from '../data/demoData.js';
import type { MCPTool } from './index.js';

const inputSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Natural language search query for sales content"
    },
    solution: {
      type: "string",
      description: "Filter by solution name (e.g., Account Verification, Fraud Prevention, Payment Processing)"
    },
    segment: {
      type: "string",
      description: "Filter by market segment (Enterprise, Mid-Market, SMB)"
    },
    playType: {
      type: "string",
      description: "Filter by play type",
      enum: ["DISCOVERY", "DEMO", "VALUE_PROPOSITION", "COMPETITIVE_POSITIONING", "TECHNICAL_DEEP_DIVE", "OBJECTION_HANDLING", "CONTENT_DELIVERY", "PROCESS"]
    },
    limit: {
      type: "number",
      description: "Maximum number of results to return",
      default: 10,
      minimum: 1,
      maximum: 50
    },
    includeRelationships: {
      type: "boolean",
      description: "Include related content and cross-references",
      default: false
    }
  },
  required: ["query"]
} as const;

const querySchema = z.object({
  query: z.string().min(1, "Query cannot be empty"),
  solution: z.string().optional(),
  segment: z.string().optional(),
  playType: z.enum(["DISCOVERY", "DEMO", "VALUE_PROPOSITION", "COMPETITIVE_POSITIONING", "TECHNICAL_DEEP_DIVE", "OBJECTION_HANDLING", "CONTENT_DELIVERY", "PROCESS"]).optional(),
  limit: z.number().min(1).max(50).default(10),
  includeRelationships: z.boolean().default(false)
});

async function handler(args: any, apiClient: any): Promise<string> {
  try {
    // Validate input
    const input = querySchema.parse(args);

    // Use real API if available, otherwise fall back to demo data
    if (apiClient) {
      try {
        const apiResponse = await apiClient.request('/api/mcp/find_sales_content', input);

        // Parse the API response which should contain content array
        if (apiResponse.content && apiResponse.content.length > 0) {
          const responseText = apiResponse.content[0].text;
          // If response is JSON string, parse it, otherwise return as is
          try {
            const parsed = JSON.parse(responseText);
            return formatApiResponse(parsed, input);
          } catch {
            return responseText; // Already formatted response
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `# API Connection Error\n\nFailed to connect to sales intelligence API: ${message}\n\nFalling back to demo data...\n\n` +
               formatDemoResponse(input);
      }
    }

    // Fallback to demo data
    return formatDemoResponse(input);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatValidationError(error);
    }
    throw error;
  }
}

function formatDemoResponse(input: any): string {
  // Search demo data
  const results = searchPlays(input.query, {
    solution: input.solution,
    segment: input.segment,
    playType: input.playType
  }).slice(0, input.limit);

  if (results.length === 0) {
    return formatNoResultsResponse(input.query, input);
  }

  return formatSuccessResponse(results, input);
}

function formatApiResponse(data: any, input: any): string {
  if (data.success && data.data) {
    // Format API response similar to demo format
    const results = data.data.results || {};

    let response = `# Sales Content Search Results\n\n## Summary\n${data.data.answer}\n\n`;

    if (results.plays && results.plays.length > 0) {
      response += `## Results\n\n`;
      results.plays.forEach((play: any, index: number) => {
        response += `### ${index + 1}. ${play.name}\n`;
        response += `- **Type**: ${formatPlayType(play.genericPlayType)}\n`;
        response += `- **Playbook**: ${play.playbook?.name || 'Unknown'}\n`;
        response += `- **Solution**: ${play.solution?.name || 'Unknown'}\n`;
        if (play.segment) {
          response += `- **Segment**: ${play.segment.name}\n`;
        }
        response += `- **Description**: ${play.description}\n`;
        response += `- **Use When**: ${getUseWhenAdvice(play.genericPlayType)}\n\n`;
      });
    }

    return response;
  }

  return `# API Response Error\n\nReceived unexpected response format from API.\n\nFalling back to demo data...`;
}

function formatSuccessResponse(results: any[], input: any): string {
  const summary = `Found ${results.length} ${results.length === 1 ? 'play' : 'plays'} matching your query${
    input.solution ? ` for ${input.solution}` : ''
  }${input.segment ? ` in ${input.segment} segment` : ''}.`;

  let response = `# Sales Content Search Results\n\n## Summary\n${summary}\n\n## Results\n\n`;

  results.forEach((play, index) => {
    response += `### ${index + 1}. ${play.name}\n`;
    response += `- **Type**: ${formatPlayType(play.genericPlayType)}\n`;
    response += `- **Playbook**: ${play.playbook.name}\n`;
    response += `- **Solution**: ${play.solution.name}\n`;
    if (play.segment) {
      response += `- **Segment**: ${play.segment.name}\n`;
    }
    response += `- **Description**: ${play.description}\n`;
    response += `- **Use When**: ${getUseWhenAdvice(play.genericPlayType)}\n\n`;
  });

  // Add insights
  response += `## Insights\n`;
  const playTypes = [...new Set(results.map(p => p.genericPlayType))];
  response += `- Coverage across ${playTypes.length} play types: ${playTypes.map(formatPlayType).join(', ')}\n`;

  const solutions = [...new Set(results.map(p => p.solution.name))];
  if (solutions.length > 1) {
    response += `- Results span multiple solutions: ${solutions.join(', ')}\n`;
  }

  // Add recommendations
  response += `\n## Recommendations\n`;
  if (playTypes.includes('DISCOVERY')) {
    response += `- Start with discovery plays to understand client needs\n`;
  }
  if (playTypes.includes('COMPETITIVE_POSITIONING')) {
    response += `- Review competitive positioning plays for differentiation\n`;
  }
  if (playTypes.includes('DEMO')) {
    response += `- Prepare demo plays for technical evaluation phase\n`;
  }

  response += `- Consider reviewing related content in the same playbook\n`;
  response += `- Check for updated competitive intelligence if competitors are mentioned\n`;

  return response;
}

function formatNoResultsResponse(query: string, input: any): string {
  let response = `# No Sales Content Found\n\n`;
  response += `No content found matching "${query}"`;

  if (input.solution || input.segment || input.playType) {
    response += ` with the specified filters`;
  }
  response += `.\n\n`;

  response += `## Suggestions\n\n`;
  response += `**Try:**\n`;
  response += `- Broader search terms (e.g., "fraud" instead of "real-time fraud detection")\n`;
  response += `- Different solution names (Account Verification, Fraud Prevention, Payment Processing)\n`;
  response += `- Removing filters to see all available content\n`;
  response += `- Different play types (Discovery, Demo, Value Proposition, etc.)\n\n`;

  response += `**Available Solutions:**\n`;
  const availableSolutions = [...new Set(demoPlays.map(p => p.solution.name))];
  availableSolutions.forEach(solution => {
    response += `- ${solution}\n`;
  });

  response += `\n**Available Play Types:**\n`;
  const availableTypes = [...new Set(demoPlays.map(p => p.genericPlayType))];
  availableTypes.forEach(type => {
    response += `- ${formatPlayType(type)}\n`;
  });

  return response;
}

function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue =>
    `- ${issue.path.join('.')}: ${issue.message}`
  ).join('\n');

  return `# Invalid Input\n\nPlease check the following:\n\n${issues}\n\n## Required Parameters\n- **query**: Your search query (required)\n\n## Optional Parameters\n- **solution**: Solution name filter\n- **segment**: Market segment filter\n- **playType**: Type of play to find\n- **limit**: Number of results (1-50, default: 10)`;
}

function formatPlayType(playType: string): string {
  const typeMap: Record<string, string> = {
    'DISCOVERY': 'Discovery',
    'DEMO': 'Demo',
    'VALUE_PROPOSITION': 'Value Proposition',
    'COMPETITIVE_POSITIONING': 'Competitive Positioning',
    'TECHNICAL_DEEP_DIVE': 'Technical Deep Dive',
    'OBJECTION_HANDLING': 'Objection Handling',
    'CONTENT_DELIVERY': 'Content Delivery',
    'PROCESS': 'Process/Workflow'
  };
  return typeMap[playType] || playType;
}

function getUseWhenAdvice(playType: string): string {
  const adviceMap: Record<string, string> = {
    'DISCOVERY': 'Initial client meetings, needs assessment, and qualification',
    'DEMO': 'Technical evaluations, proof-of-concept presentations',
    'VALUE_PROPOSITION': 'Budget discussions, ROI conversations, executive presentations',
    'COMPETITIVE_POSITIONING': 'When competitors are mentioned or being evaluated',
    'TECHNICAL_DEEP_DIVE': 'Technical stakeholder meetings, integration planning',
    'OBJECTION_HANDLING': 'Addressing client concerns, risk discussions',
    'CONTENT_DELIVERY': 'Educational content, thought leadership sharing',
    'PROCESS': 'Implementation planning, POC setup, workflow discussions'
  };
  return adviceMap[playType] || 'Various sales situations depending on context';
}

export const findSalesContentTool: MCPTool = {
  name: "find_sales_content",
  description: "Search for playbooks, plays, and sales content using natural language queries. Find relevant content for specific solutions, market segments, and play types.",
  inputSchema,
  handler
};