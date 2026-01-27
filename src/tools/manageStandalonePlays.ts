import { z } from 'zod';
import { logger } from '../utils/logger.js';
import type { MCPTool } from './index.js';

const inputSchema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["create", "update", "associate_solutions", "add_to_playbook", "get_details"],
      description: "Action to perform on standalone plays"
    },
    playId: {
      type: "number",
      description: "ID of the standalone play (required for update, associate_solutions, add_to_playbook actions)"
    },
    playbookId: {
      type: "number",
      description: "ID of the playbook (required for add_to_playbook action)"
    },
    name: {
      type: "string",
      description: "Name of the play (required for create, optional for update)"
    },
    description: {
      type: "string",
      description: "Description of the play"
    },
    playType: {
      type: "string",
      enum: ["discovery", "demo", "technical", "business", "closing"],
      description: "Type of play"
    },
    status: {
      type: "string",
      enum: ["active", "inactive", "draft"],
      description: "Status of the play"
    },
    solutionIds: {
      type: "array",
      items: { type: "number" },
      description: "Array of solution IDs to associate with the play"
    },
    associationType: {
      type: "string",
      enum: ["reference", "copy"],
      description: "How to associate play with playbook: 'reference' (link to original) or 'copy' (duplicate content)"
    },
    sequenceOrder: {
      type: "number",
      description: "Position in playbook sequence when adding to playbook"
    },
    detectionConfig: {
      type: "object",
      description: "AI detection configuration for the play"
    }
  },
  required: ["action"],
  additionalProperties: false
} as const;

const managePlaySchema = z.object({
  action: z.enum(["create", "update", "associate_solutions", "add_to_playbook", "get_details"]),
  playId: z.number().optional(),
  playbookId: z.number().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  playType: z.enum(["discovery", "demo", "technical", "business", "closing"]).optional(),
  status: z.enum(["active", "inactive", "draft"]).optional(),
  solutionIds: z.array(z.number()).optional(),
  associationType: z.enum(["reference", "copy"]).optional(),
  sequenceOrder: z.number().optional(),
  detectionConfig: z.any().optional()
});

async function handler(args: any, apiClient: any): Promise<string> {
  try {
    const input = managePlaySchema.parse(args);

    // Validate required parameters for each action
    const validationResult = validateActionParameters(input);
    if (validationResult) {
      return validationResult;
    }

    // Use real API if available
    if (apiClient) {
      try {
        let apiResponse;
        let endpoint;
        let method;
        let body;

        switch (input.action) {
          case "create":
            endpoint = "/standalone-plays";
            method = "POST";
            body = {
              name: input.name,
              description: input.description,
              genericPlayType: input.playType,
              status: input.status || "active",
              detectionConfig: input.detectionConfig,
              solutionIds: input.solutionIds || []
            };
            break;

          case "update":
            endpoint = `/standalone-plays/${input.playId}`;
            method = "PUT";
            body = {} as any;
            if (input.name) body.name = input.name;
            if (input.description !== undefined) body.description = input.description;
            if (input.playType) body.genericPlayType = input.playType;
            if (input.status) body.status = input.status;
            if (input.detectionConfig) body.detectionConfig = input.detectionConfig;
            if (input.solutionIds) body.solutionIds = input.solutionIds;
            break;

          case "associate_solutions":
            endpoint = `/standalone-plays/${input.playId}/solutions`;
            method = "POST";
            body = { solutionIds: input.solutionIds };
            break;

          case "add_to_playbook":
            endpoint = `/playbooks/${input.playbookId}/standalone-plays`;
            method = "POST";
            body = {
              standalonePlayId: input.playId,
              associationType: input.associationType || "reference",
              sequenceOrder: input.sequenceOrder || 1
            };
            break;

          case "get_details":
            endpoint = `/standalone-plays/${input.playId}`;
            method = "GET";
            break;
        }

        apiResponse = await apiClient.request(endpoint, {
          method,
          ...(body && { data: body })
        });

        if (apiResponse.content && apiResponse.content.length > 0) {
          const responseText = apiResponse.content[0].text;
          try {
            const parsed = JSON.parse(responseText);
            return formatApiResponse(input.action, parsed, input);
          } catch {
            return responseText; // Already formatted response
          }
        }

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const statusCode = (error as any).status || 'Unknown';

        logger.error(`API request failed for standalone plays management:`, {
          error: message,
          action: input.action,
          playId: input.playId,
          status: statusCode
        });

        return formatApiError(input.action, message, statusCode, apiClient.config?.baseUrl);
      }
    }

    // No API available
    return formatNoApiResponse(input.action);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatValidationError(error);
    }
    throw error;
  }
}

