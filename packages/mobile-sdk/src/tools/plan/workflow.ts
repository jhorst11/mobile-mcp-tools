/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { Tool } from '../tool.js';
import {
  WorkflowPlannerRequest,
  WorkflowPlannerResponse,
  type WorkflowPlannerRequestType,
  type WorkflowTodoItemType,
  type WorkflowUtilityToolType,
} from '../../schemas/mobileSdkSchema.js';
import { FileUtils } from '../../utils/fileUtils.js';
import { resolve } from 'path';

export class PlanWorkflowTool implements Tool {
  readonly name = 'Plan Workflow';
  readonly toolId = 'plan-workflow';
  readonly description =
    'Analyzes user goals and generates structured, transparent workflow plans for Mobile SDK development tasks.';
  readonly inputSchema = WorkflowPlannerRequest;
  readonly outputSchema = WorkflowPlannerResponse;

  private async analyzeCurrentContext(context?: {
    projectPath?: string;
    platform?: 'ios' | 'android' | 'react-native';
    hasConnectedApp?: boolean;
    isConfigured?: boolean;
  }) {
    if (!context?.projectPath) {
      return {
        hasProject: false,
        platform: undefined,
        hasConnectedApp: false,
        isConfigured: false,
      };
    }

    try {
      const projectPath = resolve(context.projectPath);
      const hasProject = await FileUtils.exists(projectPath);

      if (!hasProject) {
        return {
          hasProject: false,
          platform: undefined,
          hasConnectedApp: false,
          isConfigured: false,
        };
      }

      // Detect platform
      let detectedPlatform: 'ios' | 'android' | 'react-native' | undefined;

      const files = await FileUtils.readDirectory(projectPath);
      if (files.some(file => file.endsWith('.xcodeproj') || file.endsWith('.xcworkspace'))) {
        detectedPlatform = 'ios';
      } else if (files.includes('android') || files.some(file => file.includes('gradle'))) {
        detectedPlatform = 'android';
      } else if (files.includes('package.json')) {
        detectedPlatform = 'react-native';
      }

      // Check for configuration files
      let hasConnectedApp = false;
      let isConfigured = false;

      if (detectedPlatform === 'ios') {
        const bootconfigPath = resolve(projectPath, 'bootconfig.plist');
        const infoPlistPaths = [
          resolve(projectPath, 'Info.plist'),
          resolve(projectPath, `${projectPath.split('/').pop()}/Info.plist`),
        ];

        hasConnectedApp = await FileUtils.exists(bootconfigPath);
        isConfigured =
          hasConnectedApp &&
          (await Promise.all(infoPlistPaths.map(p => FileUtils.exists(p)))).some(exists => exists);
      }

      return {
        hasProject: true,
        platform: context.platform || detectedPlatform,
        hasConnectedApp: context.hasConnectedApp || hasConnectedApp,
        isConfigured: context.isConfigured || isConfigured,
      };
    } catch (error) {
      console.error('Error analyzing project context:', error);
      return {
        hasProject: false,
        platform: undefined,
        hasConnectedApp: false,
        isConfigured: false,
      };
    }
  }

