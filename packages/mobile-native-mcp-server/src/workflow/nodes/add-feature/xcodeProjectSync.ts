/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../../add-feature-metadata.js';
import { XcodeProjectManagementService } from '../../../services/xcodeProjectManagementService.js';

/**
 * Automatically synchronizes the Xcode project file with the actual file system state.
 * This node executes Ruby commands directly (without agent involvement) to add/remove
 * files from the Xcode project based on what was actually added/removed during feature
 * integration.
 *
 * This is a deterministic, automated operation that doesn't require agent guidance.
 */
export class XcodeProjectSyncNode extends BaseNode<AddFeatureState> {
  protected readonly logger: Logger;
  private readonly xcodeService: XcodeProjectManagementService;

  constructor(xcodeService?: XcodeProjectManagementService, logger?: Logger) {
    super('syncXcodeProject');
    this.logger = logger ?? createComponentLogger('XcodeProjectSyncNode');
    this.xcodeService = xcodeService ?? new XcodeProjectManagementService(logger);
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    // Only run for iOS projects
    if (state.platform !== 'iOS') {
      this.logger.debug('Skipping Xcode sync - not an iOS project', {
        platform: state.platform,
      });
      return { xcodeUpdateSuccessful: true };
    }

    // Check if there are any file changes to sync
    const filesToAdd = state.filesActuallyAdded || [];
    const filesToRemove = state.filesActuallyRemoved || [];

    if (filesToAdd.length === 0 && filesToRemove.length === 0) {
      this.logger.info('No file changes detected - skipping Xcode sync');
      return { xcodeUpdateSuccessful: true };
    }

    this.logger.info('Starting Xcode project sync', {
      filesToAdd: filesToAdd.length,
      filesToRemove: filesToRemove.length,
    });

    try {
      // Execute the sync operation
      const result = this.xcodeService.syncProject({
        projectPath: state.projectPath,
        xcodeProjectPath: `${state.projectName}.xcodeproj`,
        filesToAdd,
        filesToRemove,
        targetName: state.projectName,
      });

      if (!result.success) {
        this.logger.error('Xcode project sync failed', new Error(result.error || 'Unknown error'));
        return {
          xcodeUpdateSuccessful: false,
          integrationErrorMessages: [
            ...(state.integrationErrorMessages || []),
            `Xcode project sync failed: ${result.error}`,
          ],
        };
      }

      // Log warnings if any
      if (result.warnings) {
        this.logger.warn('Xcode sync completed with warnings', { warnings: result.warnings });
      }

      this.logger.info('Xcode project sync completed successfully', {
        filesAdded: result.filesAdded?.length || 0,
        filesRemoved: result.filesRemoved?.length || 0,
        target: result.target,
      });

      return {
        xcodeUpdateSuccessful: true,
        filesAddedToXcode: result.filesAdded,
        filesRemovedFromXcode: result.filesRemoved,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Unexpected error during Xcode sync', error as Error);
      return {
        xcodeUpdateSuccessful: false,
        integrationErrorMessages: [
          ...(state.integrationErrorMessages || []),
          `Unexpected error during Xcode sync: ${errorMessage}`,
        ],
      };
    }
  };
}
