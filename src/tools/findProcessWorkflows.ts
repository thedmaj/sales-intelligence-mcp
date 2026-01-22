import { z } from 'zod';
import { ApiClient } from '../auth/apiClient.js';
import { logger } from '../utils/logger.js';

export const findProcessWorkflowsTool = {
  name: 'find_process_workflows',
  description: 'Search for process workflows, POC procedures, implementation guides, and step-by-step processes. Includes role assignments, timelines, and checkpoints.',
  inputSchema: {
    type: 'object',
    properties: {
      processType: {
        type: 'string',
        enum: ['poc', 'onboarding', 'implementation', 'evaluation', 'retro', 'all'],
        description: 'Type of process workflow: poc (Proof of Concept), onboarding (Client Onboarding), implementation (System Implementation), evaluation (Assessment Process), retro (Retrospective Analysis), all (All Types)'
      },
      solution: {
        type: 'string',
        description: 'Filter by solution context (e.g., "Account Verification", "Fraud Prevention")'
      },
      includeRoles: {
        type: 'boolean',
        default: true,
        description: 'Include role assignments and ownership information'
      },
      includeTimelines: {
        type: 'boolean',
        default: true,
        description: 'Include timeline and checkpoint information'
      }
    },
    required: ['processType'],
    additionalProperties: false
  },

  async handler(args: any, apiClient: ApiClient): Promise<string> {
    try {
      // Validate input
      const input = z.object({
        processType: z.enum(['poc', 'onboarding', 'implementation', 'evaluation', 'retro', 'all']),
        solution: z.string().optional(),
        includeRoles: z.boolean().default(true),
        includeTimelines: z.boolean().default(true)
      }).parse(args);

      logger.debug('Processing process workflow search', {
        processType: input.processType,
        solution: input.solution,
        includeRoles: input.includeRoles,
        includeTimelines: input.includeTimelines
      });

      // Make API request
      const response = await apiClient.request<{
        content: Array<{ type: string; text: string }>;
      }>('/find_process_workflows', input);

      // Parse the response
      const workflowData = JSON.parse(response.content[0].text);

      return formatProcessWorkflows(workflowData, input);

    } catch (error) {
      logger.error('Process workflow search failed', {
        error: error instanceof Error ? error.message : String(error),
        args
      });

      if (error instanceof z.ZodError) {
        return formatValidationError(error);
      }

      throw new Error(`Process workflow search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

function formatProcessWorkflows(data: any, input: any): string {
  const workflows = data.workflows || [];
  const processType = input.processType;
  const total = data.total || workflows.length;

  let result = `# ⚙️ Process Workflows: ${formatProcessTypeTitle(processType)}\n\n`;

  if (workflows.length === 0) {
    return formatNoWorkflowsFound(input);
  }

  result += `**Found:** ${total} ${processType === 'all' ? 'process' : processType} workflow${total !== 1 ? 's' : ''}\n`;

  if (input.solution) {
    result += `**Solution Context:** ${input.solution}\n`;
  }

  result += `\n---\n\n`;

  // Format each workflow
  workflows.forEach((workflow: any, index: number) => {
    result += formatSingleWorkflow(workflow, index + 1, input);
    result += `\n---\n\n`;
  });

  // Add summary insights
  if (workflows.length > 1) {
    result += `## 💡 Workflow Summary\n\n`;

    const processTypes = [...new Set(workflows.map((w: any) => w.processInfo?.processType).filter(Boolean))];
    if (processTypes.length > 0) {
      result += `**Process Types:** ${processTypes.join(', ')}\n`;
    }

    const solutions = [...new Set(workflows.map((w: any) => w.solution?.name).filter(Boolean))];
    if (solutions.length > 0) {
      result += `**Solutions Covered:** ${solutions.join(', ')}\n`;
    }

    if (input.includeRoles) {
      const allRoles = workflows.flatMap((w: any) => w.processInfo?.roles || []);
      const uniqueRoles = [...new Set(allRoles)];
      if (uniqueRoles.length > 0) {
        result += `**Roles Involved:** ${uniqueRoles.slice(0, 5).join(', ')}${uniqueRoles.length > 5 ? '...' : ''}\n`;
      }
    }

    result += `\n`;
  }

  // Usage recommendations
  result += `## 📋 How to Use These Workflows\n\n`;

  switch (processType) {
    case 'poc':
      result += `1. **Scoping:** Define POC success criteria and timeline\n`;
      result += `2. **Setup:** Follow step-by-step implementation guide\n`;
      result += `3. **Execution:** Track checkpoints and deliverables\n`;
      result += `4. **Evaluation:** Use defined success metrics\n`;
      result += `5. **Decision:** Move to full implementation or iterate\n`;
      break;

    case 'onboarding':
      result += `1. **Preparation:** Review client-specific requirements\n`;
      result += `2. **Kickoff:** Introduce team and set expectations\n`;
      result += `3. **Configuration:** Customize solution for client needs\n`;
      result += `4. **Training:** Enable client team on new processes\n`;
      result += `5. **Go-live:** Support transition to production\n`;
      break;

    case 'implementation':
      result += `1. **Planning:** Align on technical requirements\n`;
      result += `2. **Integration:** Connect with existing systems\n`;
      result += `3. **Testing:** Validate functionality and performance\n`;
      result += `4. **Deployment:** Roll out to production environment\n`;
      result += `5. **Monitoring:** Track performance and resolve issues\n`;
      break;

    case 'evaluation':
      result += `1. **Assessment:** Evaluate current state and requirements\n`;
      result += `2. **Analysis:** Identify gaps and opportunities\n`;
      result += `3. **Recommendation:** Propose solution approach\n`;
      result += `4. **Validation:** Confirm approach with stakeholders\n`;
      result += `5. **Next Steps:** Plan implementation roadmap\n`;
      break;

    case 'retro':
      result += `1. **Preparation:** Gather data and stakeholder input\n`;
      result += `2. **Analysis:** Review what worked and what didn't\n`;
      result += `3. **Insights:** Identify key learnings and patterns\n`;
      result += `4. **Improvements:** Define action items for future\n`;
      result += `5. **Documentation:** Capture knowledge for next time\n`;
      break;

    default:
      result += `1. **Review:** Understand the process requirements\n`;
      result += `2. **Plan:** Align on roles, timeline, and deliverables\n`;
      result += `3. **Execute:** Follow step-by-step procedures\n`;
      result += `4. **Track:** Monitor progress against checkpoints\n`;
      result += `5. **Optimize:** Improve process based on learnings\n`;
  }

  return result;
}

function formatSingleWorkflow(workflow: any, index: number, input: any): string {
  let result = `## ${index}. ${workflow.name}\n\n`;

  // Basic info
  if (workflow.solution?.name) {
    result += `**🛠️ Solution:** ${workflow.solution.name}\n`;
  }

  if (workflow.playbook?.name) {
    result += `**📚 Playbook:** ${workflow.playbook.name}\n`;
  }

  if (workflow.processInfo?.processType) {
    result += `**⚙️ Process Type:** ${workflow.processInfo.processType}\n`;
  }

  // Role assignments
  if (input.includeRoles && workflow.processInfo?.roles && workflow.processInfo.roles.length > 0) {
    result += `**👥 Key Roles:** ${workflow.processInfo.roles.join(', ')}\n`;
  }

  // Timeline information
  if (input.includeTimelines && workflow.processInfo?.timeline) {
    result += `**⏱️ Timeline:** ${workflow.processInfo.timeline}\n`;
  }

  result += `\n`;

  // Process steps
  if (workflow.processInfo?.steps && workflow.processInfo.steps.length > 0) {
    result += `**📝 Key Steps:**\n`;
    workflow.processInfo.steps.forEach((step: string, stepIndex: number) => {
      result += `${stepIndex + 1}. ${step}\n`;
    });
    result += `\n`;
  }

  // Full description
  if (workflow.description) {
    result += `**📄 Detailed Process:**\n\n`;
    result += formatProcessDescription(workflow.description);
    result += `\n`;
  }

  return result;
}

function formatProcessDescription(description: string): string {
  // Format the description with better structure
  let formatted = description;

  // Convert numbered lists to proper markdown
  formatted = formatted.replace(/(\d+\.\s)/g, '\n$1');

  // Convert bullet points
  formatted = formatted.replace(/([•\-\*])\s/g, '\n- ');

  // Clean up excessive newlines
  formatted = formatted.replace(/\n\n+/g, '\n\n');

  // Indent code blocks or structured content
  formatted = formatted.replace(/^(Process|Steps|Timeline|Owner):/gm, '**$1:**');

  return formatted.trim();
}

function formatNoWorkflowsFound(input: any): string {
  const processTypeLabel = formatProcessTypeTitle(input.processType);

  let result = `# 🔍 No ${processTypeLabel} Workflows Found\n\n`;

  if (input.solution) {
    result += `**Solution:** ${input.solution}\n`;
  }

  result += `**Process Type:** ${processTypeLabel}\n\n`;

  result += `No matching process workflows were found. Consider:\n\n`;
  result += `- **Expanding search:** Try "all" process types\n`;
  result += `- **Different keywords:** Use related process terms\n`;
  result += `- **Creating content:** This may indicate a gap in process documentation\n`;
  result += `- **Check spelling:** Verify solution names are correct\n\n`;

  // Suggest related process types
  const allTypes = ['poc', 'onboarding', 'implementation', 'evaluation', 'retro'];
  const otherTypes = allTypes.filter(type => type !== input.processType);

  if (otherTypes.length > 0) {
    result += `**Try These Process Types:**\n`;
    otherTypes.forEach(type => {
      result += `- \`${type}\`: ${getProcessTypeDescription(type)}\n`;
    });
  }

  return result;
}

function formatValidationError(error: z.ZodError): string {
  const issues = error.errors.map(e => `- ${e.path.join('.')}: ${e.message}`).join('\n');
  return `❌ **Invalid Input**\n\n${issues}\n\nValid process types: poc, onboarding, implementation, evaluation, retro, all`;
}

function formatProcessTypeTitle(processType: string): string {
  const titles: Record<string, string> = {
    'poc': 'POC (Proof of Concept)',
    'onboarding': 'Client Onboarding',
    'implementation': 'Implementation',
    'evaluation': 'Evaluation & Assessment',
    'retro': 'Retrospective Analysis',
    'all': 'All Process Types'
  };

  return titles[processType] || processType;
}

function getProcessTypeDescription(processType: string): string {
  const descriptions: Record<string, string> = {
    'poc': 'Proof of concept validation workflows',
    'onboarding': 'Client and user onboarding procedures',
    'implementation': 'System implementation and rollout processes',
    'evaluation': 'Assessment and evaluation procedures',
    'retro': 'Retrospective analysis and post-mortem processes'
  };

  return descriptions[processType] || 'Process workflow';
}