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
import { FEATURE_BRIEF_TOOL } from '../../../tools/prd/magi-prd-feature-brief/metadata.js';
import {
  createFeatureDirectory,
  getExistingFeatureIds,
  getPrdWorkspacePath,
  writeMagiArtifact,
  MAGI_ARTIFACTS,
} from '../../../utils/magiDirectory.js';

export class PRDFeatureBriefGenerationNode extends AbstractGuidanceNode<PRDState> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('featureBriefGeneration', nodeExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const prdWorkspacePath = getPrdWorkspacePath(state.projectPath);
    const currentFeatureIds = getExistingFeatureIds(prdWorkspacePath);

    const guidanceData: NodeGuidanceData = {
      nodeId: 'featureBriefGeneration',
      taskPrompt: this.generateFeatureBriefGuidance(state, currentFeatureIds),
      taskInput: {
        userUtterance: state.userUtterance,
        currentFeatureIds: currentFeatureIds,
      },
      resultSchema: FEATURE_BRIEF_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: FEATURE_BRIEF_TOOL.description,
      },
    };

    const validatedResult = this.executeWithGuidance<typeof FEATURE_BRIEF_TOOL.resultSchema>(
      guidanceData
    );

    // Create new feature directory
    const featureDirectoryPath = createFeatureDirectory(
      prdWorkspacePath,
      validatedResult.recommendedFeatureId,
      true
    );
    this.logger?.info(`Created feature directory at: ${featureDirectoryPath}`);

    // Write the feature brief file
    const featureBriefFilePath = writeMagiArtifact(
      state.projectPath,
      validatedResult.recommendedFeatureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF,
      validatedResult.featureBriefMarkdown
    );
    this.logger?.info(`Feature brief written to file: ${featureBriefFilePath} (status: draft)`);

    return {
      featureId: validatedResult.recommendedFeatureId,
    };
  };

  private generateFeatureBriefGuidance(state: PRDState, currentFeatureIds: string[]): string {
    return `
# ROLE

You are a highly accurate and precise feature brief generation tool, taking a user utterance
and generating a feature brief in Markdown format along with a recommended feature ID.

# TASK

Generate a comprehensive feature brief from the user utterance and recommend an appropriate feature ID that follows kebab-case naming conventions and is unique among existing feature IDs.

# CONTEXT

## USER UTTERANCE TO ANALYZE
${JSON.stringify(state.userUtterance)}

## EXISTING FEATURE IDs
${JSON.stringify(currentFeatureIds)}

# OUTPUT REQUIREMENTS

1. **Feature Brief Markdown**: Generate a concise feature brief in Markdown format following the exact template below.

2. **Recommended Feature ID**: Generate a kebab-case feature ID that:
   - Must start with a lowercase letter (cannot start with a number or hyphen)
   - Is descriptive and meaningful
   - Follows kebab-case format (lowercase letters, numbers, and hyphens only)
   - Is unique and not already in the existing feature IDs list
   - Accurately represents the feature being described

# FEATURE BRIEF TEMPLATE

Follow this exact structure and format for the feature brief:

\`\`\`markdown
# [Feature Title - Use Title Case]

## Status
**Status**: draft

## User Utterance
[The original user utterance that initiated this feature request]

## Overview
[A clear, concise description of the feature and its purpose. Explain what the feature does and why it's needed.]

## Goals
- [Primary goal or objective]
- [Secondary goal if applicable]
- [Any additional goals]

## Scope
[Define what is included in this feature and what is explicitly out of scope]

## Success Criteria
- [Measurable criterion for success]
- [Additional success criteria]
\`\`\`

**Important Formatting Rules:**
- The title must be in Title Case (capitalize major words)
- The Status section must appear immediately after the title
- Status must always be set to "draft" for new feature briefs
- Use proper Markdown formatting throughout
- Keep sections concise but informative
- Use bullet points for Goals and Success Criteria
- Ensure all sections are present, even if brief


# VALIDATION

Ensure the recommended feature ID:
- Must start with a lowercase letter (cannot start with a number or hyphen)
- Contains only lowercase letters, numbers, and hyphens
- Is not already in the currentFeatureIds array
- Is descriptive and meaningful
- Is between 3-50 characters long
    `;
  }
}
