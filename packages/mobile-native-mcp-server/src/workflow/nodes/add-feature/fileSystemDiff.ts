/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../../add-feature-metadata.js';
import { FileSnapshot, FileInfo } from './fileSystemSnapshot.js';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

/**
 * Represents the differences between two file system snapshots
 */
export interface FileDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

/**
 * Compares file system state before and after feature integration to determine
 * what files were actually added, removed, or modified. This diff is then used
 * to synchronize the Xcode project file with the actual file system state.
 */
export class FileSystemDiffNode extends BaseNode<AddFeatureState> {
  protected readonly logger: Logger;

  // File extensions that need to be added to Xcode project build phases
  private static readonly SOURCE_FILE_EXTENSIONS = [
    '.swift',
    '.m',
    '.mm',
    '.c',
    '.cpp',
    '.cc',
    '.cxx',
    '.metal',
  ];

  // Directories to ignore during scanning
  private static readonly IGNORED_DIRECTORIES = [
    'node_modules',
    '.git',
    'Pods',
    'build',
    'DerivedData',
    '.build',
    'xcuserdata',
    '.DS_Store',
  ];

  // File extensions relevant for Xcode
  private static readonly XCODE_RELEVANT_EXTENSIONS = [
    '.swift',
    '.m',
    '.mm',
    '.h',
    '.hpp',
    '.c',
    '.cpp',
    '.cc',
    '.cxx',
    '.metal',
    '.storyboard',
    '.xib',
    '.xcassets',
    '.plist',
    '.strings',
    '.stringsdict',
  ];

  constructor(logger?: Logger) {
    super('computeFileSystemDiff');
    this.logger = logger ?? createComponentLogger('FileSystemDiffNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    if (!state.preIntegrationFileSnapshot) {
      this.logger.warn('No pre-integration snapshot available, skipping diff');
      return {
        filesActuallyAdded: [],
        filesActuallyRemoved: [],
        filesActuallyModified: [],
      };
    }

    if (!state.projectPath) {
      this.logger.error('Project path is required for file system diff');
      return {
        workflowFatalErrorMessages: ['Cannot compute file system diff: project path is missing'],
      };
    }

    try {
      // Capture current file system state
      const postSnapshot = this.captureSnapshot(state.projectPath);

      // Compute the diff
      const diff = this.computeDiff(state.preIntegrationFileSnapshot, postSnapshot);

      // Filter to only Xcode-relevant files
      const xcodeRelevantDiff = this.filterXcodeRelevantFiles(diff);

      this.logger.info('Computed file system diff', {
        added: xcodeRelevantDiff.added.length,
        removed: xcodeRelevantDiff.removed.length,
        modified: xcodeRelevantDiff.modified.length,
      });

      // Log details for debugging
      if (xcodeRelevantDiff.added.length > 0) {
        this.logger.debug('Files added:', xcodeRelevantDiff.added);
      }
      if (xcodeRelevantDiff.removed.length > 0) {
        this.logger.debug('Files removed:', xcodeRelevantDiff.removed);
      }

      // Check if .pbxproj was modified (should not happen, but detect it)
      const pbxprojModified = diff.modified.some(file =>
        file.includes('.xcodeproj/project.pbxproj')
      );
      if (pbxprojModified && state.platform === 'iOS') {
        this.logger.warn(
          'Detected manual modification of .xcodeproj/project.pbxproj file. ' +
            'Automated sync will overwrite manual changes to ensure consistency.'
        );
      }

      return {
        filesActuallyAdded: xcodeRelevantDiff.added,
        filesActuallyRemoved: xcodeRelevantDiff.removed,
        filesActuallyModified: xcodeRelevantDiff.modified,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to compute file system diff', error as Error);
      return {
        workflowFatalErrorMessages: [`Failed to compute file system diff: ${errorMessage}`],
      };
    }
  };

  /**
   * Captures the current state of the file system
   */
  private captureSnapshot(projectPath: string): FileSnapshot {
    const files = new Map<string, FileInfo>();
    this.scanDirectory(projectPath, projectPath, files);

    return {
      files,
      timestamp: Date.now(),
    };
  }

  /**
   * Recursively scans a directory and adds relevant files to the snapshot
   */
  private scanDirectory(basePath: string, currentPath: string, files: Map<string, FileInfo>): void {
    if (!existsSync(currentPath)) {
      return;
    }

    let entries: string[];
    try {
      entries = readdirSync(currentPath);
    } catch (_error) {
      this.logger.debug(`Skipping unreadable directory: ${currentPath}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      const relativePath = relative(basePath, fullPath);

      // Skip ignored directories
      if (FileSystemDiffNode.IGNORED_DIRECTORIES.includes(entry)) {
        continue;
      }

      let stats;
      try {
        stats = statSync(fullPath);
      } catch (_error) {
        this.logger.debug(`Skipping unreadable file: ${fullPath}`);
        continue;
      }

      if (stats.isDirectory()) {
        this.scanDirectory(basePath, fullPath, files);
      } else if (stats.isFile()) {
        if (this.isXcodeRelevantFile(relativePath)) {
          files.set(relativePath, {
            exists: true,
            isDirectory: false,
            relativePath,
          });
        }
      }
    }
  }

  /**
   * Computes the difference between two snapshots
   */
  private computeDiff(before: FileSnapshot, after: FileSnapshot): FileDiff {
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Find added and modified files
    for (const [path] of after.files) {
      const beforeInfo = before.files.get(path);
      if (!beforeInfo) {
        // File exists in after but not in before = added
        added.push(path);
      } else {
        // File exists in both = potentially modified
        // For now, we'll track it but Xcode sync mainly cares about add/remove
        modified.push(path);
      }
    }

    // Find removed files
    for (const [path] of before.files) {
      if (!after.files.has(path)) {
        // File exists in before but not in after = removed
        removed.push(path);
      }
    }

    return { added, removed, modified };
  }

  /**
   * Filters the diff to only include files that are relevant for Xcode project management
   */
  private filterXcodeRelevantFiles(diff: FileDiff): FileDiff {
    return {
      added: diff.added.filter(path => this.shouldAddToXcodeProject(path)),
      removed: diff.removed.filter(path => this.shouldAddToXcodeProject(path)),
      modified: diff.modified.filter(path => this.isXcodeRelevantFile(path)),
    };
  }

  /**
   * Determines if a file should be added to the Xcode project
   * This includes source files, headers, resources, etc.
   */
  private shouldAddToXcodeProject(filePath: string): boolean {
    return this.isXcodeRelevantFile(filePath);
  }

  /**
   * Determines if a file is relevant for Xcode project management
   */
  private isXcodeRelevantFile(filePath: string): boolean {
    return FileSystemDiffNode.XCODE_RELEVANT_EXTENSIONS.some(ext =>
      filePath.toLowerCase().endsWith(ext)
    );
  }
}
