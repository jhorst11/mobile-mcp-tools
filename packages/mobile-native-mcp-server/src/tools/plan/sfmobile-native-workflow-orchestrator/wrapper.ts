/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { Tool } from '../../tool.js';
import { sfmobileNativeWorkflowOrchestrator, toolConfig } from './tool.js';

// Input schema for the orchestrator wrapper
const OrchestratorWrapperInputSchema = z.object({
  sessionId: z.string().optional().describe('Session ID for continuing an existing orchestration workflow'),
  action: z.enum(['start', 'continue', 'process-tool-result', 'process-human-response'])
    .describe('The action to perform: start new workflow, continue existing, process tool result, or process human response'),
  input: z.object({
    userRequest: z.string().describe('User\'s natural language request for the mobile app'),
    platform: z.enum(['iOS', 'Android']).describe('Target mobile platform - extract from user request (e.g., "iOS app" -> "iOS")'),
    connectedApp: z.object({
      clientId: z.string().optional().describe('Extract Salesforce Connected App Client ID from user request (starts with 3MVG9)'),
      callbackUri: z.string().optional().describe('Extract OAuth callback URI from user request (custom scheme format like myapp://oauth/callback)')
    }).optional().describe('Extract Salesforce Connected App credentials from user request if provided'),
    project: z.object({
      name: z.string().optional().describe('Extract project name from user request (e.g., "named ContactApp" -> "ContactApp")'),
      packageName: z.string().optional().describe('Generate package/bundle identifier from project name (e.g., com.company.contactapp)'),
      organizationName: z.string().optional().describe('Organization name (default to "My Company" if not specified)'),
      outputDirectory: z.string().optional().describe('Output directory path (use current directory if not specified)')
    }).optional().describe('Extract and structure project settings from user request')
  }).optional().describe('Initial orchestrator input (required for "start" action) - EXTRACT ALL AVAILABLE INFORMATION FROM USER REQUEST'),
  toolResult: z.object({
    ok: z.boolean().describe('Whether the tool execution was successful'),
    tool: z.string().describe('Name of the tool that was executed'),
    output: z.any().optional().describe('Tool output (if successful)'),
    error: z.object({
      type: z.string().describe('Error type'),
      message: z.string().describe('Error message')
    }).optional().describe('Error details (if failed)'),
    elapsedMs: z.number().optional().describe('Execution time in milliseconds')
  }).optional().describe('Tool execution result (required for "process-tool-result" action)'),
  humanResponse: z.object({
    kind: z.enum(['confirm-template', 'collect-credentials', 'confirm-project-settings'])
      .describe('Type of human response'),
    selectedTemplate: z.string().optional().describe('Selected template name (for confirm-template)'),
    clientId: z.string().optional().describe('Salesforce Client ID (for collect-credentials)'),
    callbackUri: z.string().optional().describe('OAuth callback URI (for collect-credentials)'),
    projectName: z.string().optional().describe('Project name (for confirm-project-settings)'),
    packageName: z.string().optional().describe('Package name (for confirm-project-settings)'),
    organizationName: z.string().optional().describe('Organization name (for confirm-project-settings)'),
    outputDirectory: z.string().optional().describe('Output directory (for confirm-project-settings)')
  }).optional().describe('Human response to orchestrator questions (required for "process-human-response" action)')
});

type OrchestratorWrapperInput = z.infer<typeof OrchestratorWrapperInputSchema>;

export class SfmobileNativeWorkflowOrchestratorTool implements Tool {
  public readonly name = 'Salesforce Mobile Native Workflow Orchestrator';
  public readonly title = 'Salesforce Mobile Native Workflow Orchestrator';
  public readonly toolId = 'sfmobile-native-workflow-orchestrator';
  public readonly description = 'PRIMARY TOOL: Use this tool first for ALL Salesforce mobile app development requests. Extract project details, credentials, and requirements from the user\'s natural language request and provide them in the structured input. For example, if user says "build iOS contact app named ContactApp with client ID 3MVG9... and callback myapp://oauth", extract these into the connectedApp and project fields. Orchestrates the complete workflow from user requirements to generated project.';
  public readonly inputSchema = OrchestratorWrapperInputSchema;

  public register(server: McpServer, annotations: ToolAnnotations): void {
    const enhancedAnnotations = {
      ...annotations,
      title: this.title,
      destructiveHint: true, // This tool can create projects and files
    };

    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      enhancedAnnotations,
      this.handleRequest.bind(this)
    );
  }

  private async handleRequest(input: OrchestratorWrapperInput) {
    try {
      const result = await sfmobileNativeWorkflowOrchestrator({
        sessionId: input.sessionId,
        action: input.action,
        input: input.input,
        toolResult: input.toolResult,
        humanResponse: input.humanResponse
      });

      // Format the response for MCP
      const responseText = this.formatResponse(result);

      return {
        content: [
          {
            type: 'text' as const,
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          },
        ],
      };
    }
  }

  private formatResponse(result: {
    sessionId: string;
    tick: any;
    instructions?: string;
  }): string {
    let response = `**Session ID:** \`${result.sessionId}\`\n\n`;
    
    if (result.instructions) {
      response += result.instructions + '\n\n';
    }

    // Add technical details for debugging
    response += '---\n\n';
    response += '**Technical Details:**\n';
    response += '```json\n';
    response += JSON.stringify({
      sessionId: result.sessionId,
      tick: result.tick
    }, null, 2);
    response += '\n```\n\n';

    // Add usage instructions
    if ('instruction' in result.tick) {
      response += '**Next Action:** Execute the specified tool with the provided input, then call this orchestrator again with `action: "process-tool-result"` and the tool\'s result.\n\n';
    } else if ('ask' in result.tick) {
      response += '**Next Action:** Provide the requested information by calling this orchestrator again with `action: "process-human-response"` and your response.\n\n';
    } else if ('completed' in result.tick && result.tick.completed) {
      response += '**Status:** Workflow completed successfully! 🎉\n\n';
    }

    return response;
  }
}
