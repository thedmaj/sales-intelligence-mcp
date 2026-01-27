import { z } from 'zod';
import { logger } from '../utils/logger.js';
import type { MCPTool } from './index.js';

const inputSchema = {
  type: "object",
  properties: {
    solution: {
      type: "string",
      description: "Filter by associated solution name (e.g., Account Verification, Fraud Prevention)"
    },
    playType: {
      type: "string",
      description: "Filter by play type (discovery, demo, technical, business, closing)"
    },
    status: {
      type: "string",
      description: "Filter by status (active, inactive, draft)"
    },
    createdBy: {
      type: "string",
      description: "Filter by creator name or email"
    },
    search: {
      type: "string",
      description: "Search term to match against play names and descriptions"
    },
    includeDetails: {
      type: "boolean",
      description: "Include detailed information about each play",
      default: true
    },
    limit: {
      type: "number",
      description: "Maximum number of plays to return",
      default: 20,
      minimum: 1,
      maximum: 100
    }
  }
} as const;

const standalonePlaySchema = z.object({
  solution: z.string().optional(),
  playType: z.string().optional(),
  status: z.string().optional(),
  createdBy: z.string().optional(),
  search: z.string().optional(),
  includeDetails: z.boolean().default(true),
  limit: z.number().min(1).max(100).default(20)
});

async function handler(args: any, apiClient: any): Promise<string> {
  try {
    const input = standalonePlaySchema.parse(args);

    // Use real API if available
    if (apiClient) {
      try {
        const queryParams = new URLSearchParams({
          limit: input.limit.toString(),
          sortBy: 'lastModifiedAt',
          sortOrder: 'desc'
        });

        if (input.search) queryParams.set('search', input.search);
        if (input.playType) queryParams.set('genericPlayType', input.playType);
        if (input.status) queryParams.set('status', input.status);

        const apiResponse = await apiClient.request(`/standalone-plays?${queryParams}`);

        if (apiResponse.content && apiResponse.content.length > 0) {
          const responseText = apiResponse.content[0].text;
          try {
            const parsed = JSON.parse(responseText);
            return formatApiStandalonePlayResponse(parsed, input);
          } catch {
            return responseText; // Already formatted response
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const statusCode = (error as any).status || 'Unknown';
        const url = `${apiClient.config?.baseUrl || 'unknown'}/standalone-plays`;

        logger.error(`API request failed for standalone plays:`, {
          error: message,
          url,
          status: statusCode,
          input
        });

        return `# API Connection Error\n\nFailed to connect to sales intelligence API:\n- **URL**: ${url}\n- **Error**: ${message}\n- **Status**: ${statusCode}\n\nPlease check your API connection and try again.\n\n` +
               formatNoApiResponse(input);
      }
    }

    // No API available
    return formatNoApiResponse(input);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatValidationError(error);
    }
    throw error;
  }
}

function formatApiStandalonePlayResponse(data: any, input: any): string {
  if (!data.plays || !Array.isArray(data.plays)) {
    return `# API Response Error\n\nReceived unexpected response format from standalone plays API.`;
  }

  const plays = data.plays;
  const total = data.total || plays.length;

  let response = `# Standalone Plays Discovery\n\n`;

  // Summary
  response += `## Summary\n`;
  response += `Found ${total} standalone play${total === 1 ? '' : 's'} in the system`;

  const filters = [];
  if (input.solution) filters.push(`solution: ${input.solution}`);
  if (input.playType) filters.push(`type: ${input.playType}`);
  if (input.status) filters.push(`status: ${input.status}`);
  if (input.createdBy) filters.push(`created by: ${input.createdBy}`);
  if (input.search) filters.push(`search: "${input.search}"`);

  if (filters.length > 0) {
    response += ` (filtered by ${filters.join(', ')})`;
  }
  response += `.\n\n`;

  if (plays.length === 0) {
    response += `## No Plays Found\n\n`;
    response += `No standalone plays match your search criteria. Try:\n`;
    response += `- Removing some filters to broaden your search\n`;
    response += `- Checking for typos in your search terms\n`;
    response += `- Using different keywords\n\n`;
    return response;
  }

  // Play details
  response += `## Available Standalone Plays\n\n`;

  plays.forEach((play: any, index: number) => {
    response += `### ${index + 1}. ${play.name}\n`;

    if (input.includeDetails) {
      if (play.description) {
        response += `- **Description**: ${play.description}\n`;
      }

      if (play.genericPlayType) {
        response += `- **Type**: ${formatPlayType(play.genericPlayType)}\n`;
      }

      response += `- **Status**: ${formatStatus(play.status)}\n`;

      if (play.solutions && play.solutions.length > 0) {
        response += `- **Associated Solutions**: ${play.solutions.map((s: any) => s.name).join(', ')}\n`;
      }

      if (play.createdByUser) {
        response += `- **Created By**: ${play.createdByUser.name || play.createdByUser.email}\n`;
      }

      if (play.lastModifiedAt) {
        response += `- **Last Modified**: ${formatDate(play.lastModifiedAt)}\n`;
      }

      if (play.detectionConfig) {
        response += `- **Detection Configured**: Yes\n`;
      }
    } else {
      // Compact format
      const details = [];
      if (play.genericPlayType) details.push(formatPlayType(play.genericPlayType));
      if (play.status !== 'active') details.push(formatStatus(play.status));
      if (play.solutions && play.solutions.length > 0) {
        details.push(`${play.solutions.length} solution${play.solutions.length === 1 ? '' : 's'}`);
      }
      if (details.length > 0) {
        response += `  *${details.join(' • ')}*\n`;
      }
    }

    response += `\n`;
  });

  // Analytics
  if (plays.length > 1) {
    response += formatStandalonePlayAnalytics(plays);
  }

  // Recommendations
  response += `## Recommendations\n\n`;
  response += generateRecommendations(plays, input);

  return response;
}

function formatStandalonePlayAnalytics(plays: any[]): string {
  let response = `## Analytics\n\n`;

  // Play type distribution
  const playTypeCount: Record<string, number> = {};
  const statusCount: Record<string, number> = {};
  const solutionCount: Record<string, Set<string>> = {};

  plays.forEach(play => {
    if (play.genericPlayType) {
      playTypeCount[play.genericPlayType] = (playTypeCount[play.genericPlayType] || 0) + 1;
    }

    if (play.status) {
      statusCount[play.status] = (statusCount[play.status] || 0) + 1;
    }

    if (play.solutions) {
      play.solutions.forEach((solution: any) => {
        if (!solutionCount[solution.name]) {
          solutionCount[solution.name] = new Set();
        }
        solutionCount[solution.name].add(play.id);
      });
    }
  });

  // Play type breakdown
  if (Object.keys(playTypeCount).length > 0) {
    response += `### Play Type Distribution\n`;
    Object.entries(playTypeCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        const percentage = Math.round((count / plays.length) * 100);
        response += `- **${formatPlayType(type)}**: ${count} plays (${percentage}%)\n`;
      });
    response += `\n`;
  }

  // Status breakdown
  if (Object.keys(statusCount).length > 0) {
    response += `### Status Distribution\n`;
    Object.entries(statusCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([status, count]) => {
        const percentage = Math.round((count / plays.length) * 100);
        response += `- **${formatStatus(status)}**: ${count} plays (${percentage}%)\n`;
      });
    response += `\n`;
  }

  // Solution coverage
  if (Object.keys(solutionCount).length > 0) {
    response += `### Solution Coverage\n`;
    Object.entries(solutionCount)
      .sort(([,a], [,b]) => b.size - a.size)
      .slice(0, 5) // Top 5 solutions
      .forEach(([solution, playSet]) => {
        response += `- **${solution}**: ${playSet.size} plays\n`;
      });

    if (Object.keys(solutionCount).length > 5) {
      response += `- *...and ${Object.keys(solutionCount).length - 5} more solutions*\n`;
    }
    response += `\n`;
  }

  return response;
}

