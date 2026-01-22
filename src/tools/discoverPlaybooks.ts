import { z } from 'zod';
import { searchPlaybooks, demoPlaybooks } from '../data/demoData.js';
import type { MCPTool } from './index.js';

const inputSchema = {
  type: "object",
  properties: {
    solution: {
      type: "string",
      description: "Filter by solution (e.g., Account Verification, Fraud Prevention, Payment Processing)"
    },
    segment: {
      type: "string",
      description: "Filter by market segment (Enterprise, Mid-Market, SMB)"
    },
    vertical: {
      type: "string",
      description: "Filter by vertical market (e.g., Banking, Fintech, Insurance)"
    },
    industry: {
      type: "string",
      description: "Filter by industry focus"
    },
    showGaps: {
      type: "boolean",
      description: "Include gap analysis showing missing play types",
      default: true
    }
  }
} as const;

const playbookSchema = z.object({
  solution: z.string().optional(),
  segment: z.string().optional(),
  vertical: z.string().optional(),
  industry: z.string().optional(),
  showGaps: z.boolean().default(true)
});

async function handler(args: any, apiClient: any): Promise<string> {
  try {
    const input = playbookSchema.parse(args);

    // Require at least one filter
    if (!input.solution && !input.segment && !input.vertical && !input.industry) {
      return formatMissingFiltersError();
    }

    const playbooks = searchPlaybooks({
      solution: input.solution,
      segment: input.segment,
      vertical: input.vertical,
      industry: input.industry
    });

    if (playbooks.length === 0) {
      return formatNoPlaybooksFound(input);
    }

    return formatPlaybookResults(playbooks, input);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatValidationError(error);
    }
    throw error;
  }
}

function formatPlaybookResults(playbooks: any[], input: any): string {
  let response = `# Playbook Discovery\n\n`;

  // Summary
  response += `## Summary\n`;
  response += `Found ${playbooks.length} playbook${playbooks.length === 1 ? '' : 's'} matching your criteria`;

  const filters = [];
  if (input.solution) filters.push(`solution: ${input.solution}`);
  if (input.segment) filters.push(`segment: ${input.segment}`);
  if (input.vertical) filters.push(`vertical: ${input.vertical}`);
  if (input.industry) filters.push(`industry: ${input.industry}`);

  if (filters.length > 0) {
    response += ` (${filters.join(', ')})`;
  }
  response += `.\n\n`;

  // Playbook details
  response += `## Available Playbooks\n\n`;

  playbooks.forEach((playbook, index) => {
    response += `### ${index + 1}. ${playbook.name}\n`;
    response += `- **Solution**: ${playbook.solution.name}\n`;

    if (playbook.segment) {
      response += `- **Segment**: ${playbook.segment.name}\n`;
    }

    response += `- **Play Count**: ${playbook.playCount} plays\n`;
    response += `- **Play Types**: ${playbook.playTypes.join(', ')}\n`;
    response += `- **Description**: ${playbook.description}\n\n`;
  });

  // Gap analysis
  if (input.showGaps) {
    response += formatGapAnalysis(playbooks);
  }

  // Recommendations
  response += `## Recommendations\n\n`;
  response += `**Content Strategy:**\n`;

  const totalPlays = playbooks.reduce((sum, p) => sum + p.playCount, 0);
  const avgPlaysPerPlaybook = Math.round(totalPlays / playbooks.length);

  if (avgPlaysPerPlaybook < 6) {
    response += `- Consider expanding playbooks (average: ${avgPlaysPerPlaybook} plays per playbook)\n`;
  }

  const allPlayTypes = new Set();
  playbooks.forEach(p => p.playTypes.forEach((type: string) => allPlayTypes.add(type)));

  if (!allPlayTypes.has('COMPETITIVE_POSITIONING')) {
    response += `- Add competitive positioning plays to strengthen market differentiation\n`;
  }
  if (!allPlayTypes.has('PROCESS')) {
    response += `- Consider adding process/workflow plays for implementation guidance\n`;
  }
  if (!allPlayTypes.has('VALUE_PROPOSITION')) {
    response += `- Include value proposition plays for ROI conversations\n`;
  }

  response += `- Review playbook usage metrics to identify most effective content\n`;
  response += `- Regular updates ensure content stays current with market changes\n`;

  return response;
}

