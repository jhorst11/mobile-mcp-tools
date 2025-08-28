/**
 * MCP Tool implementation for the SFMobile Native Workflow Orchestrator
 * Provides a stateful orchestration interface for coordinating template discovery and project generation
 */

import { z } from 'zod';
import { WorkflowOrchestrator } from './orchestrator.js';
import { OrchestratorInput, OrchestratorTick, ToolResult } from './types.js';

// Input validation schema
const OrchestratorInputSchema = z.object({
  userRequest: z.string().min(1, 'User request is required'),
  platform: z.enum(['iOS', 'Android'], {
    errorMap: () => ({ message: 'Platform must be either "iOS" or "Android"' })
  }),
  connectedApp: z.object({
    clientId: z.string().optional(),
    callbackUri: z.string().optional()
  }).optional(),
  project: z.object({
    name: z.string().optional(),
    packageName: z.string().optional(),
    organizationName: z.string().optional(),
    outputDirectory: z.string().optional()
  }).optional()
});

// Tool result schema for processing external tool responses
const ToolResultSchema = z.object({
  ok: z.boolean(),
  tool: z.string(),
  output: z.any().optional(),
  error: z.object({
    type: z.string(),
    message: z.string()
  }).optional(),
  elapsedMs: z.number().optional()
});

// Human response schema for processing user inputs
const HumanResponseSchema = z.object({
  kind: z.enum(['confirm-template', 'collect-credentials', 'confirm-project-settings']),
  selectedTemplate: z.string().optional(),
  clientId: z.string().optional(),
  callbackUri: z.string().optional(),
  projectName: z.string().optional(),
  packageName: z.string().optional(),
  organizationName: z.string().optional(),
  outputDirectory: z.string().optional()
});

// Global orchestrator instances (in a real implementation, this would use proper session management)
const orchestrators = new Map<string, WorkflowOrchestrator>();

/**
 * Creates a new orchestrator session or continues an existing one
 */
export async function sfmobileNativeWorkflowOrchestrator(args: {
  // Session management
  sessionId?: string;
  action: 'start' | 'continue' | 'process-tool-result' | 'process-human-response';
  
  // Initial input (for 'start' action)
  input?: unknown;
  
  // Tool result processing (for 'process-tool-result' action)
  toolResult?: unknown;
  
  // Human response processing (for 'process-human-response' action)
  humanResponse?: unknown;
}): Promise<{
  sessionId: string;
  tick: OrchestratorTick;
  instructions?: string;
}> {
  const sessionId = args.sessionId || generateSessionId();

  try {
    switch (args.action) {
      case 'start':
        return await handleStart(sessionId, args.input);
      
      case 'continue':
        return await handleContinue(sessionId);
      
      case 'process-tool-result':
        return await handleProcessToolResult(sessionId, args.toolResult);
      
      case 'process-human-response':
        return await handleProcessHumanResponse(sessionId, args.humanResponse);
      
      default:
        throw new Error(`Unknown action: ${args.action}`);
    }
  } catch (error) {
    // Clean up failed session
    orchestrators.delete(sessionId);
    throw error;
  }
}

async function handleStart(sessionId: string, input: unknown): Promise<{
  sessionId: string;
  tick: OrchestratorTick;
  instructions: string;
}> {
  // Validate input
  const validatedInput = OrchestratorInputSchema.parse(input) as OrchestratorInput;
  
  // Create new orchestrator
  const orchestrator = new WorkflowOrchestrator(validatedInput);
  orchestrators.set(sessionId, orchestrator);
  
  // Get initial tick
  const tick = orchestrator.tick();
  
  const instructions = generateInstructions(tick, validatedInput);
  
  return {
    sessionId,
    tick,
    instructions
  };
}

async function handleContinue(sessionId: string): Promise<{
  sessionId: string;
  tick: OrchestratorTick;
  instructions?: string;
}> {
  const orchestrator = orchestrators.get(sessionId);
  if (!orchestrator) {
    throw new Error(`No active orchestrator session found for ID: ${sessionId}`);
  }
  
  const tick = orchestrator.tick();
  const instructions = generateInstructions(tick, orchestrator.getState());
  
  return {
    sessionId,
    tick,
    instructions
  };
}

