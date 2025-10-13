/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import {
  generateNextFeatureId,
  isValidFeatureId,
  extractFeatureIdPrefix,
} from '../../../../src/tools/magi/utils/featureIdGenerator.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    readdir: vi.fn(),
  },
}));

describe('featureIdGenerator', () => {
  const mockFs = vi.mocked(fs);
  const testProjectPath = '/test/project';
  const expectedMagiDir = path.join(testProjectPath, 'magi-sdd');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateNextFeatureId', () => {
    it('should generate 001-feature-name when no existing directories', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      const result = await generateNextFeatureId(testProjectPath, 'Feature Name');

      expect(mockFs.mkdir).toHaveBeenCalledWith(expectedMagiDir, { recursive: true });
      expect(mockFs.readdir).toHaveBeenCalledWith(expectedMagiDir, { withFileTypes: true });
      expect(result).toBe('001-feature-name');
    });

    it('should increment from existing feature IDs', async () => {
      const mockDirents = [
        { name: '001-user-auth', isDirectory: () => true },
        { name: '002-payment-flow', isDirectory: () => true },
        { name: 'non-numeric-dir', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
      ];

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(mockDirents as any);

      const result = await generateNextFeatureId(testProjectPath, 'New Feature');

      expect(result).toBe('003-new-feature');
    });

    it('should handle special characters in feature name', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      const result = await generateNextFeatureId(testProjectPath, 'Feature@#$%^&*()Name!!!');

      expect(result).toBe('001-featurename');
    });

    it('should handle spaces and multiple hyphens', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      const result = await generateNextFeatureId(
        testProjectPath,
        'Feature   With    Spaces---And--Hyphens'
      );

      expect(result).toBe('001-feature-with-spaces-and-hyphens');
    });

    it('should handle leading and trailing hyphens', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      const result = await generateNextFeatureId(testProjectPath, '---feature-name---');

      expect(result).toBe('001-feature-name');
    });

    it('should handle empty feature name', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      const result = await generateNextFeatureId(testProjectPath, '');

      expect(result).toBe('001-');
    });

    it('should handle directory read error by returning 001', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockRejectedValue(new Error('Directory not accessible'));

      const result = await generateNextFeatureId(testProjectPath, 'Feature Name');

      expect(result).toBe('001-feature-name');
    });

    it('should handle mkdir error by returning 001', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const result = await generateNextFeatureId(testProjectPath, 'Feature Name');

      expect(result).toBe('001-feature-name');
    });

    it('should handle non-numeric prefixes correctly', async () => {
      const mockDirents = [
        { name: 'abc-feature', isDirectory: () => true },
        { name: '005-valid-feature', isDirectory: () => true },
        { name: '1-invalid-format', isDirectory: () => true }, // Only 1 digit
      ];

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(mockDirents as any);

      const result = await generateNextFeatureId(testProjectPath, 'New Feature');

      expect(result).toBe('006-new-feature'); // Should increment from 005
    });

    it('should pad single digit numbers correctly', async () => {
      const mockDirents = [
        { name: '001-feature-one', isDirectory: () => true },
        { name: '002-feature-two', isDirectory: () => true },
        { name: '009-feature-nine', isDirectory: () => true },
      ];

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(mockDirents as any);

      const result = await generateNextFeatureId(testProjectPath, 'Feature Ten');

      expect(result).toBe('010-feature-ten');
    });
  });

  describe('isValidFeatureId', () => {
    it('should return true for valid feature IDs', () => {
      expect(isValidFeatureId('001-user-auth')).toBe(true);
      expect(isValidFeatureId('123-payment-flow')).toBe(true);
      expect(isValidFeatureId('999-complex-feature-name')).toBe(true);
      expect(isValidFeatureId('001-a')).toBe(true);
      expect(isValidFeatureId('001-123')).toBe(true);
    });

    it('should return false for invalid feature IDs', () => {
      expect(isValidFeatureId('1-user-auth')).toBe(false); // Not 3 digits
      expect(isValidFeatureId('1234-user-auth')).toBe(false); // More than 3 digits
      expect(isValidFeatureId('abc-user-auth')).toBe(false); // Non-numeric prefix
      expect(isValidFeatureId('001_user_auth')).toBe(false); // Underscores not allowed
      expect(isValidFeatureId('001-User-Auth')).toBe(false); // Uppercase not allowed
      expect(isValidFeatureId('001-user@auth')).toBe(false); // Special characters not allowed
      expect(isValidFeatureId('001')).toBe(false); // Missing feature name
      expect(isValidFeatureId('user-auth')).toBe(false); // Missing numeric prefix
      expect(isValidFeatureId('')).toBe(false); // Empty string
    });
  });

  describe('extractFeatureIdPrefix', () => {
    it('should extract numeric prefix from valid feature IDs', () => {
      expect(extractFeatureIdPrefix('001-user-auth')).toBe(1);
      expect(extractFeatureIdPrefix('123-payment-flow')).toBe(123);
      expect(extractFeatureIdPrefix('999-complex-feature')).toBe(999);
      expect(extractFeatureIdPrefix('000-zero-prefix')).toBe(0);
    });

    it('should return null for invalid feature IDs', () => {
      expect(extractFeatureIdPrefix('1-user-auth')).toBeNull(); // Not 3 digits
      expect(extractFeatureIdPrefix('abc-user-auth')).toBeNull(); // Non-numeric prefix
      expect(extractFeatureIdPrefix('user-auth')).toBeNull(); // No numeric prefix
      expect(extractFeatureIdPrefix('')).toBeNull(); // Empty string
      expect(extractFeatureIdPrefix('001')).toBeNull(); // No hyphen
    });

    it('should handle edge cases', () => {
      expect(extractFeatureIdPrefix('001-')).toBe(1); // Empty feature name but valid format
      expect(extractFeatureIdPrefix('001-123-456')).toBe(1); // Multiple hyphens
    });
  });
});


