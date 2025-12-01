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
import { PRDState } from '../metadata.js';
import { getMagiPath, MAGI_ARTIFACTS } from '../../../utils/magiDirectory.js';
import { PRD_REVIEW_RESULT_SCHEMA } from '../../../tools/prd/shared/prdSchemas.js';

export class PRDReviewNode extends AbstractGuidanceNode<PRDState> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('prdReview', nodeExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    if (!state.projectPath || !state.featureId) {
      throw new Error(
        'PRD review requires both projectPath and featureId to be set in state. Cannot proceed without valid paths.'
      );
    }

    const prdFilePath = getMagiPath(state.projectPath, state.featureId, MAGI_ARTIFACTS.PRD);

    const resultSchema = PRD_REVIEW_RESULT_SCHEMA;

    const guidanceData: NodeGuidanceData = {
      nodeId: 'prdReview',
      taskPrompt: this.generatePRDReviewGuidance(prdFilePath),
      taskInput: {
        prdFilePath: prdFilePath,
      },
      resultSchema: resultSchema,
      metadata: {
        nodeName: this.name,
        description: 'Review the generated PRD with the user',
      },
    };

    const validatedResult = this.executeWithGuidance(guidanceData);

    // Store review feedback in state for the update node to process
    return {
      isPrdApproved: validatedResult.approved,
      prdModifications: validatedResult.modifications,
    };
  };

  private generatePRDReviewGuidance(prdFilePath: string): string {
    return `
You are facilitating a PRD review session with the user. Your role is to present the generated Product Requirements Document clearly and guide the user through the review process.

## Generated PRD Document

**File Path**: ${prdFilePath}

Instruct the user to review the file from the path above and use it to conduct the review session.

## Review Process

Present the PRD document clearly and ask the user to review it thoroughly. For the review, you should:

1. **Display the PRD** in a clear, readable format
2. **Ask for user decision** - approve as-is, request modifications, or reject
3. **If modifications are requested**, ask what specific changes they want to make
4. **Record the decision** and any modification details
5. **Capture feedback** on the overall quality and completeness

## Review Guidelines

The user should consider:
- **Completeness**: Does the PRD cover all necessary aspects of the feature?
- **Clarity**: Are the requirements clear and understandable?
- **Accuracy**: Do the requirements accurately reflect the intended feature?
- **Traceability**: Is the traceability table properly structured?
- **Formatting**: Is the document well-formatted and professional?

## Decision Options

1. **APPROVE**: Accept the PRD as-is and proceed to finalization
2. **MODIFY**: Request specific changes to sections of the PRD
3. **REJECT**: Reject the PRD and request a complete revision

## CRITICAL WORKFLOW RULES

**MANDATORY**: You MUST follow these rules exactly:

1. **You are ONLY collecting feedback** - Do NOT modify the PRD file directly
2. **Return only the review decisions** - The workflow will apply these changes using a separate update tool
3. **Be specific** - For modifications, provide clear details about what sections need changes and what the new content should be

## Important Notes

- **Approved PRD** will proceed to finalization and become the official requirements document
- **Modified PRD** will be updated with requested changes and may require another review
- **Rejected PRD** will require significant revision and regeneration
- All decisions should be clearly documented for future reference

**Remember**: You are collecting feedback only. Do NOT return updated PRD content. Return only the review decisions as specified in the output format.

Begin the review process by reading the PRD file and asking for the user's decision.
    `;
  }
}
