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
import { PRDState } from '../metadata.js';

export class PRDFailureNode extends AbstractGuidanceNode<PRDState> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('prdFailure', nodeExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const guidanceData: NodeGuidanceData = {
      nodeId: 'prdFailure',
      taskPrompt: this.generatePRDFailureGuidance(state.prdWorkflowFatalErrorMessages || []),
      taskInput: {
        messages: state.prdWorkflowFatalErrorMessages || [],
      },
      resultSchema: z.object({}),
      metadata: {
        nodeName: this.name,
        description: 'Communicate PRD workflow failure to the user',
      },
    };

    const validatedResult = this.executeWithGuidance(guidanceData);
    return validatedResult;
  };

  private generatePRDFailureGuidance(messages: string[]): string {
    return `
# ROLE
You are the tool that describes a failure of the PRD generation workflow to the user.

# TASK
Your task is to describe the failure of the PRD generation workflow to the user, along with supporting
evidence in the way of specific failure messages.

# CONTEXT
The following is the list of failure messages associated with the PRD generation workflow failure:

${this.makeFailureMessageList(messages)}

# INSTRUCTIONS
1. Describe the failure of the PRD generation workflow to the user, along with supporting
   evidence in the way of specific failure messages.
2. Do not add any extra conversation or pleasantries. Just describe the failure.
3. **NOTE:** These failures are non-recoverable. You should not spend time trying to fix
   them with the user. Simply describe and explain the failure(s) to the user, and advise them
   to fix the issues.
4. Continue with the completion of the workflow, based on the instructions below.
    `;
  }

  private makeFailureMessageList(messages: string[]): string {
    return messages.map(message => `- ${message}`).join('\n');
  }
}