  private generateNewAppWorkflow(
    platform: 'ios' | 'android' | 'react-native' | undefined,
    userExperience: 'beginner' | 'intermediate' | 'expert',
    includeOptionalSteps: boolean
  ): { todos: WorkflowTodoItemType[]; estimatedTime: string } {
    const todos: WorkflowTodoItemType[] = [
      {
        id: 'check-env',
        title: 'Verify Development Environment',
        description: 'Ensure Node.js, Git, and platform tools are installed and up-to-date',
        status: 'pending',
        dependencies: [],
        toolCall: 'plan-environment',
        estimatedMinutes: 2,
        rationale: 'Prevents build failures later by catching missing tools early',
      },
      {
        id: 'connected-app-guidance',
        title: 'Get Connected App Creation Guidance',
        description: 'Receive step-by-step instructions for creating Salesforce Connected App',
        status: 'pending',
        dependencies: ['check-env'],
        toolCall: 'create-connected-app',
        estimatedMinutes: 5,
        rationale: 'Connected App provides OAuth credentials needed for mobile authentication',
      },
      {
        id: 'create-connected-app',
        title: 'Create Connected App in Salesforce UI',
        description: 'Manually create Connected App following provided guidance',
        status: 'pending',
        dependencies: ['connected-app-guidance'],
        manualStep: true,
        estimatedMinutes: 10,
        rationale: 'Manual creation ensures proper OAuth configuration and security settings',
      },
      {
        id: 'validate-credentials',
        title: 'Validate Connected App Credentials',
        description: 'Verify Consumer Key and Callback URL format and compatibility',
        status: 'pending',
        dependencies: ['create-connected-app'],
        toolCall: 'create-connected-app',
        estimatedMinutes: 1,
        rationale: 'Catches credential format errors before project configuration',
      },
      {
        id: 'scaffold-project',
        title: `Create ${platform ? platform.toUpperCase() : 'Mobile'} Project Structure`,
        description: 'Generate project using intelligent template selection',
        status: 'pending',
        dependencies: ['validate-credentials'],
        toolCall: 'create-project',
        estimatedMinutes: 5,
        rationale: 'Template selection ensures proper architecture and best practices',
      },
      {
        id: 'configure-oauth',
        title: 'Configure OAuth Credentials',
        description: 'Inject Connected App credentials into project configuration files',
        status: 'pending',
        dependencies: ['scaffold-project', 'validate-credentials'],
        toolCall: 'create-configuration',
        estimatedMinutes: 2,
        rationale: 'Links Salesforce authentication to mobile app project',
      },
      {
        id: 'validate-setup',
        title: 'Build and Test Authentication',
        description: 'Build app, deploy to simulator, and verify login flow works',
        status: 'pending',
        dependencies: ['configure-oauth'],
        toolCall: 'build-project',
        estimatedMinutes: 10,
        rationale: 'Validates entire setup before custom development begins',
      },
    ];

    // Add optional steps for beginners
    if (userExperience === 'beginner' && includeOptionalSteps) {
      todos.splice(1, 0, {
        id: 'list-simulators',
        title: 'Check Available Simulators',
        description: 'List available iOS/Android simulators for testing',
        status: 'pending',
        dependencies: ['check-env'],
        toolCall: 'simulator-list-devices',
        optional: true,
        estimatedMinutes: 1,
        rationale: 'Ensures you have a working simulator for testing',
      });
    }

    const totalMinutes = todos.reduce((sum, todo) => sum + (todo.estimatedMinutes || 0), 0);
    const estimatedTime = `${Math.floor(totalMinutes / 60) > 0 ? Math.floor(totalMinutes / 60) + 'h ' : ''}${totalMinutes % 60}min`;

    return { todos, estimatedTime };
  }

  private generateEnhanceAppWorkflow(
    goal: string,
    platform: 'ios' | 'android' | 'react-native' | undefined
  ): { todos: WorkflowTodoItemType[]; estimatedTime: string } {
    const isOfflineSync =
      goal.toLowerCase().includes('offline') || goal.toLowerCase().includes('sync');
    const isCustomAuth =
      goal.toLowerCase().includes('auth') || goal.toLowerCase().includes('login');

    const todos: WorkflowTodoItemType[] = [
      {
        id: 'analyze-project',
        title: 'Analyze Current Project Structure',
        description: 'Detect platform, template type, and current configuration',
        status: 'pending',
        dependencies: [],
        toolCall: 'build-run-on-simulator',
        estimatedMinutes: 2,
        rationale: 'Understand current architecture before adding features',
      },
    ];

    if (isOfflineSync) {
      todos.push(
        {
          id: 'generate-sync-code',
          title: 'Generate MobileSync Implementation',
          description: 'Create files for offline data synchronization',
          status: 'pending',
          dependencies: ['analyze-project'],
          manualStep: true,
          estimatedMinutes: 15,
          rationale: 'Custom business logic requires LLM generation based on data model',
        },
        {
          id: 'integrate-files',
          title: 'Add Files to Project',
          description: 'Integrate generated files into build system',
          status: 'pending',
          dependencies: ['generate-sync-code'],
          toolCall: platform === 'ios' ? 'create-add-files' : 'build-project',
          estimatedMinutes: 2,
          rationale: 'Ensures new code is compiled and linked properly',
        }
      );
    } else if (isCustomAuth) {
      todos.push(
        {
          id: 'generate-auth-code',
          title: 'Generate Custom Authentication UI',
          description: 'Create custom login screen components',
          status: 'pending',
          dependencies: ['analyze-project'],
          manualStep: true,
          estimatedMinutes: 20,
          rationale: 'Custom UI requires design and branding considerations',
        },
        {
          id: 'integrate-files',
          title: 'Add Files to Project',
          description: 'Integrate authentication files into build system',
          status: 'pending',
          dependencies: ['generate-auth-code'],
          toolCall: platform === 'ios' ? 'create-add-files' : 'build-project',
          estimatedMinutes: 2,
          rationale: 'Ensures new authentication code is properly integrated',
        }
      );
    } else {
      todos.push(
        {
          id: 'generate-feature-code',
          title: 'Generate Feature Implementation',
          description: 'Create files for the requested functionality',
          status: 'pending',
          dependencies: ['analyze-project'],
          manualStep: true,
          estimatedMinutes: 15,
          rationale: 'Custom features require specific implementation based on requirements',
        },
        {
          id: 'integrate-files',
          title: 'Add Files to Project',
          description: 'Integrate generated files into build system',
          status: 'pending',
          dependencies: ['generate-feature-code'],
          toolCall: platform === 'ios' ? 'create-add-files' : 'build-project',
          estimatedMinutes: 2,
          rationale: 'Ensures new feature code is compiled and accessible',
        }
      );
    }

    todos.push({
      id: 'test-integration',
      title: 'Build and Test Enhanced App',
      description: 'Verify new functionality works correctly',
      status: 'pending',
      dependencies: ['integrate-files'],
      toolCall: 'build-run-on-simulator',
      estimatedMinutes: 5,
      rationale: 'Validates that new features integrate without breaking existing functionality',
    });

    const totalMinutes = todos.reduce((sum, todo) => sum + (todo.estimatedMinutes || 0), 0);
    const estimatedTime = `${Math.floor(totalMinutes / 60) > 0 ? Math.floor(totalMinutes / 60) + 'h ' : ''}${totalMinutes % 60}min`;

    return { todos, estimatedTime };
  }

