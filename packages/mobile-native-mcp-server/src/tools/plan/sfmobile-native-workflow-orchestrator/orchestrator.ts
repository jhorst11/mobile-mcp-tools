/**
 * Core orchestrator state machine implementation
 * Coordinates template discovery and project generation workflow
 */

import { randomUUID } from 'crypto';
import {
  OrchestratorInput,
  OrchestratorTick,
  WorkflowState,
  WorkflowNode,
  ToolResult,
  Instruction,
  AskHuman,
  TemplateDiscoveryOutput,
  ProjectGenerationOutput,
  CredField,
  ProjectDraft
} from './types.js';

export class WorkflowOrchestrator {
  private state: WorkflowState;
  private currentNode: WorkflowNode;
  private maxRetries = 2;

  constructor(input: OrchestratorInput) {
    this.state = {
      userRequest: input.userRequest,
      platform: input.platform,
      connectedApp: input.connectedApp,
      project: input.project,
      retries: {},
      workflowVersion: '1.0.0',
      artifacts: {}
    };
    this.currentNode = 'template-discovery';
  }

  /**
   * Execute the next step in the workflow
   */
  public tick(): OrchestratorTick {
    switch (this.currentNode) {
      case 'template-discovery':
        return this.handleTemplateDiscovery();
      case 'project-generation':
        return this.handleProjectGeneration();
      case 'completed':
        return { completed: true, state: this.state };
      default:
        throw new Error(`Unknown workflow node: ${this.currentNode}`);
    }
  }

  /**
   * Process tool result and update state
   */
  public processToolResult(result: ToolResult): void {
    this.state.lastToolResult = result;

    if (result.ok) {
      this.handleSuccessfulToolResult(result);
    } else {
      this.handleFailedToolResult(result);
    }
  }

  /**
   * Process human response and update state
   */
  public processHumanResponse(response: any): void {
    if (response.kind === 'confirm-template') {
      this.state.selectedTemplate = response.selectedTemplate;
      this.currentNode = 'project-generation';
    } else if (response.kind === 'collect-credentials') {
      this.state.connectedApp = {
        clientId: response.clientId,
        callbackUri: response.callbackUri
      };
    } else if (response.kind === 'confirm-project-settings') {
      this.state.project = {
        name: response.projectName,
        packageName: response.packageName,
        organizationName: response.organizationName,
        outputDirectory: response.outputDirectory
      };
    }
  }

  private handleTemplateDiscovery(): OrchestratorTick {
    // If we already have a selected template, move to next phase
    if (this.state.selectedTemplate) {
      this.currentNode = 'project-generation';
      return this.tick();
    }

    // If we have a failed result, handle retry logic
    if (this.state.lastToolResult && !this.state.lastToolResult.ok) {
      return this.handleRetryOrAbort('template-discovery');
    }

    // If we have successful discovery results, process them
    if (this.state.lastToolResult?.ok && this.state.lastToolResult.tool === 'sfmobile-native-template-discovery') {
      const output = this.state.lastToolResult.output as TemplateDiscoveryOutput;
      
      // Store discovery results in artifacts
      this.state.artifacts!.templateDiscovery = output;
      this.state.templateOptions = output.alternatives.map(alt => alt.name);

      // If only one option or clear recommendation, auto-select
      if (output.alternatives.length === 1) {
        this.state.selectedTemplate = output.alternatives[0].name;
        this.currentNode = 'project-generation';
        return this.tick();
      }

      // Ask human to confirm template selection
      const ask: AskHuman = {
        kind: 'confirm-template',
        options: output.alternatives,
        recommended: output.recommendedTemplate
      };

      return { ask, state: this.state };
    }

    // Emit instruction to run template discovery
    const instruction: Instruction = {
      step: 'template-discovery',
      tool: 'sfmobile-native-template-discovery',
      input: { platform: this.state.platform },
      timeoutMs: 30000,
      id: randomUUID()
    };

    return { instruction, state: this.state };
  }

