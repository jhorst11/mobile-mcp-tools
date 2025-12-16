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
import { FEATURE_BRIEF_REVIEW_TOOL } from '../../../tools/prd/magi-prd-feature-brief-review/metadata.js';
import { MAGI_ARTIFACTS, getMagiPath } from '../../../utils/magiDirectory.js';
import z from 'zod';

export class PRDFeatureBriefReviewNode extends AbstractGuidanceNode<PRDState> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('featureBriefReview', nodeExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get the path to the feature brief file
    const featureBriefPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF
    );

    const guidanceData: NodeGuidanceData = {
      nodeId: 'featureBriefReview',
      taskPrompt: this.generateFeatureBriefReviewGuidance(featureBriefPath),
      taskInput: {
        featureBriefPath: featureBriefPath,
      },
      resultSchema: FEATURE_BRIEF_REVIEW_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: FEATURE_BRIEF_REVIEW_TOOL.description,
      },
    };

    const validatedResult = this.executeWithGuidance<typeof FEATURE_BRIEF_REVIEW_TOOL.resultSchema>(
      guidanceData
    );

    return this.processReviewResult(validatedResult, state);
  };

  private processReviewResult(
    validatedResult: z.infer<typeof FEATURE_BRIEF_REVIEW_TOOL.resultSchema>,
    _state: PRDState
  ): Partial<PRDState> {
    // Validate: If modifications are requested, approved must be false
    const hasModifications =
      validatedResult.modifications && validatedResult.modifications.length > 0;
    if (hasModifications && validatedResult.approved) {
      this.logger?.warn(
        'Invalid state: modifications requested but approved is true. Forcing approved to false.'
      );
      validatedResult.approved = false;
    }

    // Log the review outcome
    if (validatedResult.approved) {
      this.logger?.info(
        `Feature brief approved. Feedback will be applied by update tool to set status to approved.`
      );
    } else {
      this.logger?.info(
        `Feature brief requires modifications. Feedback will be applied by update tool.`
      );
    }

    // Return only the feedback - the update tool will handle file modifications
    return {
      isFeatureBriefApproved: validatedResult.approved,
      featureBriefModifications: validatedResult.modifications,
    };
  }

  private generateFeatureBriefReviewGuidance(featureBriefPath: string): string {
    return `
You are facilitating a feature brief review session with the user. Your role is to present the generated feature brief clearly and guide the user through the review process.

## Feature Brief to Review

The feature brief has been generated from the user's original request and is located at:

**File Path**: ${featureBriefPath}

## Review Process

Instruct the user to review the feature brief and provide feedback on whether it is approved or if modifications are needed. Ask the user to make a decision:

1. **APPROVE** - Accept the feature brief as-is and proceed to requirements generation
2. **REQUEST MODIFICATIONS** - Ask for specific changes to the feature brief before proceeding

## Review Questions

You should engage with the user to determine:
- Does the feature brief accurately capture the intended functionality?
- Is the scope and purpose clearly defined?
- Are there any missing elements or unclear sections?
- Would the user like to modify any specific parts?

## User Response Options

The user can respond in one of the following ways:
- **"I approve this feature brief"** or **"This looks good, proceed"** - Approve and proceed
- **"I need to modify [section]"** or **"Can we change..."** - Request modifications
- **"This doesn't match what I want"** - Request major revisions

## CRITICAL WORKFLOW RULES

**MANDATORY**: You MUST follow these rules exactly:

1. **You are ONLY collecting feedback** - Do NOT modify the feature brief file directly
2. **Return only the review decisions** - The workflow will apply these changes using a separate update tool
3. **Be specific** - For modifications, provide clear details about what sections need changes and what the new content should be

Begin the review process by reading the feature brief file and asking for the user's approval or requested modifications.
    `;
  }
}
