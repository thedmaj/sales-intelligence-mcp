import { z } from 'zod';
import { searchWorkflows } from '../data/demoData.js';
import { logger } from '../utils/logger.js';
import type { MCPTool } from './index.js';

const inputSchema = {
  type: "object",
  properties: {
    processType: {
      type: "string",
      description: "Type of process workflow to find",
      enum: ["poc", "implementation", "onboarding", "setup", "integration", "deployment"]
    },
    solution: {
      type: "string",
      description: "Filter by solution (e.g., Account Verification, Fraud Prevention, Payment Processing)"
    },
    includeRoles: {
      type: "boolean",
      description: "Include role assignments in workflow details",
      default: true
    }
  },
  required: ["processType"]
} as const;

const workflowSchema = z.object({
  processType: z.enum(["poc", "implementation", "onboarding", "setup", "integration", "deployment"]),
  solution: z.string().optional(),
  includeRoles: z.boolean().default(true)
});

async function handler(args: any, apiClient: any): Promise<string> {
  try {
    const input = workflowSchema.parse(args);

    // Use real API if available, otherwise fall back to demo data
    if (apiClient) {
      try {
        const apiResponse = await apiClient.request('/find_process_workflows', input);

        if (apiResponse.content && apiResponse.content.length > 0) {
          const responseText = apiResponse.content[0].text;
          try {
            const parsed = JSON.parse(responseText);
            return formatApiWorkflowResponse(parsed, input);
          } catch {
            return responseText; // Already formatted response
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const statusCode = (error as any).status || 'Unknown';
        const url = `${apiClient.config?.baseUrl || 'unknown'}/find_process_workflows`;

        logger.error(`API request failed for find_process_workflows:`, {
          error: message,
          url,
          status: statusCode,
          input
        });

        return `# API Connection Error\n\nFailed to connect to sales intelligence API:\n- **URL**: ${url}\n- **Error**: ${message}\n- **Status**: ${statusCode}\n\nFalling back to demo data...\n\n` +
               formatDemoWorkflowResponse(input);
      }
    }

    // Fallback to demo data
    return formatDemoWorkflowResponse(input);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatValidationError(error);
    }
    throw error;
  }
}

function formatDemoWorkflowResponse(input: any): string {
  const workflows = searchWorkflows(input.processType, {
    solution: input.solution
  });

  if (workflows.length === 0) {
    return formatNoWorkflowsFound(input.processType, input.solution);
  }

  return formatWorkflowResults(workflows, input);
}

function formatApiWorkflowResponse(data: any, input: any): string {
  if (data.processType && data.workflows) {
    return formatWorkflowResults(data.workflows, input);
  }
  return `# API Response Error\n\nReceived unexpected response format from API.\n\nFalling back to demo data...`;
}

function formatWorkflowResults(workflows: any[], input: any): string {
  const processTypeMap: Record<string, string> = {
    'poc': 'POC',
    'implementation': 'Implementation',
    'onboarding': 'Onboarding',
    'setup': 'Setup',
    'integration': 'Integration',
    'deployment': 'Deployment'
  };

  let response = `# Process Workflows: ${processTypeMap[input.processType]}\n\n`;

  response += `## Summary\n`;
  response += `Found ${workflows.length} ${input.processType} workflow${workflows.length === 1 ? '' : 's'}`;
  if (input.solution) {
    response += ` for ${input.solution}`;
  }
  response += `.\n\n`;

  response += `## Workflows\n\n`;

  workflows.forEach((workflow, index) => {
    response += `### ${index + 1}. ${workflow.name}\n`;
    response += `- **Solution**: ${workflow.solution.name}\n`;
    response += `- **Process Type**: ${workflow.processInfo.processType}\n`;

    if (input.includeRoles && workflow.processInfo.roles) {
      response += `- **Key Roles**: ${workflow.processInfo.roles.join(', ')}\n`;
    }

    response += `\n**Process Overview:**\n`;
    response += `${workflow.description}\n\n`;

    if (workflow.processInfo.steps && workflow.processInfo.steps.length > 0) {
      response += `**Detailed Steps:**\n`;
      workflow.processInfo.steps.forEach((step: string, stepIndex: number) => {
        response += `${stepIndex + 1}. ${step}\n`;
      });
      response += `\n`;
    }
  });

  // Add recommendations
  response += `## Recommendations\n\n`;
  response += `**For ${processTypeMap[input.processType]} Success:**\n`;

  if (input.processType === 'poc') {
    response += `- Define clear success criteria upfront\n`;
    response += `- Ensure data quality and representative sample size\n`;
    response += `- Schedule regular check-ins and progress reviews\n`;
    response += `- Plan for quick wins to maintain momentum\n`;
  } else if (input.processType === 'implementation') {
    response += `- Establish clear project governance and communication\n`;
    response += `- Plan for change management and user training\n`;
    response += `- Set up proper testing environments\n`;
    response += `- Define rollback procedures for risk mitigation\n`;
  } else if (input.processType === 'onboarding') {
    response += `- Provide comprehensive documentation and training\n`;
    response += `- Assign dedicated customer success resources\n`;
    response += `- Set clear expectations and timelines\n`;
    response += `- Schedule regular check-ins during initial period\n`;
  }

  response += `- Involve key stakeholders from both technical and business sides\n`;
  response += `- Document lessons learned for future improvements\n`;

  return response;
}

function formatNoWorkflowsFound(processType: string, solution?: string): string {
  let response = `# No ${processType.toUpperCase()} Workflows Found\n\n`;

  response += `No workflows found for ${processType}`;
  if (solution) {
    response += ` with ${solution}`;
  }
  response += `.\n\n`;

  response += `## Available Process Types\n\n`;
  response += `- **POC**: Proof of concept validation workflows\n`;
  response += `- **Implementation**: Full solution deployment processes\n`;
  response += `- **Onboarding**: Customer onboarding and setup procedures\n`;
  response += `- **Setup**: Initial configuration and setup workflows\n`;
  response += `- **Integration**: System integration procedures\n`;
  response += `- **Deployment**: Production deployment workflows\n\n`;

  response += `## General Process Framework\n\n`;
  response += `**For any ${processType} process, consider these phases:**\n`;
  response += `1. **Planning**: Define scope, requirements, and success criteria\n`;
  response += `2. **Preparation**: Set up environments, gather resources\n`;
  response += `3. **Execution**: Implement according to plan with regular checkpoints\n`;
  response += `4. **Validation**: Test and validate results against criteria\n`;
  response += `5. **Documentation**: Record outcomes and lessons learned\n`;

  return response;
}

function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue =>
    `- ${issue.path.join('.')}: ${issue.message}`
  ).join('\n');

  return `# Invalid Input\n\nPlease check the following:\n\n${issues}\n\n## Required Parameters\n- **processType**: Type of process workflow (poc, implementation, onboarding, setup, integration, deployment)\n\n## Optional Parameters\n- **solution**: Solution name filter\n- **includeRoles**: Include role assignments (default: true)`;
}

export const findProcessWorkflowsTool: MCPTool = {
  name: "find_process_workflows",
  description: "Find process workflows for POCs, implementations, onboarding, and other business processes. Get step-by-step guidance for various workflow types.",
  inputSchema,
  handler
};