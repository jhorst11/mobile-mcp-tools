/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import { checkGitAvailability, ensureGitAvailable } from '../src/core/git.js';

describe('Git Availability', () => {
  it('should detect git availability', () => {
    const result = checkGitAvailability();
    expect(result).toHaveProperty('available');
    expect(typeof result.available).toBe('boolean');

    if (result.available) {
      expect(result.version).toBeDefined();
      expect(result.version).toContain('git version');
    } else {
      expect(result.error).toBeDefined();
    }
  });

  it('should return version string when git is available', () => {
    const result = checkGitAvailability();
    // This test will pass if git is installed, which is required for this package
    if (result.available) {
      expect(result.version).toMatch(/git version/i);
    }
  });

  it('should throw error if git is not available when calling ensureGitAvailable', () => {
    const result = checkGitAvailability();

    if (result.available) {
      // If git is available, ensureGitAvailable should not throw
      expect(() => ensureGitAvailable()).not.toThrow();
    } else {
      // If git is not available, ensureGitAvailable should throw
      expect(() => ensureGitAvailable()).toThrow(/Git is required/);
    }
  });

  it('should not throw when git is available', () => {
    const result = checkGitAvailability();

    if (result.available) {
      expect(() => ensureGitAvailable()).not.toThrow();
    }
  });
});