  private handleProjectGeneration(): OrchestratorTick {
    // Check preconditions
    if (!this.state.selectedTemplate) {
      throw new Error('Cannot proceed to project generation without selected template');
    }

    // If we have a failed result, handle retry logic
    if (this.state.lastToolResult && !this.state.lastToolResult.ok) {
      return this.handleRetryOrAbort('project-generation');
    }

    // If we have successful generation results, we're done
    if (this.state.lastToolResult?.ok && this.state.lastToolResult.tool === 'sfmobile-native-project-generation') {
      const output = this.state.lastToolResult.output as ProjectGenerationOutput;
      this.state.projectPath = output.projectPath;
      this.state.completed = true;
      this.currentNode = 'completed';
      return { completed: true, state: this.state };
    }

    // Check if we need credentials
    if (!this.state.connectedApp?.clientId || !this.state.connectedApp?.callbackUri) {
      const fields: CredField[] = [];
      
      if (!this.state.connectedApp?.clientId) {
        fields.push({
          key: 'clientId',
          label: 'Salesforce Connected App Client ID',
          placeholder: '3MVG9...',
          secret: true,
          validator: 'salesforceClientId'
        });
      }
      
      if (!this.state.connectedApp?.callbackUri) {
        fields.push({
          key: 'callbackUri',
          label: 'OAuth Callback URI',
          placeholder: 'myapp://oauth/callback',
          validator: 'uri'
        });
      }

      const ask: AskHuman = {
        kind: 'collect-credentials',
        fields
      };

      return { ask, state: this.state };
    }

    // Check if we need project settings
    if (!this.state.project?.name || !this.state.project?.packageName || 
        !this.state.project?.organizationName) {
      
      const draft: ProjectDraft = {
        projectName: this.state.project?.name || this.generateProjectName(),
        packageName: this.state.project?.packageName || this.generatePackageName(),
        organizationName: this.state.project?.organizationName || 'My Company',
        outputDirectory: this.state.project?.outputDirectory || process.cwd()
      };

      const ask: AskHuman = {
        kind: 'confirm-project-settings',
        draft
      };

      return { ask, state: this.state };
    }

    // All preconditions met, emit project generation instruction
    const instruction: Instruction = {
      step: 'project-generation',
      tool: 'sfmobile-native-project-generation',
      input: {
        selectedTemplate: this.state.selectedTemplate,
        projectName: this.state.project.name!,
        packageName: this.state.project.packageName!,
        organizationName: this.state.project.organizationName!,
        outputDirectory: this.state.project.outputDirectory || process.cwd(),
        platform: this.state.platform,
        connectedAppClientId: this.state.connectedApp.clientId!,
        connectedAppCallbackUri: this.state.connectedApp.callbackUri!
      },
      timeoutMs: 60000,
      id: randomUUID()
    };

    return { instruction, state: this.state };
  }

  private handleSuccessfulToolResult(result: ToolResult): void {
    // Reset retry count on success
    if (this.state.retries && result.tool) {
      delete this.state.retries[result.tool];
    }
  }

  private handleFailedToolResult(result: ToolResult): void {
    // Increment retry count
    if (!this.state.retries) {
      this.state.retries = {};
    }
    this.state.retries[result.tool] = (this.state.retries[result.tool] || 0) + 1;
  }

  private handleRetryOrAbort(step: string): OrchestratorTick {
    const retryCount = this.state.retries?.[step] || 0;
    
    if (retryCount >= this.maxRetries) {
      // Max retries exceeded, ask human to fix or abort
      const ask: AskHuman = {
        kind: 'collect-credentials', // This would be extended to handle retry/abort scenarios
        fields: []
      };
      return { ask, state: this.state };
    }

    // Retry the step
    return this.tick();
  }

  private generateProjectName(): string {
    // First check if name is explicitly provided in the request
    const nameMatch = this.state.userRequest.match(/name:\s*(\w+)/i);
    if (nameMatch) {
      return nameMatch[1];
    }
    
    // Extract meaningful name from user request
    const request = this.state.userRequest.toLowerCase();
    if (request.includes('contact')) return 'ContactApp';
    if (request.includes('account')) return 'AccountApp';
    if (request.includes('opportunity')) return 'OpportunityApp';
    return 'SalesforceApp';
  }

  private generatePackageName(): string {
    const projectName = this.generateProjectName().toLowerCase();
    return `com.mycompany.${projectName}`;
  }

  public getState(): WorkflowState {
    return { ...this.state };
  }

  public getCurrentNode(): WorkflowNode {
    return this.currentNode;
  }

}