function validateActionParameters(input: any): string | null {
  switch (input.action) {
    case "create":
      if (!input.name) {
        return formatMissingParameterError("create", "name", "Name is required when creating a new play");
      }
      break;

    case "update":
    case "associate_solutions":
    case "get_details":
      if (!input.playId) {
        return formatMissingParameterError(input.action, "playId", "Play ID is required for this action");
      }
      if (input.action === "associate_solutions" && !input.solutionIds) {
        return formatMissingParameterError("associate_solutions", "solutionIds", "Solution IDs array is required");
      }
      break;

    case "add_to_playbook":
      if (!input.playId) {
        return formatMissingParameterError("add_to_playbook", "playId", "Play ID is required");
      }
      if (!input.playbookId) {
        return formatMissingParameterError("add_to_playbook", "playbookId", "Playbook ID is required");
      }
      break;
  }

  return null;
}

function formatApiResponse(action: string, data: any, input: any): string {
  switch (action) {
    case "create":
      return formatCreateResponse(data);

    case "update":
      return formatUpdateResponse(data);

    case "associate_solutions":
      return formatSolutionAssociationResponse(data, input.solutionIds);

    case "add_to_playbook":
      return formatPlaybookAssociationResponse(data, input);

    case "get_details":
      return formatPlayDetailsResponse(data);

    default:
      return `# Operation Completed\n\nAction '${action}' completed successfully.`;
  }
}

function formatCreateResponse(data: any): string {
  if (!data.id) {
    return `# Creation Error\n\nFailed to create standalone play. Invalid response from server.`;
  }

  let response = `# ✅ Standalone Play Created\n\n`;
  response += `**Play ID**: ${data.id}\n`;
  response += `**Name**: ${data.name}\n`;

  if (data.description) {
    response += `**Description**: ${data.description}\n`;
  }

  if (data.genericPlayType) {
    response += `**Type**: ${formatPlayType(data.genericPlayType)}\n`;
  }

  response += `**Status**: ${formatStatus(data.status)}\n`;
  response += `**Created**: Just now\n\n`;

  response += `## Next Steps\n\n`;
  response += `1. **Associate Solutions**: Link this play to relevant solutions for better discoverability\n`;
  response += `2. **Add Content**: Use the platform UI to add detailed content and detection rules\n`;
  response += `3. **Add to Playbooks**: Associate this play with existing playbooks\n`;
  response += `4. **Set Permissions**: Configure team access (owner/editor/viewer roles)\n\n`;

  response += `## Usage Examples\n\n`;
  response += `- Associate with solutions: \`{"action": "associate_solutions", "playId": ${data.id}, "solutionIds": [1, 2, 3]}\`\n`;
  response += `- Add to playbook: \`{"action": "add_to_playbook", "playId": ${data.id}, "playbookId": 123, "associationType": "reference"}\`\n`;

  return response;
}

function formatUpdateResponse(data: any): string {
  let response = `# ✅ Standalone Play Updated\n\n`;
  response += `**Play ID**: ${data.id}\n`;
  response += `**Name**: ${data.name}\n`;

  if (data.description) {
    response += `**Description**: ${data.description}\n`;
  }

  if (data.genericPlayType) {
    response += `**Type**: ${formatPlayType(data.genericPlayType)}\n`;
  }

  response += `**Status**: ${formatStatus(data.status)}\n`;

  if (data.lastModifiedAt) {
    response += `**Last Modified**: ${formatDate(data.lastModifiedAt)}\n`;
  }

  response += `\n## Changes Saved\n\n`;
  response += `Your standalone play has been updated successfully. The changes are now available across all associated playbooks.\n`;

  return response;
}

