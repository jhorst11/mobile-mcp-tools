/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  AbstractGuidanceNode,
  Logger,
  NodeExecutor,
  NodeGuidanceData,
} from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';
import { FINISH_TOOL } from '../../tools/workflow/sfmobile-native-completion/metadata.js';

export class CompletionNode extends AbstractGuidanceNode<State> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('finish', nodeExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    const guidanceData: NodeGuidanceData = {
      nodeId: 'finish',
      taskPrompt: this.generateWorkflowCompletionGuidance(state),
      taskInput: {
        projectPath: state.projectPath,
      },
      resultSchema: FINISH_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: FINISH_TOOL.description,
      },
    };

    const validatedResult = this.executeWithGuidance<typeof FINISH_TOOL.resultSchema>(guidanceData);
    return validatedResult;
  };

  private generateWorkflowCompletionGuidance(state: State): string {
    return `
You are the tool that closes out the workflow. Let the user know that the workflow has
completed successfully, and tell them that they can find their project directory at
'${state.projectPath}'. Thank the user for participating in the workflow.
    `;
  }
}
