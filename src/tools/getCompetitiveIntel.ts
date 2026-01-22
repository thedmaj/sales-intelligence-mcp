import { z } from 'zod';
import { distance } from 'fastest-levenshtein';
import { findCompetitor, demoCompetitors } from '../data/demoData.js';
import type { MCPTool } from './index.js';

const inputSchema = {
  type: "object",
  properties: {
    competitor: {
      type: "string",
      description: "Name of competitor (supports abbreviations like 'EWS' for Early Warning System)"
    },
    solution: {
      type: "string",
      description: "Filter by solution context (e.g., Account Verification, Fraud Prevention, Payment Processing)"
    },
    includeExamples: {
      type: "boolean",
      description: "Include example talking points and use cases",
      default: true
    }
  },
  required: ["competitor"]
} as const;

const competitorSchema = z.object({
  competitor: z.string().min(1, "Competitor name cannot be empty"),
  solution: z.string().optional(),
  includeExamples: z.boolean().default(true)
});

async function handler(args: any, apiClient: any): Promise<string> {
  try {
    // Validate input
    const input = competitorSchema.parse(args);

    // Find competitor in demo data
    const competitorData = findCompetitor(input.competitor);

    if (!competitorData) {
      return formatCompetitorNotFound(input.competitor);
    }

    return formatCompetitiveIntelligence(competitorData, input);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatValidationError(error);
    }
    throw new Error(`Competitive intelligence query failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function formatCompetitiveIntelligence(competitor: any, input: any): string {
  let response = `# Competitive Intelligence: ${competitor.name}\n\n`;

  // Summary
  response += `## Summary\n`;
  response += `Found ${competitor.talkingPoints.length} talking points for competing against ${competitor.name}`;
  if (input.solution) {
    response += ` in the context of ${input.solution}`;
  }
  response += `.\n\n`;

  // Key talking points
  response += `## Key Competitive Advantages\n\n`;
  competitor.talkingPoints.forEach((point: string, index: number) => {
    response += `### ${index + 1}. ${point}\n`;
    response += `${getDetailedAdvice(point)}\n\n`;
  });

  // Battle card tips
  response += `## Battle Card Tips\n\n`;
  response += `**When competing against ${competitor.name}:**\n`;
  response += `- Focus on differentiation points mentioned above\n`;
  response += `- Ask discovery questions that highlight their weaknesses\n`;
  response += `- Prepare demos that showcase our advantages\n`;
  response += `- Have customer references ready for head-to-head comparisons\n\n`;

  // Discovery questions
  response += `## Discovery Questions\n\n`;
  response += `Use these questions to uncover pain points with ${competitor.name}:\n`;
  response += `- "What challenges are you experiencing with your current solution?"\n`;
  response += `- "How satisfied are you with the implementation timeline?"\n`;
  response += `- "Are there any performance or accuracy issues you'd like to improve?"\n`;
  response += `- "What would an ideal solution look like for your team?"\n\n`;

  // Sources
  if (competitor.sources && competitor.sources.length > 0) {
    response += `## Related Content\n\n`;
    response += `**Sources for this competitive intelligence:**\n`;
    competitor.sources.forEach((source: any) => {
      response += `- ${source.type === 'play' ? '📋' : '📄'} ${source.name}\n`;
    });
    response += `\n*Review these materials for more detailed competitive positioning.*\n`;
  }

  return response;
}

function formatCompetitorNotFound(competitorName: string): string {
  const availableCompetitors = Object.keys(demoCompetitors);
  const suggestions = findSimilarCompetitors(competitorName, availableCompetitors);

  let response = `# No Competitive Intelligence Found\n\n`;
  response += `No competitive intelligence found for "${competitorName}".\n\n`;

  if (suggestions.length > 0) {
    response += `## Did you mean?\n\n`;
    suggestions.forEach(suggestion => {
      response += `- ${suggestion}\n`;
    });
    response += `\n`;
  }

  response += `## Available Competitors\n\n`;
  availableCompetitors.forEach(competitor => {
    response += `- **${competitor}**\n`;
  });

  response += `\n## What to do?\n\n`;
  response += `**If this is a new competitor:**\n`;
  response += `- Research their key features and positioning\n`;
  response += `- Identify their strengths and weaknesses\n`;
  response += `- Develop talking points based on our advantages\n`;
  response += `- Create battle cards for future reference\n\n`;

  response += `**For immediate help:**\n`;
  response += `- Use general competitive positioning plays\n`;
  response += `- Focus on our core value propositions\n`;
  response += `- Gather intelligence during discovery calls\n`;

  return response;
}

function findSimilarCompetitors(input: string, available: string[]): string[] {
  const threshold = 0.6;
  const suggestions: Array<{ name: string; similarity: number }> = [];

  for (const competitor of available) {
    const similarity = 1 - (distance(input.toLowerCase(), competitor.toLowerCase()) / Math.max(input.length, competitor.length));
    if (similarity >= threshold) {
      suggestions.push({ name: competitor, similarity });
    }
  }

  return suggestions
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map(s => s.name);
}

function getDetailedAdvice(talkingPoint: string): string {
  const adviceMap: Record<string, string> = {
    'real-time': '**Use Case**: Emphasize scenarios where real-time detection prevents fraud that batch processing would miss. Mention time-sensitive transactions.',
    'API': '**Technical Benefit**: Highlight developer experience, faster integration, better documentation, and more flexible webhooks.',
    'false positive': '**Customer Impact**: Quantify the cost of false positives - blocked legitimate customers, support tickets, revenue loss.',
    'machine learning': '**Innovation**: Discuss our adaptive models, continuous learning, and ability to detect new fraud patterns faster.',
    'integration': '**Implementation**: Compare implementation timelines, complexity, and ongoing maintenance requirements.'
  };

  const lowerPoint = talkingPoint.toLowerCase();
  for (const [key, advice] of Object.entries(adviceMap)) {
    if (lowerPoint.includes(key)) {
      return advice;
    }
  }

  return '**Positioning**: Use this point to differentiate our solution and create value in the client\'s context.';
}

function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue =>
    `- ${issue.path.join('.')}: ${issue.message}`
  ).join('\n');

  return `# Invalid Input\n\nPlease check the following:\n\n${issues}\n\n## Required Parameters\n- **competitor**: Name of competitor (required)\n\n## Optional Parameters\n- **solution**: Solution context for filtering\n- **includeExamples**: Include detailed examples (default: true)`;
}

export const getCompetitiveIntelTool: MCPTool = {
  name: "get_competitive_intel",
  description: "Get competitive intelligence and talking points for competing against specific competitors. Supports common competitor names and abbreviations.",
  inputSchema,
  handler
};