function generateRecommendations(plays: any[], input: any): string {
  let recommendations = [];

  // Check play type coverage
  const existingTypes = new Set(plays.map(p => p.genericPlayType).filter(Boolean));
  const recommendedTypes = ['discovery', 'demo', 'technical', 'business', 'closing'];
  const missingTypes = recommendedTypes.filter(type => !existingTypes.has(type));

  if (missingTypes.length > 0 && plays.length > 0) {
    recommendations.push(`**Content Gap Analysis**: Consider creating ${missingTypes.map(formatPlayType).join(', ')} plays to complete your play type coverage`);
  }

  // Check for inactive plays
  const inactivePlays = plays.filter(p => p.status === 'inactive').length;
  if (inactivePlays > 0) {
    recommendations.push(`**Content Audit**: Review ${inactivePlays} inactive play${inactivePlays === 1 ? '' : 's'} - consider updating or archiving outdated content`);
  }

  // Check for draft plays
  const draftPlays = plays.filter(p => p.status === 'draft').length;
  if (draftPlays > 0) {
    recommendations.push(`**Content Development**: Complete ${draftPlays} draft play${draftPlays === 1 ? '' : 's'} to make them available for playbook association`);
  }

  // Check solution associations
  const playsWithoutSolutions = plays.filter(p => !p.solutions || p.solutions.length === 0).length;
  if (playsWithoutSolutions > 0) {
    recommendations.push(`**Solution Mapping**: ${playsWithoutSolutions} play${playsWithoutSolutions === 1 ? '' : 's'} need solution associations for better discoverability and AI recommendations`);
  }

  // Usage recommendations
  if (plays.length > 10) {
    recommendations.push(`**Organization**: With ${plays.length} standalone plays, consider implementing tags or categories for better organization`);
  }

  if (recommendations.length === 0) {
    return `- Your standalone plays are well-organized and comprehensive\n- Consider regular reviews to keep content current\n- Monitor usage metrics to identify most effective plays\n`;
  }

  return recommendations.map(rec => `- ${rec}\n`).join('');
}

