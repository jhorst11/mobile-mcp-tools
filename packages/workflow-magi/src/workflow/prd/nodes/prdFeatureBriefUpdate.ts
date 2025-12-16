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
import { FEATURE_BRIEF_UPDATE_TOOL } from '../../../tools/prd/magi-prd-feature-brief-update/metadata.js';

import { getMagiPath, writeMagiArtifact, MAGI_ARTIFACTS } from '../../../utils/magiDirectory.js';
import { FEATURE_BRIEF_REVIEW_TOOL } from '../../../tools/prd/magi-prd-feature-brief-review/metadata.js';
import z from 'zod';

export class PRDFeatureBriefUpdateNode extends AbstractGuidanceNode<PRDState> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('featureBriefUpdate', nodeExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // This node should only be called when modifications are requested (not approved)
    // The workflow routes approved reviews to the finalization node instead
    if (state.isFeatureBriefApproved) {
      throw new Error(
        'Feature brief update node should not be called for approved reviews. Route to finalization node instead.'
      );
    }

    // Get the path to the feature brief file
    const featureBriefPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF
    );

    // Construct review result from state
    const reviewResult: z.infer<typeof FEATURE_BRIEF_REVIEW_TOOL.resultSchema> = {
      approved: false, // Always false for update node
      modifications: state.featureBriefModifications,
    };

    const guidanceData: NodeGuidanceData = {
      nodeId: 'featureBriefUpdate',
      taskPrompt: this.generateFeatureBriefUpdateGuidance(featureBriefPath, reviewResult),
      taskInput: {
        featureBriefPath: featureBriefPath,
        reviewResult: reviewResult,
      },
      resultSchema: FEATURE_BRIEF_UPDATE_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: FEATURE_BRIEF_UPDATE_TOOL.description,
      },
    };

    const validatedResult = this.executeWithGuidance<typeof FEATURE_BRIEF_UPDATE_TOOL.resultSchema>(
      guidanceData
    );

    // Write the updated feature brief file with draft status
    // The tool should have already included the status section with "draft" status
    const updatedFeatureBriefPath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF,
      validatedResult.featureBriefMarkdown
    );
    this.logger?.info(
      `Updated feature brief written to file: ${updatedFeatureBriefPath} (status: draft)`
    );

    // Clear review state since we've processed the update
    // Content is now always read from file, so don't store in state
    return {
      // Keep the same featureId
      featureId: state.featureId,
      // Clear review state when generating new version
      isFeatureBriefApproved: undefined,
      featureBriefModifications: undefined,
    };
  };

  private generateFeatureBriefUpdateGuidance(
    featureBriefPath: string,
    reviewResult: z.infer<typeof FEATURE_BRIEF_REVIEW_TOOL.resultSchema>
  ): string {
    const hasModifications = reviewResult.modifications && reviewResult.modifications.length > 0;

    return `
# ROLE

You are a feature brief update tool. Your task is to revise an EXISTING feature brief based on requested modifications. This tool is ONLY used when modifications are requested (not for approvals). You must maintain the same feature ID and update the content based on the requested modifications.

# CONTEXT

## Feature Brief File to Update

**File Path**: ${featureBriefPath}

You should read the feature brief file from this path and update it based on the review feedback.

## Review Result

**Status**: draft

## Requested Modifications
${
  hasModifications
    ? JSON.stringify(reviewResult.modifications, null, 2)
    : 'No specific modifications requested - but changes are needed based on review feedback'
}

# TASK

You must update the feature brief to incorporate:
1. All requested modifications
2. Address any concerns or issues raised during the review

**CRITICAL REQUIREMENTS**:
- Read the feature brief file from the provided path
- Extract the feature ID from the existing brief (must be preserved in the output)
- Preserve the overall structure and intent of the original brief
- Incorporate changes naturally and coherently
- Ensure the updated brief addresses all modifications
- Keep the markdown formatting consistent
- **MUST include a Status section** with format: '## Status\n**Status**: draft' (near the top, after the title)
- The status should always be set to "draft" when updating the feature brief (since changes are being made)

# UPDATE GUIDELINES

1. **Review the existing content**: Understand what's already there
2. **Identify changes needed**: Based on requested modifications
3. **Apply changes systematically**:
   - Update specific sections as requested
   - Ensure consistency across the document
4. **Maintain coherence**: The updated brief should read as a unified document, not patched together

# OUTPUT REQUIREMENTS

Generate a COMPLETE, updated feature brief in Markdown format that:
- Includes all sections from the original (with updates applied)
- Incorporates all requested modifications
- Maintains professional formatting
- Preserves the feature ID from the original brief (extract from the file content)
- **MUST include a Status section** near the top (after the title) with: '## Status\n**Status**: draft'

**Output only the updated markdown content** - do not include explanations or metadata about the changes.

# EXAMPLES OF GOOD UPDATES

**Original**: "Users can change theme colors"
**Modification Request**: "Need to support brand identity colors specifically"
**Updated**: "Users can change theme colors, with support for brand identity color palettes that maintain visual consistency with company branding guidelines"

**Original Section**: "Basic navigation"
**Modification Request**: "Add support for accessibility navigation modes"
**Updated Section**: "Navigation supports standard modes as well as accessibility-focused navigation modes including screen reader optimization and keyboard-only navigation"

Focus on making the updates seamless and natural - the brief should read as if it was written this way from the start.

## CRITICAL RULES

**MANDATORY**: You MUST follow these rules exactly:

1. **Do NOT modify the feature brief file directly** - The workflow will apply the changes using a separate update tool
    `;
  }
}
