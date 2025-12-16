/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../../add-feature-metadata.js';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

/**
 * Validates that the provided project path is a valid iOS or Android project
 * and extracts platform and project name information
 */
export class ProjectValidationNode extends BaseNode<AddFeatureState> {
  protected readonly logger: Logger;

  constructor(logger?: Logger) {
    super('validateProject');
    this.logger = logger ?? createComponentLogger('ProjectValidationNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    const projectPath = state.projectPath;

    if (!projectPath) {
      return {
        validProject: false,
        workflowFatalErrorMessages: ['Project path is required but was not provided'],
      };
    }

    // Check if path exists
    if (!existsSync(projectPath)) {
      return {
        validProject: false,
        workflowFatalErrorMessages: [`Project path does not exist: ${projectPath}`],
      };
    }

    // Check if it's a directory
    if (!statSync(projectPath).isDirectory()) {
      return {
        validProject: false,
        workflowFatalErrorMessages: [`Project path is not a directory: ${projectPath}`],
      };
    }

    // Try to detect platform and validate structure
    const iosValidation = this.validateiOSProject(projectPath);
    if (iosValidation.isValid) {
      this.logger.info('Detected valid iOS project', {
        projectPath,
        projectName: iosValidation.projectName,
      });
      return {
        validProject: true,
        platform: 'iOS',
        projectName: iosValidation.projectName!,
      };
    }

    const androidValidation = this.validateAndroidProject(projectPath);
    if (androidValidation.isValid) {
      this.logger.info('Detected valid Android project', {
        projectPath,
        projectName: androidValidation.projectName,
      });
      return {
        validProject: true,
        platform: 'Android',
        projectName: androidValidation.projectName!,
      };
    }

    // Neither iOS nor Android project detected
    return {
      validProject: false,
      workflowFatalErrorMessages: [
        `Project at ${projectPath} is not a valid iOS or Android project. ` +
          'Expected to find .xcodeproj (iOS) or build.gradle with app module (Android).',
      ],
    };
  };

  /**
   * Validates that the project is a valid iOS project
   * Returns the project name if valid
   */
  private validateiOSProject(projectPath: string): {
    isValid: boolean;
    projectName?: string;
  } {
    try {
      const files = readdirSync(projectPath);
      const xcodeproj = files.find(f => f.endsWith('.xcodeproj'));

      if (xcodeproj) {
        // Extract project name from .xcodeproj directory name
        const projectName = xcodeproj.replace(/\.xcodeproj$/, '');
        const xcodeprojPath = join(projectPath, xcodeproj);

        // Verify it's a directory and contains project.pbxproj
        if (
          statSync(xcodeprojPath).isDirectory() &&
          existsSync(join(xcodeprojPath, 'project.pbxproj'))
        ) {
          return {
            isValid: true,
            projectName,
          };
        }
      }
    } catch (error) {
      this.logger.debug('Failed to validate as iOS project', { projectPath, error });
    }

    return { isValid: false };
  }

  /**
   * Validates that the project is a valid Android project
   * Returns the project name if valid
   */
  private validateAndroidProject(projectPath: string): {
    isValid: boolean;
    projectName?: string;
  } {
    try {
      // Check for Android project structure
      const hasBuildGradle =
        existsSync(join(projectPath, 'build.gradle')) ||
        existsSync(join(projectPath, 'build.gradle.kts'));

      const hasSettingsGradle =
        existsSync(join(projectPath, 'settings.gradle')) ||
        existsSync(join(projectPath, 'settings.gradle.kts'));

      const hasAppModule =
        existsSync(join(projectPath, 'app')) && statSync(join(projectPath, 'app')).isDirectory();

      const hasManifest = existsSync(join(projectPath, 'app/src/main/AndroidManifest.xml'));

      if (hasBuildGradle && hasSettingsGradle && hasAppModule && hasManifest) {
        // Use the directory name as project name for Android
        const projectName = basename(projectPath);
        return {
          isValid: true,
          projectName,
        };
      }
    } catch (error) {
      this.logger.debug('Failed to validate as Android project', { projectPath, error });
    }

    return { isValid: false };
  }
}
