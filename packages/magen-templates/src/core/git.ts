/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

/**
 * Result of git availability check
 */
export interface GitAvailabilityResult {
  available: boolean;
  version?: string;
  error?: string;
}

/**
 * Checks if git is available in the environment
 *
 * @returns GitAvailabilityResult with availability status and version if available
 */
export function checkGitAvailability(): GitAvailabilityResult {
  try {
    const version = execSync('git --version', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    return {
      available: true,
      version,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error checking git availability',
    };
  }
}

/**
 * Ensures git is available, throwing an error if not
 *
 * @throws Error if git is not available
 */
export function ensureGitAvailable(): void {
  const result = checkGitAvailability();
  if (!result.available) {
    throw new Error(
      `Git is required but not available. Please install git and ensure it's in your PATH.\n${result.error || ''}`
    );
  }
}

/**
 * Create a git patch from differences between parent and child directories
 *
 * @param parentDir - Directory containing parent template files
 * @param childDir - Directory containing child template files (with changes)
 * @param outputPath - Path where the patch file should be written
 * @throws Error if git operations fail
 */
export function createPatch(parentDir: string, childDir: string, outputPath: string): void {
  ensureGitAvailable();

  try {
    // Create patch using git diff with no-index (compare two paths without git repo)
    const patch = execSync(`git diff --no-prefix --no-index "${parentDir}" "${childDir}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large patches
    });

    // Write patch to output file
    writeFileSync(outputPath, patch, 'utf-8');
  } catch (error) {
    // git diff returns exit code 1 when there are differences, which is expected
    // Only throw if there's an actual error (not just differences found)
    if (error instanceof Error && 'status' in error) {
      const execError = error as { status?: number; stdout?: Buffer; stderr?: Buffer };
      if (execError.status === 1 && execError.stdout) {
        // Differences found - this is expected, write the patch
        writeFileSync(outputPath, execError.stdout.toString('utf-8'), 'utf-8');
        return;
      }
    }
    throw new Error(
      `Failed to create patch: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Apply a git patch to a target directory
 *
 * @param targetDir - Directory where the patch should be applied
 * @param patchPath - Path to the patch file
 * @throws Error if patch application fails
 */
export function applyPatch(targetDir: string, patchPath: string): void {
  ensureGitAvailable();

  try {
    // Apply patch from target directory (git apply expects to run from the target)
    execSync(`git apply "${patchPath}"`, {
      cwd: targetDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(
      `Failed to apply patch ${patchPath} to ${targetDir}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