async function handleProcessToolResult(sessionId: string, toolResult: unknown): Promise<{
  sessionId: string;
  tick: OrchestratorTick;
  instructions?: string;
}> {
  const orchestrator = orchestrators.get(sessionId);
  if (!orchestrator) {
    throw new Error(`No active orchestrator session found for ID: ${sessionId}`);
  }
  
  // Validate tool result
  const validatedResult = ToolResultSchema.parse(toolResult) as ToolResult;
  
  // Process the result
  orchestrator.processToolResult(validatedResult);
  
  // Get next tick
  const tick = orchestrator.tick();
  const instructions = generateInstructions(tick, orchestrator.getState());
  
  return {
    sessionId,
    tick,
    instructions
  };
}

async function handleProcessHumanResponse(sessionId: string, humanResponse: unknown): Promise<{
  sessionId: string;
  tick: OrchestratorTick;
  instructions?: string;
}> {
  const orchestrator = orchestrators.get(sessionId);
  if (!orchestrator) {
    throw new Error(`No active orchestrator session found for ID: ${sessionId}`);
  }
  
  // Validate human response
  const validatedResponse = HumanResponseSchema.parse(humanResponse);
  
  // Process the response
  orchestrator.processHumanResponse(validatedResponse);
  
  // Get next tick
  const tick = orchestrator.tick();
  const instructions = generateInstructions(tick, orchestrator.getState());
  
  return {
    sessionId,
    tick,
    instructions
  };
}

function generateInstructions(tick: OrchestratorTick, state: any): string {
  if ('completed' in tick && tick.completed) {
    return `✅ **Workflow Completed Successfully!**

**Project Generated:** ${state.projectPath || 'Unknown path'}

**Next Steps:**
1. Navigate to the project directory
2. Open the project in your IDE (Xcode for iOS, Android Studio for Android)
3. Build and run the project to verify everything works
4. Customize the app according to your requirements

The project has been configured with your Salesforce Connected App credentials and is ready for development.`;
  }
  
  if ('instruction' in tick) {
    const { instruction } = tick;
    
    if (instruction.step === 'template-discovery') {
      return `🔍 **Discovering Templates**

I need to find the best Salesforce mobile template for your ${state.platform} app.

**User Request:** "${state.userRequest}"
**Platform:** ${state.platform}

Please run the following tool to discover available templates:
- **Tool:** ${instruction.tool}
- **Input:** ${JSON.stringify(instruction.input, null, 2)}

This will analyze your requirements and suggest the most appropriate template.`;
    }
    
    if (instruction.step === 'project-generation') {
      return `🏗️ **Generating Project**

Creating your ${state.platform} project with the selected template.

**Template:** ${state.selectedTemplate}
**Project Name:** ${state.project?.name}
**Package Name:** ${state.project?.packageName}

Please run the following tool to generate the project:
- **Tool:** ${instruction.tool}
- **Input:** ${JSON.stringify(instruction.input, null, 2)}

This will create the project files and configure OAuth settings.`;
    }
  }
  
  if ('ask' in tick) {
    const { ask } = tick;
    
    if (ask.kind === 'confirm-template') {
      const options = ask.options.map(opt => 
        `- **${opt.name}**${opt.reason ? `: ${opt.reason}` : ''}`
      ).join('\n');
      
      return `📋 **Template Selection Required**

Multiple templates are available for your ${state.platform} app. Please choose one:

${options}

${ask.recommended ? `**Recommended:** ${ask.recommended}` : ''}

Please respond with your selection using the \`process-human-response\` action.`;
    }
    
    if (ask.kind === 'collect-credentials') {
      const fields = ask.fields.map(field => 
        `- **${field.label}**${field.placeholder ? ` (e.g., ${field.placeholder})` : ''}`
      ).join('\n');
      
      return `🔐 **OAuth Credentials Required**

To configure your Salesforce Connected App, please provide:

${fields}

These credentials will be securely configured in your project for OAuth authentication.

Please respond with your credentials using the \`process-human-response\` action.`;
    }
    
    if (ask.kind === 'confirm-project-settings') {
      const { draft } = ask;
      
      return `⚙️ **Project Settings Confirmation**

Please review and confirm your project settings:

- **Project Name:** ${draft.projectName}
- **Package Name:** ${draft.packageName}
- **Organization:** ${draft.organizationName}
- **Output Directory:** ${draft.outputDirectory}

You can modify these settings or proceed with the defaults.

Please respond with your final settings using the \`process-human-response\` action.`;
    }
  }
  
  return 'Workflow in progress...';
}