function formatNoApiResponse(input: any): string {
  let response = `# Standalone Plays Discovery\n\n`;
  response += `## API Unavailable\n\n`;
  response += `The standalone plays API is not currently available. This tool requires:\n\n`;
  response += `- Active connection to the sales intelligence platform\n`;
  response += `- Valid API credentials\n`;
  response += `- Standalone plays feature enabled\n\n`;

  response += `## What are Standalone Plays?\n\n`;
  response += `Standalone plays are reusable sales content components that can be:\n\n`;
  response += `- **Associated with multiple playbooks** - One play can be used across different sales scenarios\n`;
  response += `- **Independently managed** - Created, updated, and maintained separately from specific playbooks\n`;
  response += `- **Team collaborative** - Shared across teams with role-based permissions (owner, editor, viewer)\n`;
  response += `- **Solution-linked** - Associated with specific solutions for intelligent recommendations\n`;
  response += `- **AI-discoverable** - Enhanced with detection rules and embeddings for smart matching\n\n`;

  response += `## Play Types\n\n`;
  response += `- **Discovery**: Questions and frameworks for understanding client needs\n`;
  response += `- **Demo**: Technical demonstrations and proof-of-concept content\n`;
  response += `- **Technical**: In-depth technical content for expert audiences\n`;
  response += `- **Business**: ROI calculators and business value content\n`;
  response += `- **Closing**: Final presentation content and decision-making frameworks\n\n`;

  response += `## Benefits\n\n`;
  response += `- **Consistency**: Ensure uniform messaging across all playbooks\n`;
  response += `- **Efficiency**: Reuse content instead of duplicating efforts\n`;
  response += `- **Collaboration**: Enable teams to contribute and maintain shared content\n`;
  response += `- **Intelligence**: Get AI-powered recommendations for relevant plays\n`;
  response += `- **Analytics**: Track usage and effectiveness across multiple contexts\n\n`;

  if (Object.keys(input).length > 1) { // More than just defaults
    response += `## Your Search Criteria\n\n`;
    if (input.solution) response += `- **Solution**: ${input.solution}\n`;
    if (input.playType) response += `- **Play Type**: ${formatPlayType(input.playType)}\n`;
    if (input.status) response += `- **Status**: ${formatStatus(input.status)}\n`;
    if (input.createdBy) response += `- **Created By**: ${input.createdBy}\n`;
    if (input.search) response += `- **Search**: "${input.search}"\n`;
    response += `\nConnect to the API to search your actual standalone plays library.\n`;
  }

  return response;
}

function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue =>
    `- ${issue.path.join('.')}: ${issue.message}`
  ).join('\n');

  return `# Invalid Input\n\nPlease check the following:\n\n${issues}\n\n## Available Parameters\n\n` +
         `- **solution**: Filter by associated solution name\n` +
         `- **playType**: Filter by play type (discovery, demo, technical, business, closing)\n` +
         `- **status**: Filter by status (active, inactive, draft)\n` +
         `- **createdBy**: Filter by creator name or email\n` +
         `- **search**: Search term for names and descriptions\n` +
         `- **includeDetails**: Include detailed information (default: true)\n` +
         `- **limit**: Maximum results to return (1-100, default: 20)\n\n` +
         `## Example Usage\n\n\`\`\`json\n{\n  "playType": "demo",\n  "status": "active",\n  "includeDetails": true,\n  "limit": 10\n}\n\`\`\``;
}

function formatPlayType(playType: string): string {
  const typeMap: Record<string, string> = {
    'discovery': 'Discovery',
    'demo': 'Demo',
    'technical': 'Technical',
    'business': 'Business',
    'closing': 'Closing'
  };
  return typeMap[playType] || playType.charAt(0).toUpperCase() + playType.slice(1);
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'active': '🟢 Active',
    'inactive': '🔴 Inactive',
    'draft': '🟡 Draft'
  };
  return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export const discoverStandalonePlaysTool: MCPTool = {
  name: "discover_standalone_plays",
  description: "Discover and analyze standalone plays - reusable sales content that can be associated with multiple playbooks. Search by solution, play type, status, creator, or keywords.",
  inputSchema,
  handler
};