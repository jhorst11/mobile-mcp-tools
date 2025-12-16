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
    // Only execute if iOS and (files were added or removed)
    const hasFilesToAdd = state.filesAdded && state.filesAdded.length > 0;
    const hasFilesToRemove = state.filesRemoved && state.filesRemoved.length > 0;

    if (state.platform !== 'iOS' || (!hasFilesToAdd && !hasFilesToRemove)) {
      this.logger.debug('Skipping Xcode project update', {
        platform: state.platform,
        filesAdded: state.filesAdded?.length || 0,
        filesRemoved: state.filesRemoved?.length || 0,
      });
      return {};
    }

    // Construct full paths to the files
    const fullFilePaths = hasFilesToAdd
      ? state.filesAdded!.map(file => path.resolve(state.projectPath, file))
      : [];
    const fullFilesToRemove = hasFilesToRemove
      ? state.filesRemoved!.map(file => path.resolve(state.projectPath, file))
      : [];
    const xcodeProjectPath = `${state.projectName}.xcodeproj`;

    const guidanceData: NodeGuidanceData = {
      nodeId: 'updateXcodeProject',
      taskPrompt: this.generateXcodeUpdateGuidance(
        state,
        fullFilePaths,
        fullFilesToRemove,
        xcodeProjectPath
      ),
      taskInput: {
        projectPath: state.projectPath,
        xcodeProjectPath,
        newFilePaths: fullFilePaths.length > 0 ? fullFilePaths : undefined,
        filesToRemove: fullFilesToRemove.length > 0 ? fullFilesToRemove : undefined,
        targetName: state.projectName,
      },
      resultSchema: XCODE_ADD_FILES_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: 'Add and remove files in Xcode project',
      },
    };

    const validatedResult =
      this.executeWithGuidance<typeof XCODE_ADD_FILES_TOOL.resultSchema>(guidanceData);

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
      filesAdded: validatedResult.filePaths?.length || 0,
      filesRemoved: validatedResult.filesRemoved?.length || 0,
      target: validatedResult.targetName,
    });

    return {};
  };

  private generateXcodeUpdateGuidance(
    state: AddFeatureState,
    fullFilePaths: string[],
    fullFilesToRemove: string[],
    xcodeProjectPath: string
  ): string {
    const addSection =
      fullFilePaths.length > 0
        ? dedent`
      ## Files to Add
      During feature integration, ${fullFilePaths.length} new source file(s) were created:
      ${fullFilePaths.map(fp => `- ${fp}`).join('\n')}

      These files need to be added to the Xcode project so they can be compiled and included in the build.
      `
        : '';

    const removeSection =
      fullFilesToRemove.length > 0
        ? dedent`
      ## Files to Remove
      During feature integration, ${fullFilesToRemove.length} file(s) were deleted:
      ${fullFilesToRemove.map(fp => `- ${fp}`).join('\n')}

      These files need to be removed from the Xcode project file references and build phases.
      `
        : '';

    const toolInput: Record<string, unknown> = {
      projectPath: state.projectPath,
      xcodeProjectPath,
      targetName: state.projectName,
    };
    if (fullFilePaths.length > 0) {
      toolInput.newFilePaths = fullFilePaths;
    }
    if (fullFilesToRemove.length > 0) {
      toolInput.filesToRemove = fullFilesToRemove;
    }

    return dedent`
      # Xcode Project Update Task

      ## Context
      ${addSection}
      ${removeSection}
      ## Your Task

      Use the \`utils-xcode-add-files\` tool to update the Xcode project (add new files and/or remove deleted files).

      ### Tool Input Parameters:
      ${JSON.stringify(toolInput, null, 2)}

      ### Expected Result

      The tool will generate a Ruby command using the xcodeproj gem. Execute this command to update the Xcode project.

      After execution, verify that:
      1. New files appear in the Xcode project navigator in the correct location
      2. Deleted files are removed from the project navigator
      3. Source files are included in the target's "Compile Sources" build phase (if applicable)
      4. The project builds successfully

      **Important**: Execute the Ruby command provided by the tool to complete the Xcode project update.
    `;
  }
}
