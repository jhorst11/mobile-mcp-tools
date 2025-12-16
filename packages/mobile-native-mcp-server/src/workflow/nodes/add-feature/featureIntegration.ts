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
import { AddFeatureState } from '../../add-feature-metadata.js';
import { FEATURE_INTEGRATION_TOOL } from '../../../tools/plan/sfmobile-native-feature-integration/metadata.js';
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

    // Check if Podfile was modified (still useful for pod install decision)
    const podfileModified = this.checkPodfileModified(validatedResult.filesModified || []);

    // Check if LLM manually modified the Xcode project file (they shouldn't!)
    const xcodeProjectModified = this.checkXcodeProjectModified(
      validatedResult.filesModified || []
    );

    const warnings: string[] = [];
    if (xcodeProjectModified && state.platform === 'iOS') {
      const warning =
        'WARNING: .xcodeproj/project.pbxproj was manually modified. ' +
        'This may conflict with automatic project sync. ' +
        'The automatic sync will attempt to reconcile changes.';
      this.logger.warn(warning);
      warnings.push(warning);
    }

    this.logger.info('Feature integration completed', {
      projectPath: state.projectPath,
      featureTemplate: state.selectedFeatureTemplate,
      filesModified: validatedResult.filesModified?.length || 0,
      podfileModified,
      xcodeProjectModified,
    });

    return {
      integrationSuccessful: true,
      integrationErrorMessages: warnings,
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

      ${
        state.platform === 'iOS'
          ? dedent`
      **⚠️ CRITICAL FOR iOS PROJECTS:**
      - DO NOT manually edit the .xcodeproj/project.pbxproj file
      - DO NOT add file references to the Xcode project yourself
      - The system will automatically sync the Xcode project after you create/delete files
      - Only create, modify, or delete source files - file references are handled automatically
      `
          : ''
      }

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
         - **DO NOT manually modify .xcodeproj/project.pbxproj**: File references will be added automatically
         - **Info.plist**: Merge any new keys/values
         - **Podfile**: Add any new dependencies
         - **Swift files**: Ensure proper imports and module references
         - **Assets**: Copy any new assets to the project
         - **IMPORTANT**: Only create/modify source files - the Xcode project file will be updated automatically
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
   * Checks if Podfile was modified during integration.
   * This is used to determine if we need to run pod install.
   */
  private checkPodfileModified(filesModified: string[]): boolean {
    return filesModified.some(file => file.endsWith('Podfile'));
  }

  /**
   * Checks if the Xcode project file was manually modified during integration.
   * This should NOT happen - the LLM is instructed not to modify .pbxproj files.
   * If detected, we log a warning as the automated sync may conflict.
   */
  private checkXcodeProjectModified(filesModified: string[]): boolean {
    return filesModified.some(file => file.includes('.xcodeproj/project.pbxproj'));
  }
}
