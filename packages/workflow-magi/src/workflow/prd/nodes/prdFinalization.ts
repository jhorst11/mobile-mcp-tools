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
import { PRD_FINALIZATION_TOOL } from '../../../tools/prd/magi-prd-finalization/metadata.js';
import { getMagiPath, writeMagiArtifact, MAGI_ARTIFACTS } from '../../../utils/magiDirectory.js';

export class PRDFinalizationNode extends AbstractGuidanceNode<PRDState> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('prdFinalization', nodeExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get the path to the PRD file
    const prdFilePath = getMagiPath(state.projectPath, state.featureId, MAGI_ARTIFACTS.PRD);

    const guidanceData: NodeGuidanceData = {
      nodeId: 'prdFinalization',
      taskPrompt: this.generatePRDFinalizationGuidance(prdFilePath),
      taskInput: {
        prdFilePath: prdFilePath,
      },
      resultSchema: PRD_FINALIZATION_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: PRD_FINALIZATION_TOOL.description,
      },
    };

    const validatedResult = this.executeWithGuidance<typeof PRD_FINALIZATION_TOOL.resultSchema>(
      guidanceData
    );

    // Write the finalized PRD file back to disk with finalized status
    const finalizedPrdPath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.PRD,
      validatedResult.finalizedPrdContent
    );
    this.logger?.info(`PRD finalized and written to file: ${finalizedPrdPath} (status: finalized)`);

    this.logger?.info('PRD workflow completed');
    // Clear transient review state since PRD is finalized
    return {
      isPrdApproved: undefined,
      prdModifications: undefined,
    };
  };

  private generatePRDFinalizationGuidance(prdFilePath: string): string {
    return `
You are finalizing a PRD that has been approved by the user. Your role is to update the status section to "finalized" while keeping all content exactly as it is.

## PRD File to Finalize

**File Path**: ${prdFilePath}

You should read the PRD file from this path and update its status to "finalized".

## Finalization Process

The user has approved this PRD. You must:

1. **Read the PRD file** from the provided path
2. **Keep ALL content exactly as it is** - Do NOT modify any content sections
3. **Update ONLY the Status section** - Change status from "draft" to "finalized"
4. **Preserve all formatting** - Maintain all markdown structure and formatting

## CRITICAL REQUIREMENTS

**ABSOLUTELY FORBIDDEN**:
- Modifying any content sections
- Changing any text except the Status section
- Adding or removing any sections
- Altering formatting or structure

**REQUIRED**:
- Read the PRD file from the provided path
- Find the Status section (should be near the top, after the title)
- Change the status value from "draft" to "finalized"
- Keep everything else exactly the same

## Status Update Format

The Status section should be updated to:

\`\`\`markdown
## Status
**Status**: finalized
\`\`\`

The Status section must be near the top of the document, after the title.

## Important Notes

- This is a simple status update operation
- The PRD content has already been approved by the user
- No content changes are needed, only status update
- Once finalized, the workflow will complete

**CRITICAL**: 
- **Do NOT modify the PRD file directly** - The workflow will apply the changes using a separate update tool
    `;
  }
}
