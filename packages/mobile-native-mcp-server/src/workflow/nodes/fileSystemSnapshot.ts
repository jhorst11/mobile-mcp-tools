/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../add-feature-metadata.js';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

/**
 * Represents a snapshot of files in the project at a point in time
 */
export interface FileSnapshot {
  files: Map<string, FileInfo>;
  timestamp: number;
  xcodeProjectFiles?: Map<string, FileInfo>; // Separate tracking of .pbxproj files
}

export interface FileInfo {
  exists: boolean;
  isDirectory: boolean;
  relativePath: string;
}

/**
 * Captures a snapshot of all source files in the project before feature integration.
 * This snapshot is used later to determine what files were actually added or removed
 * by comparing against a post-integration snapshot.
 */
export class FileSystemSnapshotNode extends BaseNode<AddFeatureState> {
  protected readonly logger: Logger;

  // File extensions that are relevant for Xcode project management
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

  constructor(logger?: Logger) {
    super('captureFileSystemSnapshot');
    this.logger = logger ?? createComponentLogger('FileSystemSnapshotNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    if (!state.projectPath) {
      this.logger.error('Project path is required for file system snapshot');
      return {
        workflowFatalErrorMessages: [
          'Cannot capture file system snapshot: project path is missing',
        ],
      };
    }

    if (!existsSync(state.projectPath)) {
      this.logger.error(
        'Project path does not exist',
        new Error(`Project path does not exist: ${state.projectPath}`)
      );
      return {
        workflowFatalErrorMessages: [
          `Cannot capture file system snapshot: project path does not exist: ${state.projectPath}`,
        ],
      };
    }

    try {
      const snapshot = this.captureSnapshot(state.projectPath, state.platform);

      this.logger.info('Captured file system snapshot', {
        projectPath: state.projectPath,
        fileCount: snapshot.files.size,
        xcodeProjectFileCount: snapshot.xcodeProjectFiles?.size || 0,
      });

      return {
        preIntegrationFileSnapshot: snapshot,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to capture file system snapshot', error as Error);
      return {
        workflowFatalErrorMessages: [`Failed to capture file system snapshot: ${errorMessage}`],
      };
    }
  };

  /**
   * Recursively scans the project directory and captures all relevant files
   */
  private captureSnapshot(projectPath: string, platform?: string): FileSnapshot {
    const files = new Map<string, FileInfo>();
    const xcodeProjectFiles = new Map<string, FileInfo>();

    this.scanDirectory(projectPath, projectPath, files);

    // For iOS projects, also track .pbxproj files separately for conflict detection
    if (platform === 'iOS') {
      this.scanXcodeProjectFiles(projectPath, projectPath, xcodeProjectFiles);
    }

    return {
      files,
      xcodeProjectFiles: xcodeProjectFiles.size > 0 ? xcodeProjectFiles : undefined,
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
      // Skip directories we can't read
      this.logger.debug(`Skipping unreadable directory: ${currentPath}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      const relativePath = relative(basePath, fullPath);

      // Skip ignored directories
      if (FileSystemSnapshotNode.IGNORED_DIRECTORIES.includes(entry)) {
        continue;
      }

      let stats;
      try {
        stats = statSync(fullPath);
      } catch (_error) {
        // Skip files we can't stat
        this.logger.debug(`Skipping unreadable file: ${fullPath}`);
        continue;
      }

      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        this.scanDirectory(basePath, fullPath, files);
      } else if (stats.isFile()) {
        // Check if file is relevant for Xcode project
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
   * Determines if a file should be tracked based on its extension
   */
  private isXcodeRelevantFile(filePath: string): boolean {
    return FileSystemSnapshotNode.XCODE_RELEVANT_EXTENSIONS.some(ext =>
      filePath.toLowerCase().endsWith(ext)
    );
  }

  /**
   * Scans for Xcode project files (.pbxproj) to track for manual modification detection
   */
  private scanXcodeProjectFiles(
    basePath: string,
    currentPath: string,
    xcodeFiles: Map<string, FileInfo>
  ): void {
    if (!existsSync(currentPath)) {
      return;
    }

    let entries: string[];
    try {
      entries = readdirSync(currentPath);
    } catch (_error) {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentPath, entry);

      // Look for .xcodeproj directories
      if (entry.endsWith('.xcodeproj')) {
        const pbxprojPath = join(fullPath, 'project.pbxproj');
        if (existsSync(pbxprojPath)) {
          const pbxprojRelative = relative(basePath, pbxprojPath);
          xcodeFiles.set(pbxprojRelative, {
            exists: true,
            isDirectory: false,
            relativePath: pbxprojRelative,
          });
        }
        // Don't recurse into .xcodeproj
        continue;
      }

      // Skip ignored directories
      if (FileSystemSnapshotNode.IGNORED_DIRECTORIES.includes(entry)) {
        continue;
      }

      let stats;
      try {
        stats = statSync(fullPath);
      } catch (_error) {
        continue;
      }

      if (stats.isDirectory()) {
        this.scanXcodeProjectFiles(basePath, fullPath, xcodeFiles);
      }
    }
  }
}
