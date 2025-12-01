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
import { getMagiPath, writeMagiArtifact, MAGI_ARTIFACTS } from '../../../utils/magiDirectory.js';
import type { PRDModification } from '../../../tools/prd/shared/prdSchemas.js';

export class PRDUpdateNode extends AbstractGuidanceNode<PRDState> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('prdUpdate', nodeExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get the path to the PRD file
    const prdFilePath = getMagiPath(state.projectPath, state.featureId, MAGI_ARTIFACTS.PRD);

    // Construct review result from state
    const reviewResult = {
      approved: false, // Always false for update node
      modifications: state.prdModifications,
    };

    const resultSchema = z.object({
      updatedPrdContent: z.string(),
    });

    const guidanceData: NodeGuidanceData = {
      nodeId: 'prdUpdate',
      taskPrompt: this.generatePRDUpdateGuidance(prdFilePath, reviewResult),
      taskInput: {
        prdFilePath: prdFilePath,
        reviewResult: reviewResult,
      },
      resultSchema: resultSchema,
      metadata: {
        nodeName: this.name,
        description: 'Update PRD based on review feedback',
      },
    };

    const validatedResult = this.executeWithGuidance(guidanceData);

    // Write the updated PRD file
    const updatedPrdPath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.PRD,
      validatedResult.updatedPrdContent
    );
    this.logger?.info(`Updated PRD written to file: ${updatedPrdPath}`);

    // Clear review state since we've processed the update
    return {
      // Clear review state when updating
      prdModifications: undefined,
      isPrdApproved: undefined,
    };
  };

  private generatePRDUpdateGuidance(
    prdPath: string,
    reviewResult: { approved: boolean; modifications?: PRDModification[] }
  ): string {
    const hasModifications = reviewResult.modifications && reviewResult.modifications.length > 0;

    return `
# ROLE

You are a PRD update tool. Your task is to update an EXISTING PRD file based on review feedback. You must read the current PRD file, apply the requested modifications, and return the updated content.

# CONTEXT

## PRD File to Update

**File Path**: ${prdPath}

You should read the PRD file from this path and update it based on the review feedback.

## Review Feedback

**Modifications**: ${
      hasModifications
        ? JSON.stringify(reviewResult.modifications, null, 2)
        : 'No modifications requested - but changes are needed based on review feedback'
    }

# TASK

You must update the PRD file to incorporate:
1. All requested modifications
2. Address any concerns or issues raised during the review

**CRITICAL REQUIREMENTS**:
- Read the PRD file from the provided path
- Preserve the overall structure and intent of the original PRD
- Incorporate changes naturally and coherently
- Ensure the updated PRD addresses all modifications
- Keep the markdown formatting consistent
- Maintain document status section (keep as "draft" if not finalized)

## Modification Handling

For each modification request:
1. Find the specified section in the PRD
2. Replace or update the content as requested
3. Ensure the modification flows naturally with the rest of the document
4. Preserve other sections that are not being modified

**CRITICAL**: 
- Maintain all formatting and structure
- Preserve sections that are not being modified
- Ensure the updated content is coherent and well-formatted
- If document status exists, keep it as "draft" (do not change to finalized)
- **Do NOT modify the PRD file directly** - The workflow will apply the changes using a separate update tool

Read the PRD file and apply the review feedback to update the document.
    `;
  }
}
