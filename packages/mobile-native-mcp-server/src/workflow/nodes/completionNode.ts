/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import {
  AbstractGuidanceNode,
  Logger,
  NodeExecutor,
  NodeGuidanceData,
} from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';

export class CompletionNode extends AbstractGuidanceNode<State> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('finish', nodeExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    // Create guidance data (new architecture - no tool invocation)
    const guidanceData: NodeGuidanceData = {
      nodeId: 'workflowCompletion',
      taskPrompt: this.generateWorkflowCompletionGuidance(state.projectPath),
      taskInput: {
        projectPath: state.projectPath,
      },
      resultSchema: z.object({}),
      metadata: {
        nodeName: this.name,
        description: 'Complete the workflow and inform the user',
      },
    };

    const validatedResult = this.executeWithGuidance(guidanceData);
    return validatedResult;
  };

  /**
   * Generate the task prompt for workflow completion
   * This is the guidance that was previously in the MCP tool
   */
  private generateWorkflowCompletionGuidance(projectPath: string): string {
    return `
You are the tool that closes out the workflow. Let the user know that the workflow has
completed successfully, and tell them that they can find their project directory at
'${projectPath}'. Thank the user for participating in the workflow.
    `;
  }
}
