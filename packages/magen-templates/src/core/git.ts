/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { execSync } from 'child_process';

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
