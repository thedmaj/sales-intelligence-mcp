import { z } from 'zod';
import { ApiClient } from '../auth/apiClient.js';
import { logger } from '../utils/logger.js';

export const discoverPlaybooksTool = {
  name: 'discover_playbooks',
  description: 'Discover available playbooks for solution-segment combinations and identify content gaps. Shows what playbooks exist and highlights missing coverage areas.',
  inputSchema: {
    type: 'object',
    properties: {
      solution: {
        type: 'string',
        description: 'Solution name or category (e.g., "Account Verification", "Fraud Prevention", "Payment Processing")'
      },
      segment: {
        type: 'string',
        description: 'Market segment (e.g., "Enterprise", "SMB", "Banking", "Fintech")'
      },
      vertical: {
        type: 'string',
        description: 'Industry vertical (e.g., "Banking", "Wealth Management", "Insurance")'
      },
      showGaps: {
        type: 'boolean',
        default: false,
        description: 'Highlight missing content gaps and coverage analysis'
      }
    },
    additionalProperties: false
  },

  async handler(args: any, apiClient: ApiClient): Promise<string> {
    try {
      // Validate input
      const input = z.object({
        solution: z.string().optional(),
        segment: z.string().optional(),
        vertical: z.string().optional(),
        showGaps: z.boolean().default(false)
      }).parse(args);

      // At least one filter should be provided
      if (!input.solution && !input.segment && !input.vertical) {
        throw new Error('Please provide at least one filter: solution, segment, or vertical');
      }

      logger.debug('Processing playbook discovery', {
        filters: {
          solution: input.solution,
          segment: input.segment,
          vertical: input.vertical
        },
        showGaps: input.showGaps
      });

      // Make API request
      const response = await apiClient.request<{
        content: Array<{ type: string; text: string }>;
      }>('/discover_playbooks', input);

      // Parse the response
      const discoveryData = JSON.parse(response.content[0].text);

      return formatPlaybookDiscovery(discoveryData, input);

    } catch (error) {
      logger.error('Playbook discovery failed', {
        error: error instanceof Error ? error.message : String(error),
        args
      });

      if (error instanceof z.ZodError) {
        return formatValidationError(error);
      }

      throw new Error(`Playbook discovery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

function formatPlaybookDiscovery(data: any, input: any): string {
  const playbooks = data.playbooks || [];
  const total = data.total || playbooks.length;
  const gaps = data.gaps;

  let result = `# 📚 Playbook Discovery\n\n`;

  // Show applied filters
  const filters = [];
  if (input.solution) filters.push(`Solution: ${input.solution}`);
  if (input.segment) filters.push(`Segment: ${input.segment}`);
  if (input.vertical) filters.push(`Vertical: ${input.vertical}`);

  if (filters.length > 0) {
    result += `**Search Criteria:** ${filters.join(' | ')}\n`;
  }

  result += `**Found:** ${total} playbook${total !== 1 ? 's' : ''}\n\n`;

  if (playbooks.length === 0) {
    return formatNoPlaybooksFound(input);
  }

  result += `---\n\n`;

  // Format each playbook
  playbooks.forEach((playbook: any, index: number) => {
    result += formatSinglePlaybook(playbook, index + 1);
    result += `\n---\n\n`;
  });

  // Coverage analysis
  if (playbooks.length > 0) {
    result += `## 📊 Coverage Analysis\n\n`;

    const allPlayTypes = extractAllPlayTypes(playbooks);
    if (allPlayTypes.length > 0) {
      result += `**Play Types Covered:** ${allPlayTypes.join(', ')}\n`;
    }

    const solutions = [...new Set(playbooks.map((p: any) => p.solution?.name).filter(Boolean))];
    if (solutions.length > 0) {
      result += `**Solutions:** ${solutions.join(', ')}\n`;
    }

    const segments = [...new Set(playbooks.map((p: any) => p.segment?.name).filter(Boolean))];
    if (segments.length > 0) {
      result += `**Market Segments:** ${segments.join(', ')}\n`;
    }

    const totalPlays = playbooks.reduce((sum: number, p: any) => sum + (p.playCount || 0), 0);
    const avgPlaysPerPlaybook = Math.round(totalPlays / playbooks.length);

    result += `**Total Plays:** ${totalPlays} (avg: ${avgPlaysPerPlaybook} per playbook)\n`;

    result += `\n`;
  }

  // Gap analysis
  if (input.showGaps && gaps) {
    result += formatGapAnalysis(gaps, input);
  }

  // Recommendations
  result += `## 💡 Recommendations\n\n`;

  if (playbooks.length === 1) {
    result += `✅ **Single playbook found** - Review this playbook for completeness\n`;
  } else if (playbooks.length > 5) {
    result += `📈 **Multiple playbooks available** - Consider consolidating similar content\n`;
  } else {
    result += `👍 **Good coverage** - ${playbooks.length} playbooks provide good foundation\n`;
  }

  if (input.showGaps && gaps?.missingPlayTypes?.length > 0) {
    result += `🔍 **Content gaps identified** - Consider creating plays for missing types\n`;
  }

  if (!input.solution && !input.segment) {
    result += `🎯 **Add filters** - Specify solution or segment for more targeted results\n`;
  }

  result += `📋 **Next steps:** Review individual playbooks and enhance based on gaps\n`;

  return result;
}

function formatSinglePlaybook(playbook: any, index: number): string {
  let result = `## ${index}. ${playbook.name}\n\n`;

  if (playbook.description) {
    result += `**Description:** ${playbook.description}\n`;
  }

  if (playbook.solution?.name) {
    result += `**🛠️ Solution:** ${playbook.solution.name}\n`;
  }

  if (playbook.segment?.name) {
    result += `**🎯 Segment:** ${playbook.segment.name}\n`;
  }

  result += `**📋 Plays:** ${playbook.playCount || 0}\n`;

  if (playbook.playTypes && playbook.playTypes.length > 0) {
    result += `**🎲 Play Types:** ${playbook.playTypes.map(formatPlayType).join(', ')}\n`;
  }

  if (playbook.status && playbook.status !== 'active') {
    result += `**📊 Status:** ${formatStatus(playbook.status)}\n`;
  }

  // Show creation/update info if available
  if (playbook.createdAt) {
    const createdDate = new Date(playbook.createdAt).toLocaleDateString();
    result += `**📅 Created:** ${createdDate}\n`;
  }

  if (playbook.updatedAt && playbook.updatedAt !== playbook.createdAt) {
    const updatedDate = new Date(playbook.updatedAt).toLocaleDateString();
    result += `**🔄 Updated:** ${updatedDate}\n`;
  }

  return result;
}

function formatGapAnalysis(gaps: any, input: any): string {
  let result = `## 🔍 Gap Analysis\n\n`;

  if (gaps.coveragePercentage !== undefined) {
    const percentage = gaps.coveragePercentage;
    const status = percentage >= 80 ? '🟢' : percentage >= 60 ? '🟡' : '🔴';
    result += `**Coverage Score:** ${status} ${percentage}% of standard play types covered\n\n`;
  }

  if (gaps.missingPlayTypes && gaps.missingPlayTypes.length > 0) {
    result += `**Missing Play Types:**\n`;
    gaps.missingPlayTypes.forEach((playType: string) => {
      result += `- ${formatPlayType(playType)}: ${getPlayTypeDescription(playType)}\n`;
    });
    result += `\n`;
  }

  if (gaps.missingSegments && gaps.missingSegments.length > 0) {
    result += `**Potential Segment Gaps:**\n`;
    gaps.missingSegments.forEach((segment: string) => {
      result += `- ${segment}\n`;
    });
    result += `\n`;
  }

  if (gaps.recommendations && gaps.recommendations.length > 0) {
    result += `**Gap Filling Recommendations:**\n`;
    gaps.recommendations.forEach((rec: string, index: number) => {
      result += `${index + 1}. ${rec}\n`;
    });
    result += `\n`;
  }

  // Priority suggestions based on missing content
  if (gaps.missingPlayTypes && gaps.missingPlayTypes.length > 0) {
    result += `**Priority Actions:**\n`;
    const highPriorityTypes = ['DISCOVERY', 'DEMO', 'OBJECTION_HANDLING', 'VALUE_PROPOSITION'];
    const missingHighPriority = gaps.missingPlayTypes.filter((type: string) =>
      highPriorityTypes.includes(type)
    );

    if (missingHighPriority.length > 0) {
      result += `🔥 **High Priority:** Create ${missingHighPriority.map(formatPlayType).join(', ')} plays\n`;
    }

    const missingProcess = gaps.missingPlayTypes.includes('PROCESS');
    if (missingProcess) {
      result += `⚙️ **Process Workflows:** Add POC and implementation procedures\n`;
    }

    const missingCompetitive = gaps.missingPlayTypes.includes('COMPETITIVE_POSITIONING');
    if (missingCompetitive) {
      result += `🥊 **Competitive Intel:** Develop competitive positioning strategies\n`;
    }

    result += `\n`;
  }

  return result;
}

function formatNoPlaybooksFound(input: any): string {
  let result = `# 🔍 No Playbooks Found\n\n`;

  const filters = [];
  if (input.solution) filters.push(`Solution: ${input.solution}`);
  if (input.segment) filters.push(`Segment: ${input.segment}`);
  if (input.vertical) filters.push(`Vertical: ${input.vertical}`);

  if (filters.length > 0) {
    result += `**Search Criteria:** ${filters.join(' | ')}\n\n`;
  }

  result += `No playbooks match your criteria. This could indicate:\n\n`;
  result += `**🔍 Search Issues:**\n`;
  result += `- Spelling variations in solution/segment names\n`;
  result += `- Filters are too restrictive\n`;
  result += `- Entity names don't match database exactly\n\n`;

  result += `**📝 Content Gap:**\n`;
  result += `- This solution-segment combination lacks playbooks\n`;
  result += `- Opportunity to create new sales enablement content\n`;
  result += `- Consider developing playbooks for this area\n\n`;

  result += `**🎯 Suggested Actions:**\n`;
  result += `1. **Broaden search:** Try removing some filters\n`;
  result += `2. **Check spelling:** Verify solution/segment names\n`;
  result += `3. **Explore similar:** Look for related solutions or segments\n`;
  result += `4. **Create content:** Consider this a content creation opportunity\n\n`;

  // Suggest expanding search
  if (input.solution && input.segment) {
    result += `**Try These Searches:**\n`;
    result += `- Just solution: \`solution: "${input.solution}"\`\n`;
    result += `- Just segment: \`segment: "${input.segment}"\`\n`;
    if (input.vertical) {
      result += `- Just vertical: \`vertical: "${input.vertical}"\`\n`;
    }
  }

  return result;
}

function formatValidationError(error: z.ZodError): string {
  const issues = error.errors.map(e => `- ${e.path.join('.')}: ${e.message}`).join('\n');
  return `❌ **Invalid Input**\n\n${issues}\n\nPlease provide at least one filter (solution, segment, or vertical).`;
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

function formatStatus(status: string): string {
  const statusLabels: Record<string, string> = {
    'active': '✅ Active',
    'draft': '📝 Draft',
    'archived': '📦 Archived',
    'deprecated': '⚠️ Deprecated'
  };

  return statusLabels[status] || status;
}

function extractAllPlayTypes(playbooks: any[]): string[] {
  const allTypes = new Set<string>();

  playbooks.forEach(playbook => {
    if (playbook.playTypes) {
      playbook.playTypes.forEach((type: string) => allTypes.add(type));
    }
  });

  return Array.from(allTypes).map(formatPlayType);
}

function getPlayTypeDescription(playType: string): string {
  const descriptions: Record<string, string> = {
    'DISCOVERY': 'Understanding customer needs and qualification',
    'DEMO': 'Product demonstrations and feature showcases',
    'OBJECTION_HANDLING': 'Addressing customer concerns and objections',
    'COMPETITIVE_POSITIONING': 'Differentiating against competitors',
    'VALUE_PROPOSITION': 'Articulating ROI and business value',
    'TECHNICAL_DEEP_DIVE': 'Technical validation and architecture',
    'CONTENT_DELIVERY': 'Sharing collateral and supporting materials',
    'PROCESS': 'Workflows, POCs, and implementation procedures'
  };

  return descriptions[playType] || 'Sales play activities';
}