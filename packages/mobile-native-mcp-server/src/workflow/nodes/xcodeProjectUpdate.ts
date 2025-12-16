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
import { XCODE_ADD_FILES_TOOL } from '../../tools/utils/utils-xcode-add-files/metadata.js';
import dedent from 'dedent';
import * as path from 'path';

/**
 * Updates Xcode project files to include newly added source files.
 * This node only executes if the platform is iOS and files were added.
 */
export class XcodeProjectUpdateNode extends AbstractGuidanceNode<AddFeatureState> {
  protected readonly logger: Logger;

  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('updateXcodeProject', nodeExecutor, logger);
    this.logger = logger ?? createComponentLogger('XcodeProjectUpdateNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    // Only execute if iOS and files were added
    if (state.platform !== 'iOS' || !state.filesAdded || state.filesAdded.length === 0) {
      this.logger.debug('Skipping Xcode project update', {
        platform: state.platform,
        filesAdded: state.filesAdded?.length || 0,
      });
      return {};
    }

    // Construct full paths to the files
    const fullFilePaths = state.filesAdded.map(file => path.resolve(state.projectPath, file));
    const xcodeProjectPath = `${state.projectName}.xcodeproj`;

    const guidanceData: NodeGuidanceData = {
      nodeId: 'updateXcodeProject',
      taskPrompt: this.generateXcodeUpdateGuidance(state, fullFilePaths, xcodeProjectPath),
      taskInput: {
        projectPath: state.projectPath,
        xcodeProjectPath,
        newFilePaths: fullFilePaths,
        targetName: state.projectName,
      },
      resultSchema: XCODE_ADD_FILES_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: 'Add newly created files to Xcode project',
      },
    };

    const validatedResult = this.executeWithGuidance<typeof XCODE_ADD_FILES_TOOL.resultSchema>(
      guidanceData
    );

    if (!validatedResult.success) {
      this.logger.warn('Xcode project update failed', {
        error: validatedResult.error,
        filesAdded: state.filesAdded.length,
      });
      return {
        integrationErrorMessages: [
          ...(state.integrationErrorMessages || []),
          `Failed to add files to Xcode project: ${validatedResult.error || 'Unknown error'}`,
        ],
      };
    }

    this.logger.info('Xcode project updated successfully', {
      filesAdded: validatedResult.filesAdded?.length || 0,
      target: validatedResult.targetName,
    });

    return {};
  };

  private generateXcodeUpdateGuidance(
    state: AddFeatureState,
    fullFilePaths: string[],
    xcodeProjectPath: string
  ): string {
    return dedent`
      # Xcode Project Update Task

      ## Context
      During feature integration, ${fullFilePaths.length} new source file(s) were created:
      ${fullFilePaths.map(fp => `- ${fp}`).join('\n')}

      These files need to be added to the Xcode project so they can be compiled and included in the build.

      ## Your Task

      Use the \`utils-xcode-add-files\` tool to add these files to the Xcode project.

      ### Tool Input Parameters:
      - \`projectPath\`: ${state.projectPath}
      - \`xcodeProjectPath\`: ${xcodeProjectPath}
      - \`newFilePaths\`: ${JSON.stringify(fullFilePaths)}
      - \`targetName\`: ${state.projectName} (optional, defaults to main target)

      ### Expected Result

      The tool will generate a Ruby command using the xcodeproj gem. Execute this command to add the files to the Xcode project.

      After execution, verify that:
      1. The files appear in the Xcode project navigator
      2. The files are included in the target's "Compile Sources" build phase
      3. The project builds successfully

      **Important**: Execute the Ruby command provided by the tool to complete the Xcode project update.
    `;
  }
}

