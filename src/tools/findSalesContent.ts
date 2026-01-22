import { z } from 'zod';
import { ApiClient } from '../auth/apiClient.js';
import { logger } from '../utils/logger.js';

export const findSalesContentTool = {
  name: 'find_sales_content',
  description: 'Search for playbooks, plays, and sales content using natural language queries. Supports filtering by solution, market segment, play type, and more.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language search query (e.g., "account verification banking", "fraud prevention demo", "competitive positioning against EWS")'
      },
      solution: {
        type: 'string',
        description: 'Filter by solution name (e.g., "Account Verification", "Fraud Prevention")'
      },
      segment: {
        type: 'string',
        description: 'Filter by market segment (e.g., "Enterprise", "SMB", "Banking")'
      },
      vertical: {
        type: 'string',
        description: 'Filter by industry vertical (e.g., "Banking", "Fintech", "Wealth Management")'
      },
      industry: {
        type: 'string',
        description: 'Filter by specific industry (e.g., "Community Banks", "Regional Banks")'
      },
      playType: {
        type: 'string',
        enum: [
          'DISCOVERY',
          'DEMO',
          'OBJECTION_HANDLING',
          'COMPETITIVE_POSITIONING',
          'VALUE_PROPOSITION',
          'TECHNICAL_DEEP_DIVE',
          'CONTENT_DELIVERY',
          'PROCESS'
        ],
        description: 'Filter by play type including Process workflows for POCs, onboarding, etc.'
      },
      competitor: {
        type: 'string',
        description: 'Filter by competitor mentions (e.g., "Early Warning System", "EWS", "Stripe")'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        default: 10,
        description: 'Maximum number of results to return (1-50, default: 10)'
      },
      includeRelationships: {
        type: 'boolean',
        default: false,
        description: 'Include related content and supporting materials'
      }
    },
    required: ['query'],
    additionalProperties: false
  },

  async handler(args: any, apiClient: ApiClient): Promise<string> {
    try {
      // Validate input
      const input = z.object({
        query: z.string().min(1, 'Query cannot be empty'),
        solution: z.string().optional(),
        segment: z.string().optional(),
        vertical: z.string().optional(),
        industry: z.string().optional(),
        playType: z.enum([
          'DISCOVERY',
          'DEMO',
          'OBJECTION_HANDLING',
          'COMPETITIVE_POSITIONING',
          'VALUE_PROPOSITION',
          'TECHNICAL_DEEP_DIVE',
          'CONTENT_DELIVERY',
          'PROCESS'
        ]).optional(),
        competitor: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
        includeRelationships: z.boolean().default(false)
      }).parse(args);

      logger.debug('Processing sales content search', {
        query: input.query,
        filters: {
          solution: input.solution,
          segment: input.segment,
          playType: input.playType
        }
      });

      // Make API request
      const response = await apiClient.request<{
        content: Array<{ type: string; text: string }>;
      }>('/find_sales_content', input);

      // Parse the JSON response from the API
      const apiData = JSON.parse(response.content[0].text);

      if (!apiData.success) {
        throw new Error(apiData.error || 'Search failed');
      }

      // Format results for user-friendly display
      const { data } = apiData;
      const plays = data.results?.plays || [];
      const playbooks = data.results?.playbooks || [];

      if (plays.length === 0 && playbooks.length === 0) {
        return formatNoResultsMessage(input);
      }

      return formatSearchResults(data, input);

    } catch (error) {
      logger.error('Sales content search failed', {
        error: error instanceof Error ? error.message : String(error),
        args
      });

      if (error instanceof z.ZodError) {
        return formatValidationError(error);
      }

      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

function formatSearchResults(data: any, input: any): string {
  const plays = data.results?.plays || [];
  const playbooks = data.results?.playbooks || [];
  const metadata = data.metadata || {};

  let result = `# 🎯 Sales Content Search Results\n\n`;
  result += `**Query:** "${input.query}"\n`;
  result += `**Results:** ${plays.length} plays found`;

  if (metadata.queryTime) {
    result += ` (${metadata.queryTime}ms)`;
  }

  if (metadata.cacheHit) {
    result += ` 🚀 *cached*`;
  }

  result += `\n\n`;

  // Add confidence and entity resolution info if available
  if (data.confidence) {
    result += `**Confidence:** ${Math.round(data.confidence * 100)}%\n`;
  }

  if (metadata.entityResolution?.resolved) {
    const resolved = metadata.entityResolution.resolved;
    const resolvedEntries = Object.entries(resolved).filter(([_, values]: [string, any]) => values.length > 0);

    if (resolvedEntries.length > 0) {
      result += `**Identified:** `;
      result += resolvedEntries.map(([type, values]: [string, any]) =>
        `${type}: ${values.join(', ')}`
      ).join(', ');
      result += `\n`;
    }
  }

  result += `\n---\n\n`;

  // Format plays
  plays.forEach((play: any, index: number) => {
    result += `## ${index + 1}. ${play.name}\n\n`;

    if (play.playbook?.name) {
      result += `**📚 Playbook:** ${play.playbook.name}\n`;
    }

    if (play.solution?.name) {
      result += `**🛠️ Solution:** ${play.solution.name}\n`;
    }

    if (play.genericPlayType) {
      const playTypeLabel = formatPlayType(play.genericPlayType);
      result += `**🎲 Type:** ${playTypeLabel}\n`;
    }

    if (play.sequenceOrder) {
      result += `**📋 Sequence:** ${play.sequenceOrder}\n`;
    }

    // Special formatting for PROCESS play types
    if (play.genericPlayType === 'PROCESS' && play.description) {
      const processInfo = extractProcessInfo(play.description);
      if (processInfo.processType) {
        result += `**⚙️ Process Type:** ${processInfo.processType}\n`;
      }
      if (processInfo.steps.length > 0) {
        result += `**📝 Key Steps:** ${processInfo.steps.slice(0, 3).join(', ')}${processInfo.steps.length > 3 ? '...' : ''}\n`;
      }
      if (processInfo.roles.length > 0) {
        result += `**👥 Roles:** ${processInfo.roles.join(', ')}\n`;
      }
    }

    if (play.description) {
      result += `\n**Description:**\n${play.description}\n`;
    }

    result += `\n---\n\n`;
  });

  // Add summary insights
  if (plays.length > 0) {
    result += `## 💡 Quick Insights\n\n`;

    const playTypes = [...new Set(plays.map((p: any) => p.genericPlayType).filter(Boolean))];
    if (playTypes.length > 0) {
      result += `**Play Types Found:** ${playTypes.map(formatPlayType).join(', ')}\n`;
    }

    const solutions = [...new Set(plays.map((p: any) => p.solution?.name).filter(Boolean))];
    if (solutions.length > 0) {
      result += `**Solutions Covered:** ${solutions.join(', ')}\n`;
    }

    const segments = [...new Set(plays.map((p: any) => p.playbook?.segment?.name).filter(Boolean))];
    if (segments.length > 0) {
      result += `**Market Segments:** ${segments.join(', ')}\n`;
    }
  }

  // Add filters applied
  const appliedFilters = [];
  if (input.solution) appliedFilters.push(`Solution: ${input.solution}`);
  if (input.segment) appliedFilters.push(`Segment: ${input.segment}`);
  if (input.playType) appliedFilters.push(`Type: ${formatPlayType(input.playType)}`);
  if (input.competitor) appliedFilters.push(`Competitor: ${input.competitor}`);

  if (appliedFilters.length > 0) {
    result += `\n**🔍 Filters Applied:** ${appliedFilters.join(', ')}\n`;
  }

  return result;
}

function formatNoResultsMessage(input: any): string {
  let result = `# 🔍 No Sales Content Found\n\n`;
  result += `**Query:** "${input.query}"\n\n`;
  result += `No matching plays or playbooks were found. Try:\n\n`;
  result += `- **Broadening your search:** Use more general terms\n`;
  result += `- **Different keywords:** Try synonyms or related terms\n`;
  result += `- **Removing filters:** Check if solution/segment filters are too restrictive\n`;
  result += `- **Checking spelling:** Verify entity names are correct\n\n`;

  if (input.solution || input.segment || input.playType) {
    result += `**Active Filters:**\n`;
    if (input.solution) result += `- Solution: ${input.solution}\n`;
    if (input.segment) result += `- Segment: ${input.segment}\n`;
    if (input.playType) result += `- Play Type: ${formatPlayType(input.playType)}\n`;
    result += `\nTry removing some filters to get broader results.\n`;
  }

  return result;
}

function formatValidationError(error: z.ZodError): string {
  const issues = error.errors.map(e => `- ${e.path.join('.')}: ${e.message}`).join('\n');
  return `❌ **Invalid Input**\n\n${issues}\n\nPlease check your query parameters and try again.`;
}

function formatPlayType(playType: string): string {
  const typeLabels: Record<string, string> = {
    'DISCOVERY': 'Discovery',
    'DEMO': 'Demo',
    'OBJECTION_HANDLING': 'Objection Handling',
    'COMPETITIVE_POSITIONING': 'Competitive Positioning',
    'VALUE_PROPOSITION': 'Value Proposition',
    'TECHNICAL_DEEP_DIVE': 'Technical Deep Dive',
    'CONTENT_DELIVERY': 'Content Delivery',
    'PROCESS': 'Process'
  };

  return typeLabels[playType] || playType;
}

function extractProcessInfo(description: string): {
  processType: string;
  steps: string[];
  roles: string[];
} {
  const processType = inferProcessType(description);
  const steps = extractProcessSteps(description);
  const roles = extractRoleAssignments(description);

  return { processType, steps, roles };
}

function inferProcessType(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes('poc')) return 'POC Validation';
  if (desc.includes('onboarding')) return 'Client Onboarding';
  if (desc.includes('implementation')) return 'Implementation';
  if (desc.includes('retro')) return 'Retrospective Analysis';
  if (desc.includes('evaluation')) return 'Evaluation Process';
  return 'General Process';
}

function extractProcessSteps(description: string): string[] {
  const stepRegex = /\d+\.\s*([^\n]+)/g;
  const steps = Array.from(description.matchAll(stepRegex), m => m[1]);
  return steps.slice(0, 5); // Return up to 5 steps
}

function extractRoleAssignments(description: string): string[] {
  const roleRegex = /(?:owner|responsible|assigned):\s*([^\n,]+)/gi;
  const roles = Array.from(description.matchAll(roleRegex), m => m[1].trim());
  return roles;
}