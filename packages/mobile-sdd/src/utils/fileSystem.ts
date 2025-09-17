/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { promises as fs } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Error result type for file system operations
 */
export interface FileSystemError {
  isError: true;
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Success result type for file system operations
 */
export interface FileSystemSuccess<T = unknown> {
  isError: false;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  data?: T;
}

/**
 * Union type for file system operation results
 */
export type FileSystemResult<T = unknown> = FileSystemError | FileSystemSuccess<T>;

/**
 * Gets the resources path for instruction files
 * @returns The absolute path to the resources/instructions directory
 */
export function getResourcesPath(): string {
  return resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'resources',
    'instructions'
  );
}

/**
 * Checks if a path exists and is accessible
 * @param path The path to check
 * @returns True if the path exists and is accessible, false otherwise
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param dirPath The directory path to ensure
 * @returns Promise that resolves when directory is ensured
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Ensures a file exists by creating it with empty content if it doesn't exist
 * @param filePath The file path to ensure
 * @param content Optional content to write to the file (defaults to empty string)
 * @returns Promise that resolves when file is ensured
 */
export async function ensureFile(filePath: string, content: string = ''): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    // File doesn't exist, create it
    await fs.writeFile(filePath, content);
  }
}

/**
 * Recursively copies a directory
 * @param sourcePath Source directory path
 * @param targetPath Target directory path
 * @param basePath Base path for relative path calculation (used internally)
 * @returns Array of copied file paths (relative to source)
 */
export async function copyRecursive(
  sourcePath: string,
  targetPath: string,
  basePath: string = ''
): Promise<string[]> {
  const copiedFiles: string[] = [];
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(sourcePath, entry.name);
    const destPath = join(targetPath, entry.name);
    const relativePath = basePath ? join(basePath, entry.name) : entry.name;

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      const nestedFiles = await copyRecursive(srcPath, destPath, relativePath);
      copiedFiles.push(...nestedFiles);
    } else {
      const content = await fs.readFile(srcPath);
      await fs.writeFile(destPath, content);
      copiedFiles.push(relativePath);
    }
  }

  return copiedFiles;
}

/**
 * Validates that a project path exists and is accessible
 * @param projectPath The project path to validate
 * @returns FileSystemResult indicating success or failure
 */
export async function validateProjectPath(projectPath: string): Promise<FileSystemResult> {
  const exists = await pathExists(projectPath);
  if (!exists) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `Error: Project path "${projectPath}" does not exist or is not accessible.`,
        },
      ],
    };
  }
  return {
    isError: false,
    content: [
      {
        type: 'text' as const,
        text: 'Project path is valid.',
      },
    ],
  };
}

/**
 * Validates that a .magen directory exists and contains valid SDD structure
 * @param projectPath The project path
 * @returns FileSystemResult indicating success or failure
 */
export async function validateMagenDirectory(projectPath: string): Promise<FileSystemResult> {
  const magenDir = join(projectPath, '.magen');
  const exists = await pathExists(magenDir);

  if (!exists) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `Error: The .magen directory does not exist in the project path. Please run the sdd-init tool first to initialize the SDD environment.`,
        },
      ],
    };
  }

  // Check if START.md exists to confirm it's a valid SDD project
  const startMdPath = join(magenDir, '.instructions', 'START.md');
  const startExists = await pathExists(startMdPath);

  if (!startExists) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `Error: The START.md file does not exist in the .magen/.instructions directory. The SDD environment may be corrupted. Please run the sdd-init tool again.`,
        },
      ],
    };
  }

  return {
    isError: false,
    content: [
      {
        type: 'text' as const,
        text: 'Magen directory is valid.',
      },
    ],
  };
}

/**
 * Creates a feature directory structure
 * @param magenDir The .magen directory path
 * @param featureId The feature ID
 * @returns FileSystemResult with the created feature directory path
 */
export async function createFeatureDirectory(
  magenDir: string,
  featureId: string
): Promise<
  FileSystemResult<{
    featureDir: string;
    stateJsonPath: string;
    prdPath: string;
    requirementsPath: string;
    tasksPath: string;
  }>
> {
  const featureDir = join(magenDir, featureId);

  // Check if feature directory already exists
  const exists = await pathExists(featureDir);
  if (exists) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `Error: Feature directory ${featureDir} already exists. Please use a different feature ID.`,
        },
      ],
    };
  }

  try {
    await ensureDirectory(featureDir);

    const stateJsonPath = join(featureDir, 'state.json');
    const prdPath = join(featureDir, 'prd.md');
    const requirementsPath = join(featureDir, 'requirements.md');
    const tasksPath = join(featureDir, 'tasks.md');

    return {
      isError: false,
      content: [
        {
          type: 'text' as const,
          text: `Feature directory created successfully.`,
        },
      ],
      data: {
        featureDir,
        stateJsonPath,
        prdPath,
        requirementsPath,
        tasksPath,
      },
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `Error: Failed to create feature directory: ${(error as Error).message}`,
        },
      ],
    };
  }
}
