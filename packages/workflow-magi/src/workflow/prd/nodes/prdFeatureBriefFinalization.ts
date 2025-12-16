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
import { FEATURE_BRIEF_FINALIZATION_TOOL } from '../../../tools/prd/magi-prd-feature-brief-finalization/metadata.js';
import { getMagiPath, writeMagiArtifact, MAGI_ARTIFACTS } from '../../../utils/magiDirectory.js';

/**
 * Workflow node for finalizing feature brief after user approval.
 * This node updates the status to "approved" without modifying content.
 */
export class PRDFeatureBriefFinalizationNode extends AbstractGuidanceNode<PRDState> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('featureBriefFinalization', nodeExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get the path to the feature brief file
    const featureBriefPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF
    );

    const guidanceData: NodeGuidanceData = {
      nodeId: 'featureBriefFinalization',
      taskPrompt: this.generateFeatureBriefFinalizationGuidance(featureBriefPath),
      taskInput: {
        featureBriefPath: featureBriefPath,
      },
      resultSchema: FEATURE_BRIEF_FINALIZATION_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: FEATURE_BRIEF_FINALIZATION_TOOL.description,
      },
    };

    const validatedResult =
      this.executeWithGuidance<typeof FEATURE_BRIEF_FINALIZATION_TOOL.resultSchema>(guidanceData);

    // Write the finalized feature brief file back to disk with approved status
    const featureBriefFilePath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF,
      validatedResult.finalizedFeatureBriefContent
    );
    this.logger?.info(
      `Feature brief finalized and written to file: ${featureBriefFilePath} (status: approved)`
    );

    // Clear review state since feature brief is finalized
    return {
      isFeatureBriefApproved: undefined,
      featureBriefModifications: undefined,
    };
  };

  private generateFeatureBriefFinalizationGuidance(featureBriefPath: string): string {
    return `
You are finalizing a feature brief that has been approved by the user. Your role is to update the status section to "approved" while keeping all content exactly as it is.

## Feature Brief File to Finalize

**File Path**: ${featureBriefPath}

You should read the feature brief file from this path and update its status to "approved".

## Finalization Process

The user has approved this feature brief. You must:

1. **Read the feature brief file** from the provided path
2. **Keep ALL content exactly as it is** - Do NOT modify any content sections
3. **Update ONLY the Status section** - Change status from "draft" to "approved"
4. **Preserve all formatting** - Maintain all markdown structure and formatting

## CRITICAL REQUIREMENTS

**ABSOLUTELY FORBIDDEN**:
- Modifying any content sections
- Changing any text except the Status section
- Adding or removing any sections
- Altering formatting or structure

## Status Update Format

The Status section should be updated to:

\`\`\`markdown
## Status
**Status**: approved
\`\`\`

The Status section must be near the top of the document.

## Important Notes

- This is a simple status update operation
- The feature brief content has already been approved by the user
- No content changes are needed, only status update
- Once finalized, the workflow will proceed to requirements generation

Update the Status section to "approved" while preserving all other content exactly as it is.
    `;
  }
}