function generateSessionId(): string {
  return `orchestrator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Export the tool configuration for MCP registration
export const toolConfig = {
  name: 'sfmobile-native-workflow-orchestrator',
  description: 'Orchestrates the end-to-end workflow for generating Salesforce mobile applications, coordinating template discovery and project generation with user interaction.',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID for continuing an existing orchestration workflow'
      },
      action: {
        type: 'string',
        enum: ['start', 'continue', 'process-tool-result', 'process-human-response'],
        description: 'The action to perform: start new workflow, continue existing, process tool result, or process human response'
      },
      input: {
        type: 'object',
        description: 'Initial orchestrator input (required for "start" action)',
        properties: {
          userRequest: {
            type: 'string',
            description: 'User\'s natural language request for the mobile app'
          },
          platform: {
            type: 'string',
            enum: ['iOS', 'Android'],
            description: 'Target mobile platform'
          },
          connectedApp: {
            type: 'object',
            description: 'Optional pre-filled Salesforce Connected App credentials',
            properties: {
              clientId: {
                type: 'string',
                description: 'Salesforce Connected App Client ID (starts with 3MVG9)'
              },
              callbackUri: {
                type: 'string',
                description: 'OAuth callback URI (custom scheme format)'
              }
            }
          },
          project: {
            type: 'object',
            description: 'Optional pre-filled project settings',
            properties: {
              name: {
                type: 'string',
                description: 'Project name'
              },
              packageName: {
                type: 'string',
                description: 'Package/bundle identifier'
              },
              organizationName: {
                type: 'string',
                description: 'Organization name'
              },
              outputDirectory: {
                type: 'string',
                description: 'Output directory path'
              }
            }
          }
        }
      },
      toolResult: {
        type: 'object',
        description: 'Tool execution result (required for "process-tool-result" action)',
        properties: {
          ok: {
            type: 'boolean',
            description: 'Whether the tool execution was successful'
          },
          tool: {
            type: 'string',
            description: 'Name of the tool that was executed'
          },
          output: {
            description: 'Tool output (if successful)'
          },
          error: {
            type: 'object',
            description: 'Error details (if failed)',
            properties: {
              type: {
                type: 'string',
                description: 'Error type'
              },
              message: {
                type: 'string',
                description: 'Error message'
              }
            }
          }
        }
      },
      humanResponse: {
        type: 'object',
        description: 'Human response to orchestrator questions (required for "process-human-response" action)',
        properties: {
          kind: {
            type: 'string',
            enum: ['confirm-template', 'collect-credentials', 'confirm-project-settings'],
            description: 'Type of human response'
          },
          selectedTemplate: {
            type: 'string',
            description: 'Selected template name (for confirm-template)'
          },
          clientId: {
            type: 'string',
            description: 'Salesforce Client ID (for collect-credentials)'
          },
          callbackUri: {
            type: 'string',
            description: 'OAuth callback URI (for collect-credentials)'
          },
          projectName: {
            type: 'string',
            description: 'Project name (for confirm-project-settings)'
          },
          packageName: {
            type: 'string',
            description: 'Package name (for confirm-project-settings)'
          },
          organizationName: {
            type: 'string',
            description: 'Organization name (for confirm-project-settings)'
          },
          outputDirectory: {
            type: 'string',
            description: 'Output directory (for confirm-project-settings)'
          }
        }
      }
    },
    required: ['action']
  }
};
