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
import dedent from 'dedent';
import z from 'zod';

/**
 * Pod install result schema - matches what we expect from the LLM
 */
const POD_INSTALL_RESULT_SCHEMA = z.object({
  success: z.boolean().describe('Whether pod install completed successfully'),
  message: z.string().describe('Status message from pod install execution'),
});

/**
 * Runs pod install if Podfile was modified.
 * This node only executes if the platform is iOS and Podfile was modified.
 */
export class PodInstallNode extends AbstractGuidanceNode<AddFeatureState> {
  protected readonly logger: Logger;

  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('podInstall', nodeExecutor, logger);
    this.logger = logger ?? createComponentLogger('PodInstallNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    // Only execute if iOS and Podfile was modified
    if (state.platform !== 'iOS' || !state.podfileModified) {
      this.logger.debug('Skipping pod install', {
        platform: state.platform,
        podfileModified: state.podfileModified,
      });
      return {};
    }

    const guidanceData: NodeGuidanceData = {
      nodeId: 'podInstall',
      taskPrompt: this.generatePodInstallGuidance(state),
      taskInput: {
        projectPath: state.projectPath,
        projectName: state.projectName,
      },
      resultSchema: POD_INSTALL_RESULT_SCHEMA,
      metadata: {
        nodeName: this.name,
        description: 'Run pod install to install CocoaPods dependencies',
      },
    };

    const validatedResult =
      this.executeWithGuidance<typeof POD_INSTALL_RESULT_SCHEMA>(guidanceData);

    if (!validatedResult.success) {
      this.logger.warn('Pod install failed', {
        message: validatedResult.message,
      });
      return {
        integrationErrorMessages: [
          ...(state.integrationErrorMessages || []),
          `Pod install failed: ${validatedResult.message || 'Unknown error'}`,
        ],
      };
    }

    this.logger.info('Pod install completed successfully', {
      projectPath: state.projectPath,
    });

    return {};
  };

  private generatePodInstallGuidance(state: AddFeatureState): string {
    return dedent`
      # CocoaPods Installation Task

      ## Context
      During feature integration, the Podfile was modified to add new dependencies.
      You need to run \`pod install\` to install these dependencies and update the Xcode workspace.

      ## Your Task

      Execute the following command to install CocoaPods dependencies:

      \`\`\`bash
      cd ${state.projectPath}
      pod install
      \`\`\`

      ### Steps:

      1. **Navigate to project directory**:
         \`cd ${state.projectPath}\`

      2. **Run pod install**:
         \`pod install\`

      3. **Verify success**:
         - Check that the command completes without errors
         - Verify that \`${state.projectName}.xcworkspace\` exists (not just .xcodeproj)
         - Check that \`Pods/\` directory was created/updated

      ### Expected Result

      After successful execution:
      - CocoaPods dependencies will be installed
      - The \`${state.projectName}.xcworkspace\` file will be created or updated
      - The project will be ready to build with the new dependencies

      **Important**: 
      - Always use the \`.xcworkspace\` file (not \`.xcodeproj\`) when opening the project in Xcode after running pod install
      - If pod install fails, check that CocoaPods is installed: \`pod --version\`
      - Ensure you have an internet connection to download pod dependencies

      After completing pod install, respond with:
      \`\`\`json
      {
        "success": true,
        "message": "Pod install completed successfully"
      }
      \`\`\`
    `;
  }
}