function formatSolutionAssociationResponse(data: any, solutionIds: number[]): string {
  let response = `# ✅ Solution Associations Updated\n\n`;
  response += `Successfully associated the standalone play with ${solutionIds.length} solution${solutionIds.length === 1 ? '' : 's'}.\n\n`;

  response += `## Benefits\n\n`;
  response += `- **Enhanced Discoverability**: Play will appear in solution-specific searches\n`;
  response += `- **Smart Recommendations**: AI will suggest this play for relevant opportunities\n`;
  response += `- **Better Organization**: Content is now logically grouped by solution\n`;
  response += `- **Improved Analytics**: Track play effectiveness per solution\n\n`;

  response += `## What's Next\n\n`;
  response += `- The associations are active immediately\n`;
  response += `- AI recommendations will include this play for the associated solutions\n`;
  response += `- Team members can discover this play when browsing solutions\n`;

  return response;
}

function formatPlaybookAssociationResponse(data: any, input: any): string {
  let response = `# ✅ Play Added to Playbook\n\n`;

  const associationType = input.associationType || "reference";
  const associationLabel = associationType === "copy" ? "copied into" : "linked to";

  response += `The standalone play has been ${associationLabel} the playbook.\n\n`;

  response += `## Association Details\n\n`;
  response += `- **Type**: ${associationType === "copy" ? "📄 Copy" : "🔗 Reference"}\n`;
  response += `- **Position**: ${input.sequenceOrder ? `Position ${input.sequenceOrder}` : "Added to sequence"}\n`;

  if (associationType === "reference") {
    response += `- **Live Updates**: Changes to the standalone play will automatically appear in this playbook\n`;
  } else {
    response += `- **Independent Copy**: This copy can be modified without affecting the original play\n`;
  }

  response += `\n## Association Benefits\n\n`;

  if (associationType === "reference") {
    response += `**Reference Association:**\n`;
    response += `- ✅ Content stays synchronized across all playbooks\n`;
    response += `- ✅ Updates to the play automatically appear everywhere\n`;
    response += `- ✅ Maintains content consistency\n`;
    response += `- ✅ Easier maintenance and updates\n\n`;
  } else {
    response += `**Copy Association:**\n`;
    response += `- ✅ Playbook-specific customization possible\n`;
    response += `- ✅ No risk of unwanted changes from updates\n`;
    response += `- ✅ Full control over playbook content\n`;
    response += `- ✅ Isolated from original play changes\n\n`;
  }

  response += `## Management Tips\n\n`;
  response += `- Use **references** for standard content that should stay consistent\n`;
  response += `- Use **copies** when you need playbook-specific variations\n`;
  response += `- Monitor playbook performance to optimize play sequencing\n`;

  return response;
}