  private getUtilityTools(
    platform: 'ios' | 'android' | 'react-native' | undefined
  ): WorkflowUtilityToolType[] {
    const commonTools: WorkflowUtilityToolType[] = [
      {
        name: 'List Available Simulators',
        description: 'Shows all simulators/emulators and their current status',
        toolId: 'plan-devices',
        useCase: 'Choose specific device for testing',
      },
      {
        name: 'Start Simulator',
        description: 'Boots up a specific simulator/emulator device',
        toolId: 'deploy-simulator',
        useCase: 'Ensure target device is running before build',
      },
      {
        name: 'Read Build Logs',
        description: 'Stream and access build logs and project artifacts',
        toolId: 'debug-logs',
        useCase: 'Debug build failures or monitor compilation progress',
      },
    ];

    if (platform === 'ios') {
      commonTools.push({
        name: 'Add Files to Project',
        description: 'Integrates LLM-generated source files into project build system',
        toolId: 'create-add-files',
        useCase: 'After generating custom Swift code during development',
      });
    }

    return commonTools;
  }

  private async handleRequest(params: WorkflowPlannerRequestType) {
    try {
      const context = await this.analyzeCurrentContext(params.currentContext);
      const userExperience = params.userExperience || 'intermediate';
      const includeOptionalSteps = params.preferences?.includeOptionalSteps ?? true;

      // Determine workflow type
      const isNewApp =
        !context.hasProject ||
        params.goal.toLowerCase().includes('create') ||
        params.goal.toLowerCase().includes('new');

      let todos: WorkflowTodoItemType[];
      let estimatedTime: string;
      let summary: string;

      if (isNewApp) {
        const result = this.generateNewAppWorkflow(
          context.platform,
          userExperience,
          includeOptionalSteps
        );
        todos = result.todos;
        estimatedTime = result.estimatedTime;
        summary = 'Complete Mobile SDK app setup from environment validation to authenticated app';
      } else {
        const result = this.generateEnhanceAppWorkflow(params.goal, context.platform);
        todos = result.todos;
        estimatedTime = result.estimatedTime;
        summary = 'Enhance existing app with new functionality';
      }

      const utilityTools = this.getUtilityTools(context.platform);
      const nextAction =
        todos.length > 0
          ? `Execute '${todos[0].id}' step to begin workflow`
          : 'No actions required';

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                goal: params.goal,
                summary,
                estimatedTime,
                todos,
                utilityTools,
                nextAction,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: false,
                error: `Error generating workflow plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  public register(server: McpServer, annotations: ToolAnnotations): void {
    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      annotations,
      this.handleRequest.bind(this)
    );
  }
}
