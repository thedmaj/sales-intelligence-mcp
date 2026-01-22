import { z } from 'zod';
import { ApiClient } from '../auth/apiClient.js';
import { logger } from '../utils/logger.js';

export const getCompetitiveIntelTool = {
  name: 'get_competitive_intel',
  description: 'Get competitive intelligence, talking points, and positioning strategies against specific competitors. Includes real examples from sales calls and battle cards.',
  inputSchema: {
    type: 'object',
    properties: {
      competitor: {
        type: 'string',
        description: 'Competitor name (e.g., "Early Warning System", "EWS", "Stripe", "Zelle", "Plaid")'
      },
      solution: {
        type: 'string',
        description: 'Filter by solution context (e.g., "Account Verification", "Payment Processing")'
      },
      segment: {
        type: 'string',
        description: 'Filter by market segment (e.g., "Enterprise", "Banking", "Fintech")'
      },
      includeExamples: {
        type: 'boolean',
        default: true,
        description: 'Include real examples from sales calls and content'
      }
    },
    required: ['competitor'],
    additionalProperties: false
  },

  async handler(args: any, apiClient: ApiClient): Promise<string> {
    try {
      // Validate input
      const input = z.object({
        competitor: z.string().min(1, 'Competitor name is required'),
        solution: z.string().optional(),
        segment: z.string().optional(),
        includeExamples: z.boolean().default(true)
      }).parse(args);

      logger.debug('Processing competitive intelligence request', {
        competitor: input.competitor,
        filters: {
          solution: input.solution,
          segment: input.segment
        }
      });

      // Make API request
      const response = await apiClient.request<{
        content: Array<{ type: string; text: string }>;
      }>('/get_competitive_intel', input);

      // Parse the response
      const competitiveData = JSON.parse(response.content[0].text);

      return formatCompetitiveIntelligence(competitiveData, input);

    } catch (error) {
      logger.error('Competitive intelligence request failed', {
        error: error instanceof Error ? error.message : String(error),
        args
      });

      if (error instanceof z.ZodError) {
        return formatValidationError(error);
      }

      // Check if this is a competitor not found error
      if (error.message?.includes('No competitive intelligence found')) {
        return formatNoCompetitorFound(input.competitor);
      }

      throw new Error(`Competitive intelligence lookup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

function formatCompetitiveIntelligence(data: any, input: any): string {
  const intelligence = data.intelligence || [];
  const competitor = data.competitor || input.competitor;

  let result = `# 🥊 Competitive Intelligence: ${competitor}\n\n`;

  if (intelligence.length === 0) {
    return formatNoCompetitorFound(competitor);
  }

  const intel = intelligence[0]; // Primary intelligence object
  const talkingPoints = intel.talkingPoints || [];
  const sources = intel.sources || [];

  // Overview section
  result += `## 📊 Overview\n\n`;
  result += `**Competitor:** ${competitor}\n`;
  result += `**Talking Points Found:** ${talkingPoints.length}\n`;
  result += `**Sources:** ${sources.length} (plays, content, calls)\n`;

  if (input.solution || input.segment) {
    result += `**Context Filters:** `;
    const filters = [];
    if (input.solution) filters.push(`Solution: ${input.solution}`);
    if (input.segment) filters.push(`Segment: ${input.segment}`);
    result += filters.join(', ');
    result += `\n`;
  }

  result += `\n---\n\n`;

  // Talking points section
  if (talkingPoints.length > 0) {
    result += `## 🎯 Key Talking Points\n\n`;

    talkingPoints.forEach((point: string, index: number) => {
      result += `### ${index + 1}. ${cleanTalkingPoint(point)}\n\n`;
    });

    result += `---\n\n`;
  }

  // Battle card section
  if (talkingPoints.length > 0) {
    result += `## ⚔️ Battle Card Summary\n\n`;
    result += `**When competing against ${competitor}:**\n\n`;

    const categories = categorizeTalkingPoints(talkingPoints);

    if (categories.strengths.length > 0) {
      result += `**🟢 Our Strengths:**\n`;
      categories.strengths.forEach(point => {
        result += `- ${cleanTalkingPoint(point)}\n`;
      });
      result += `\n`;
    }

    if (categories.differentiators.length > 0) {
      result += `**🔵 Key Differentiators:**\n`;
      categories.differentiators.forEach(point => {
        result += `- ${cleanTalkingPoint(point)}\n`;
      });
      result += `\n`;
    }

    if (categories.responses.length > 0) {
      result += `**💬 Response Strategies:**\n`;
      categories.responses.forEach(point => {
        result += `- ${cleanTalkingPoint(point)}\n`;
      });
      result += `\n`;
    }

    result += `---\n\n`;
  }

  // Sources section
  if (sources.length > 0 && input.includeExamples) {
    result += `## 📚 Sources & Examples\n\n`;

    const sourcesByType = groupSourcesByType(sources);

    if (sourcesByType.plays.length > 0) {
      result += `**📋 Sales Plays (${sourcesByType.plays.length}):**\n`;
      sourcesByType.plays.forEach((source: any) => {
        result += `- ${source.name}\n`;
      });
      result += `\n`;
    }

    if (sourcesByType.content.length > 0) {
      result += `**📄 Supporting Content (${sourcesByType.content.length}):**\n`;
      sourcesByType.content.forEach((source: any) => {
        result += `- ${source.name}`;
        if (source.url) {
          result += ` ([link](${source.url}))`;
        }
        result += `\n`;
      });
      result += `\n`;
    }

    if (sourcesByType.gong_calls.length > 0) {
      result += `**📞 Gong Call Examples (${sourcesByType.gong_calls.length}):**\n`;
      sourcesByType.gong_calls.forEach((source: any) => {
        result += `- ${source.name}\n`;
      });
      result += `\n`;
    }

    result += `---\n\n`;
  }

  // Usage recommendations
  result += `## 💡 How to Use This Intelligence\n\n`;
  result += `1. **Preparation:** Review talking points before competitive calls\n`;
  result += `2. **Discovery:** Use differentiators to probe for pain points\n`;
  result += `3. **Positioning:** Lead with our strengths in their weak areas\n`;
  result += `4. **Objection Handling:** Prepare responses for common competitor claims\n`;
  result += `5. **Follow-up:** Reference specific examples and case studies\n\n`;

  if (talkingPoints.length > 5) {
    result += `⭐ **Tip:** Focus on the top 3-5 most relevant talking points for each conversation.\n\n`;
  }

  return result;
}

function formatNoCompetitorFound(competitor: string): string {
  let result = `# 🔍 No Competitive Intelligence Found\n\n`;
  result += `**Competitor:** ${competitor}\n\n`;
  result += `No competitive intelligence was found for "${competitor}". This could mean:\n\n`;
  result += `- **New competitor:** We haven't encountered them in sales calls yet\n`;
  result += `- **Name variation:** Try different spellings or abbreviations\n`;
  result += `- **Missing data:** Competitive content hasn't been captured\n\n`;
  result += `**Suggested Actions:**\n`;
  result += `- Check for name variations or abbreviations\n`;
  result += `- Search for plays mentioning this competitor\n`;
  result += `- Create competitive intelligence content for this competitor\n`;
  result += `- Review recent Gong calls for mentions\n\n`;

  // Suggest common competitor names
  const commonCompetitors = [
    'Early Warning System', 'EWS', 'Stripe', 'Zelle', 'Plaid',
    'Yodlee', 'MX', 'Tink', 'Fiserv', 'FIS'
  ];

  result += `**Common Competitors in System:**\n`;
  commonCompetitors.forEach(comp => {
    result += `- ${comp}\n`;
  });

  return result;
}

function formatValidationError(error: z.ZodError): string {
  const issues = error.errors.map(e => `- ${e.path.join('.')}: ${e.message}`).join('\n');
  return `❌ **Invalid Input**\n\n${issues}\n\nPlease provide a competitor name and try again.`;
}

function cleanTalkingPoint(point: string): string {
  // Clean up talking points for better readability
  return point
    .trim()
    .replace(/^[•\-\*\s]+/, '') // Remove bullet points
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
}

function categorizeTalkingPoints(points: string[]): {
  strengths: string[];
  differentiators: string[];
  responses: string[];
  general: string[];
} {
  const categories = {
    strengths: [] as string[],
    differentiators: [] as string[],
    responses: [] as string[],
    general: [] as string[]
  };

  points.forEach(point => {
    const pointLower = point.toLowerCase();

    if (pointLower.includes('unlike') || pointLower.includes('different') || pointLower.includes('unique')) {
      categories.differentiators.push(point);
    } else if (pointLower.includes('better') || pointLower.includes('stronger') || pointLower.includes('superior')) {
      categories.strengths.push(point);
    } else if (pointLower.includes('response') || pointLower.includes('handle') || pointLower.includes('address')) {
      categories.responses.push(point);
    } else {
      categories.general.push(point);
    }
  });

  // If we don't have clear categories, put everything in general
  if (categories.strengths.length === 0 && categories.differentiators.length === 0) {
    categories.general = points;
  }

  return categories;
}

function groupSourcesByType(sources: any[]): {
  plays: any[];
  content: any[];
  gong_calls: any[];
} {
  return sources.reduce((groups, source) => {
    switch (source.type) {
      case 'play':
        groups.plays.push(source);
        break;
      case 'content':
        groups.content.push(source);
        break;
      case 'gong_call':
        groups.gong_calls.push(source);
        break;
      default:
        groups.content.push(source); // Default to content
    }
    return groups;
  }, {
    plays: [] as any[],
    content: [] as any[],
    gong_calls: [] as any[]
  });
}