function formatPlayDetailsResponse(data: any): string {
  let response = `# Standalone Play Details\n\n`;

  response += `## Basic Information\n\n`;
  response += `- **ID**: ${data.id}\n`;
  response += `- **Name**: ${data.name}\n`;

  if (data.description) {
    response += `- **Description**: ${data.description}\n`;
  }

  if (data.genericPlayType) {
    response += `- **Type**: ${formatPlayType(data.genericPlayType)}\n`;
  }

  response += `- **Status**: ${formatStatus(data.status)}\n`;

  if (data.createdByUser) {
    response += `- **Created By**: ${data.createdByUser.name || data.createdByUser.email}\n`;
  }

  if (data.createdAt) {
    response += `- **Created**: ${formatDate(data.createdAt)}\n`;
  }

  if (data.lastModifiedAt) {
    response += `- **Last Modified**: ${formatDate(data.lastModifiedAt)}\n`;
  }

  // Solution associations
  if (data.solutions && data.solutions.length > 0) {
    response += `\n## Associated Solutions\n\n`;
    data.solutions.forEach((solution: any) => {
      response += `- **${solution.name}**`;
      if (solution.description) {
        response += `: ${solution.description}`;
      }
      response += `\n`;
    });
  }

  // Team permissions
  if (data.teamMembers && data.teamMembers.length > 0) {
    response += `\n## Team Access\n\n`;
    const owners = data.teamMembers.filter((m: any) => m.role === 'owner');
    const editors = data.teamMembers.filter((m: any) => m.role === 'editor');
    const viewers = data.teamMembers.filter((m: any) => m.role === 'viewer');

    if (owners.length > 0) {
      response += `**Owners**: ${owners.map((m: any) => m.user.name || m.user.email).join(', ')}\n`;
    }
    if (editors.length > 0) {
      response += `**Editors**: ${editors.map((m: any) => m.user.name || m.user.email).join(', ')}\n`;
    }
    if (viewers.length > 0) {
      response += `**Viewers**: ${viewers.map((m: any) => m.user.name || m.user.email).join(', ')}\n`;
    }
  }

  // Playbook associations
  if (data.playbookAssociations && data.playbookAssociations.length > 0) {
    response += `\n## Playbook Usage\n\n`;
    response += `This play is used in ${data.playbookAssociations.length} playbook${data.playbookAssociations.length === 1 ? '' : 's'}:\n\n`;
    data.playbookAssociations.forEach((assoc: any) => {
      response += `- **${assoc.playbook.name}** (${assoc.associationType === 'copy' ? 'Copy' : 'Reference'})\n`;
    });
  }

  // Detection configuration
  if (data.detectionConfig) {
    response += `\n## AI Detection\n\n`;
    response += `- **Detection Configured**: ✅ Yes\n`;
    response += `- **AI Recommendations**: This play can be automatically suggested for relevant opportunities\n`;
  } else {
    response += `\n## AI Detection\n\n`;
    response += `- **Detection Configured**: ❌ No\n`;
    response += `- **Recommendation**: Configure detection rules to enable AI-powered play suggestions\n`;
  }

  return response;
}

function formatApiError(action: string, message: string, statusCode: string, baseUrl?: string): string {
  let response = `# ❌ API Error\n\n`;
  response += `Failed to ${action.replace('_', ' ')} standalone play.\n\n`;
  response += `**Error Details:**\n`;
  response += `- **URL**: ${baseUrl || 'unknown'}\n`;
  response += `- **Status**: ${statusCode}\n`;
  response += `- **Message**: ${message}\n\n`;

  response += `## Troubleshooting\n\n`;
  response += `1. **Check API Connection**: Verify the platform is accessible\n`;
  response += `2. **Validate Permissions**: Ensure you have rights to perform this action\n`;
  response += `3. **Check Parameters**: Verify all required parameters are provided\n`;
  response += `4. **Contact Support**: If the error persists, contact your administrator\n\n`;

  // Action-specific troubleshooting
  switch (action) {
    case "create":
      response += `## Create Action Troubleshooting\n\n`;
      response += `- Verify the play name is unique\n`;
      response += `- Check that all required fields are provided\n`;
      response += `- Ensure you have permission to create plays\n`;
      break;

    case "update":
      response += `## Update Action Troubleshooting\n\n`;
      response += `- Verify the play ID exists\n`;
      response += `- Check that you have edit permissions for this play\n`;
      response += `- Ensure the play isn't being used in a way that prevents updates\n`;
      break;

    case "add_to_playbook":
      response += `## Playbook Association Troubleshooting\n\n`;
      response += `- Verify both play ID and playbook ID exist\n`;
      response += `- Check that you have edit permissions for the playbook\n`;
      response += `- Ensure the play isn't already associated with this playbook\n`;
      break;
  }

  return response;
}

