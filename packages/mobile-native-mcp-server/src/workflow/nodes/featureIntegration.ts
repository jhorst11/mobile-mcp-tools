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
  createComponentLogger,
} from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../add-feature-metadata.js';
import { FEATURE_INTEGRATION_TOOL } from '../../tools/plan/sfmobile-native-feature-integration/metadata.js';
import dedent from 'dedent';

/**
 * Integrates the feature into the existing project by providing guidance to the LLM.
 * The guidance explains how to apply the patch changes.
 */
export class FeatureIntegrationNode extends AbstractGuidanceNode<AddFeatureState> {
  protected readonly logger: Logger;

  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('integrateFeature', nodeExecutor, logger);
    this.logger = logger ?? createComponentLogger('FeatureIntegrationNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    if (!state.patchContent || !state.patchAnalysis) {
      return {
        integrationSuccessful: false,
        integrationErrorMessages: [
          'Patch content and analysis are required for feature integration',
        ],
      };
    }

    const guidanceData: NodeGuidanceData = {
      nodeId: 'integrateFeature',
      taskPrompt: this.generateIntegrationGuidance(state),
      taskInput: {
        platform: state.platform,
        projectPath: state.projectPath,
        projectName: state.projectName,
        featureDescription: state.featureDescription,
        selectedTemplate: state.selectedFeatureTemplate,
        patchContent: state.patchContent,
        patchAnalysis: state.patchAnalysis,
      },
      resultSchema: FEATURE_INTEGRATION_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: FEATURE_INTEGRATION_TOOL.description,
      },
    };

    const validatedResult =
      this.executeWithGuidance<typeof FEATURE_INTEGRATION_TOOL.resultSchema>(guidanceData);

    // Check if integration was completed
    if (!validatedResult.integrationComplete) {
      return {
        integrationSuccessful: false,
        integrationErrorMessages: [
          'Feature integration was not completed. The LLM must apply all changes before proceeding.',
        ],
      };
    }

    // Analyze patch to determine if files were added, removed, and if Podfile was modified
    const { filesAdded, filesRemoved, podfileModified } = this.analyzeIntegrationChanges(
      state.patchContent,
      validatedResult.filesModified || []
    );

    this.logger.info('Feature integration completed', {
      projectPath: state.projectPath,
      featureTemplate: state.selectedFeatureTemplate,
      filesModified: validatedResult.filesModified?.length || 0,
      filesAdded: filesAdded.length,
      filesRemoved: filesRemoved.length,
      podfileModified,
    });

    return {
      integrationSuccessful: true,
      integrationErrorMessages: [],
      filesAdded,
      filesRemoved,
      podfileModified,
    };
  };

  private generateIntegrationGuidance(state: AddFeatureState): string {
    return dedent`
      # Feature Integration Task

      ## Project Context
      - **Project**: ${state.projectName}
      - **Platform**: ${state.platform}
      - **Location**: ${state.projectPath}
      - **Feature Template**: ${state.selectedFeatureTemplate}
      - **Feature Description**: ${state.featureDescription}

      ## Patch Analysis
      ${state.patchAnalysis}

      ## Your Task: Apply the Feature Changes

      You need to apply the changes from the feature template patch to the existing project.
      The patch shows the minimal diff needed to add this feature.

      ### Integration Steps

      1. **Review the patch** (provided below) to understand what changes are needed
      
      2. **Apply changes systematically**:
         - **New files**: Create them with the content shown in the patch
         - **Modified files**: Apply the diffs to existing files
         - **Deleted files**: Remove them (if any)

      3. **Platform-specific considerations** (${state.platform}):
      ${
        state.platform === 'iOS'
          ? dedent`
         - **Xcode project (.pbxproj)**: Carefully apply file reference additions
         - **Info.plist**: Merge any new keys/values
         - **Podfile**: Add any new dependencies
         - **Swift files**: Ensure proper imports and module references
         - **Assets**: Copy any new assets to the project
      `
          : dedent`
         - **build.gradle**: Merge dependency changes
         - **AndroidManifest.xml**: Merge permissions and configuration
         - **Java/Kotlin files**: Ensure proper package structure
         - **Resources**: Copy any new resources to appropriate directories
      `
      }

      4. **Verify your work**:
         - All new files are in correct locations
         - Dependencies are properly declared
         - Imports/references are correct
         - No syntax errors introduced

      ## Complete Patch File

      Here is the complete patch showing all changes needed:

      \`\`\`diff
      ${state.patchContent}
      \`\`\`

      ## Expected Result Format

      After you've applied all the changes, respond with:
      
      \`\`\`json
      {
        "integrationComplete": true,
        "filesModified": ["list", "of", "files", "you", "modified"],
        "notes": "Brief summary of what you did"
      }
      \`\`\`

      **Important**: Do not proceed until you have actually applied all the changes to the project files.
      The next step in the workflow will build the project to verify your changes.
    `;
  }

  /**
   * Analyzes the patch content and filesModified list to determine:
   * - Which files were added (new files)
   * - Which files were removed (deleted files)
   * - Whether Podfile was modified
   */
  private analyzeIntegrationChanges(
    patchContent: string,
    filesModified: string[]
  ): { filesAdded: string[]; filesRemoved: string[]; podfileModified: boolean } {
    const filesAdded: string[] = [];
    const filesRemoved: string[] = [];
    let podfileModified = false;

    // Parse patch to find new files and deleted files
    const lines = patchContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for new file pattern: "--- /dev/null" followed by "+++ b/path"
      if (line.startsWith('--- /dev/null') && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const match = nextLine.match(/^\+\+\+ b\/(.+)$/);
        if (match) {
          const filePath = match[1];
          // Only track source files that need to be added to Xcode project
          const sourceExtensions = [
            '.swift',
            '.m',
            '.mm',
            '.c',
            '.cpp',
            '.h',
            '.hpp',
            '.plist',
            '.json',
          ];
          const isSourceFile = sourceExtensions.some(ext => filePath.endsWith(ext));
          if (isSourceFile && filesModified.includes(filePath)) {
            filesAdded.push(filePath);
          }
        }
      }

      // Check for deleted file pattern: "--- a/path" followed by "+++ /dev/null"
      if (line.startsWith('--- a/') && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.startsWith('+++ /dev/null')) {
          const match = line.match(/^--- a\/(.+)$/);
          if (match) {
            const filePath = match[1];
            // Track files that need to be removed from Xcode project
            const sourceExtensions = [
              '.swift',
              '.m',
              '.mm',
              '.c',
              '.cpp',
              '.h',
              '.hpp',
              '.plist',
              '.json',
            ];
            const isSourceFile = sourceExtensions.some(ext => filePath.endsWith(ext));
            if (isSourceFile) {
              filesRemoved.push(filePath);
            }
          }
        }
      }

      // Check if Podfile was modified
      if (line.includes('Podfile') && filesModified.includes('Podfile')) {
        podfileModified = true;
      }
    }

    return { filesAdded, filesRemoved, podfileModified };
  }
}