function formatGapAnalysis(playbooks: any[]): string {
  const allPossiblePlayTypes = ['DISCOVERY', 'DEMO', 'VALUE_PROPOSITION', 'COMPETITIVE_POSITIONING', 'TECHNICAL_DEEP_DIVE', 'OBJECTION_HANDLING', 'CONTENT_DELIVERY', 'PROCESS'];

  const existingPlayTypes = new Set();
  playbooks.forEach(playbook => {
    playbook.playTypes.forEach((type: string) => existingPlayTypes.add(type));
  });

  const missingPlayTypes = allPossiblePlayTypes.filter(type => !existingPlayTypes.has(type));
  const coveragePercentage = Math.round((existingPlayTypes.size / allPossiblePlayTypes.length) * 100);

  let response = `## Gap Analysis\n\n`;
  response += `### Coverage Score: ${coveragePercentage}%\n`;
  response += `You have ${existingPlayTypes.size} out of ${allPossiblePlayTypes.length} possible play types.\n\n`;

  if (missingPlayTypes.length > 0) {
    response += `### Missing Play Types\n`;
    missingPlayTypes.forEach(type => {
      response += `- **${formatPlayTypeName(type)}**: ${getPlayTypeDescription(type)}\n`;
    });
    response += `\n`;
  } else {
    response += `### ✅ Complete Coverage\n`;
    response += `Excellent! You have comprehensive play type coverage across all categories.\n\n`;
  }

  // Playbook-specific gaps
  response += `### Playbook-Specific Analysis\n`;
  playbooks.forEach(playbook => {
    const playbookMissing = allPossiblePlayTypes.filter(type => !playbook.playTypes.includes(type));
    if (playbookMissing.length > 0) {
      response += `- **${playbook.name}**: Missing ${playbookMissing.slice(0, 3).map(formatPlayTypeName).join(', ')}`;
      if (playbookMissing.length > 3) {
        response += ` and ${playbookMissing.length - 3} more`;
      }
      response += `\n`;
    }
  });

  return response + `\n`;
}

function formatNoPlaybooksFound(input: any): string {
  let response = `# No Playbooks Found\n\n`;

  const filters = [];
  if (input.solution) filters.push(`solution: ${input.solution}`);
  if (input.segment) filters.push(`segment: ${input.segment}`);
  if (input.vertical) filters.push(`vertical: ${input.vertical}`);
  if (input.industry) filters.push(`industry: ${input.industry}`);

  response += `No playbooks found matching your criteria`;
  if (filters.length > 0) {
    response += ` (${filters.join(', ')})`;
  }
  response += `.\n\n`;

  response += `## Available Options\n\n`;

  const availableSolutions = [...new Set(demoPlaybooks.map(p => p.solution.name))];
  response += `**Solutions:**\n`;
  availableSolutions.forEach(solution => {
    response += `- ${solution}\n`;
  });

  const availableSegments = [...new Set(demoPlaybooks.filter(p => p.segment).map(p => p.segment!.name))];
  if (availableSegments.length > 0) {
    response += `\n**Segments:**\n`;
    availableSegments.forEach(segment => {
      response += `- ${segment}\n`;
    });
  }

  response += `\n## Suggestions\n\n`;
  response += `- Try broader search criteria\n`;
  response += `- Remove some filters to see more options\n`;
  response += `- Consider creating new playbooks for underserved areas\n`;

  return response;
}

function formatMissingFiltersError(): string {
  return `# Missing Search Criteria\n\nPlease provide at least one filter to discover playbooks:\n\n- **solution**: Filter by solution name\n- **segment**: Filter by market segment\n- **vertical**: Filter by vertical market\n- **industry**: Filter by industry focus\n\n## Example Usage\n\n\`\`\`json\n{\n  "solution": "Account Verification",\n  "segment": "Enterprise",\n  "showGaps": true\n}\n\`\`\``;
}

function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue =>
    `- ${issue.path.join('.')}: ${issue.message}`
  ).join('\n');

  return `# Invalid Input\n\nPlease check the following:\n\n${issues}\n\n## Optional Parameters\n- **solution**: Solution name filter\n- **segment**: Market segment filter\n- **vertical**: Vertical market filter\n- **industry**: Industry filter\n- **showGaps**: Include gap analysis (default: true)`;
}

function formatPlayTypeName(playType: string): string {
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

function getPlayTypeDescription(playType: string): string {
  const descriptions: Record<string, string> = {
    'DISCOVERY': 'Questions and frameworks for understanding client needs',
    'DEMO': 'Technical demonstrations and proof-of-concept content',
    'VALUE_PROPOSITION': 'ROI calculators and business value content',
    'COMPETITIVE_POSITIONING': 'Battle cards and differentiation content',
    'TECHNICAL_DEEP_DIVE': 'In-depth technical content for expert audiences',
    'OBJECTION_HANDLING': 'Responses to common objections and concerns',
    'CONTENT_DELIVERY': 'Educational and thought leadership content',
    'PROCESS': 'Implementation workflows and process guidance'
  };
  return descriptions[playType] || 'Specialized sales content';
}

export const discoverPlaybooksTool: MCPTool = {
  name: "discover_playbooks",
  description: "Discover available playbooks and analyze content gaps. Filter by solution, segment, vertical, or industry to find relevant playbooks.",
  inputSchema,
  handler
};