function formatNoApiResponse(action: string): string {
  let response = `# API Connection Required\n\n`;
  response += `Cannot ${action.replace('_', ' ')} standalone plays - API connection is required.\n\n`;

  response += `## Required Setup\n\n`;
  response += `- **Platform Access**: Active connection to sales intelligence platform\n`;
  response += `- **Authentication**: Valid API credentials\n`;
  response += `- **Feature Access**: Standalone plays feature must be enabled\n`;
  response += `- **Permissions**: Appropriate user permissions for the requested action\n\n`;

  response += `## Action Requirements\n\n`;

  switch (action) {
    case "create":
      response += `**Creating Standalone Plays:**\n`;
      response += `- Requires content creation permissions\n`;
      response += `- Need access to solutions for associations\n`;
      response += `- Must be able to set team permissions\n`;
      break;

    case "update":
      response += `**Updating Standalone Plays:**\n`;
      response += `- Requires owner or editor permissions on the play\n`;
      response += `- Changes affect all associated playbooks (for references)\n`;
      response += `- May require solution association permissions\n`;
      break;

    case "associate_solutions":
      response += `**Associating Solutions:**\n`;
      response += `- Requires play edit permissions\n`;
      response += `- Need access to solution library\n`;
      response += `- Affects AI recommendation algorithms\n`;
      break;

    case "add_to_playbook":
      response += `**Adding to Playbooks:**\n`;
      response += `- Requires playbook edit permissions\n`;
      response += `- Need play access permissions\n`;
      response += `- Can choose reference or copy association type\n`;
      break;

    case "get_details":
      response += `**Viewing Play Details:**\n`;
      response += `- Requires read permissions on the play\n`;
      response += `- Shows full play information and relationships\n`;
      response += `- Includes usage across playbooks\n`;
      break;
  }

  response += `\n## Connect to Access Features\n\n`;
  response += `Once connected, you'll be able to:\n`;
  response += `- Create and manage reusable plays\n`;
  response += `- Associate plays with multiple playbooks\n`;
  response += `- Set up AI-powered content recommendations\n`;
  response += `- Collaborate with teams using role-based permissions\n`;

  return response;
}

function formatMissingParameterError(action: string, parameter: string, description: string): string {
  return `# Missing Required Parameter\n\n**Action**: ${action}\n**Missing**: ${parameter}\n**Description**: ${description}\n\n## Required Parameters for ${action}\n\n` +
         getActionParameters(action);
}

function getActionParameters(action: string): string {
  switch (action) {
    case "create":
      return `- **name** (required): Name of the new play\n- **description** (optional): Play description\n- **playType** (optional): discovery, demo, technical, business, or closing\n- **status** (optional): active, inactive, or draft (default: active)\n- **solutionIds** (optional): Array of solution IDs to associate\n- **detectionConfig** (optional): AI detection configuration`;

    case "update":
      return `- **playId** (required): ID of the play to update\n- **name** (optional): New name\n- **description** (optional): New description\n- **playType** (optional): New play type\n- **status** (optional): New status\n- **solutionIds** (optional): New solution associations\n- **detectionConfig** (optional): New detection configuration`;

    case "associate_solutions":
      return `- **playId** (required): ID of the play\n- **solutionIds** (required): Array of solution IDs to associate`;

    case "add_to_playbook":
      return `- **playId** (required): ID of the play\n- **playbookId** (required): ID of the target playbook\n- **associationType** (optional): "reference" or "copy" (default: reference)\n- **sequenceOrder** (optional): Position in playbook sequence`;

    case "get_details":
      return `- **playId** (required): ID of the play to retrieve`;

    default:
      return "No additional parameters required.";
  }
}

function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue =>
    `- ${issue.path.join('.')}: ${issue.message}`
  ).join('\n');

  return `# Invalid Input\n\nPlease check the following:\n\n${issues}\n\n## Available Actions\n\n` +
         `- **create**: Create a new standalone play\n` +
         `- **update**: Update an existing play\n` +
         `- **associate_solutions**: Associate play with solutions\n` +
         `- **add_to_playbook**: Add play to a playbook\n` +
         `- **get_details**: Get detailed information about a play\n\n` +
         `## Example Usage\n\n\`\`\`json\n{\n  "action": "create",\n  "name": "Enterprise Discovery Framework",\n  "description": "Comprehensive discovery questions for enterprise prospects",\n  "playType": "discovery",\n  "status": "active",\n  "solutionIds": [1, 2]\n}\n\`\`\``;
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export const manageStandalonePlaysTool: MCPTool = {
  name: "manage_standalone_plays",
  description: "Create, update, and manage standalone plays. Associate plays with solutions, add plays to playbooks, and configure team permissions. Supports full CRUD operations for reusable sales content.",
  inputSchema,
  handler
};