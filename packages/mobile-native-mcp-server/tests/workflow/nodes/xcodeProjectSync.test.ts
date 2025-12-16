/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XcodeProjectSyncNode } from '../../../src/workflow/nodes/xcodeProjectSync.js';
import { XcodeProjectManagementService } from '../../../src/services/xcodeProjectManagementService.js';
import { AddFeatureState } from '../../../src/workflow/add-feature-metadata.js';

describe('XcodeProjectSyncNode', () => {
  let syncNode: XcodeProjectSyncNode;
  let mockService: XcodeProjectManagementService;

  beforeEach(() => {
    mockService = {
      syncProject: vi.fn(),
    } as unknown as XcodeProjectManagementService;
    syncNode = new XcodeProjectSyncNode(mockService);
  });

  describe('execute', () => {
    it('should skip sync for non-iOS platforms', () => {
      const state: Partial<AddFeatureState> = {
        platform: 'Android',
        filesActuallyAdded: ['Test.java'],
      };

      const result = syncNode.execute(state as AddFeatureState);

      expect(result.xcodeUpdateSuccessful).toBe(true);
      expect(mockService.syncProject).not.toHaveBeenCalled();
    });

    it('should skip sync when no file changes detected', () => {
      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        filesActuallyAdded: [],
        filesActuallyRemoved: [],
      };

      const result = syncNode.execute(state as AddFeatureState);

      expect(result.xcodeUpdateSuccessful).toBe(true);
      expect(mockService.syncProject).not.toHaveBeenCalled();
    });

    it('should sync when files were added', () => {
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: ['New.swift'],
        filesRemoved: [],
        target: 'TestApp',
      });

      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        filesActuallyAdded: ['New.swift'],
        filesActuallyRemoved: [],
      };

      const result = syncNode.execute(state as AddFeatureState);

      expect(result.xcodeUpdateSuccessful).toBe(true);
      expect(result.filesAddedToXcode).toEqual(['New.swift']);
      expect(mockService.syncProject).toHaveBeenCalledWith({
        projectPath: '/path/to/project',
        xcodeProjectPath: 'TestApp.xcodeproj',
        filesToAdd: ['New.swift'],
        filesToRemove: [],
        targetName: 'TestApp',
      });
    });

    it('should sync when files were removed', () => {
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: [],
        filesRemoved: ['Old.swift'],
        target: 'TestApp',
      });

      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        filesActuallyAdded: [],
        filesActuallyRemoved: ['Old.swift'],
      };

      const result = syncNode.execute(state as AddFeatureState);

      expect(result.xcodeUpdateSuccessful).toBe(true);
      expect(result.filesRemovedFromXcode).toEqual(['Old.swift']);
      expect(mockService.syncProject).toHaveBeenCalledWith({
        projectPath: '/path/to/project',
        xcodeProjectPath: 'TestApp.xcodeproj',
        filesToAdd: [],
        filesToRemove: ['Old.swift'],
        targetName: 'TestApp',
      });
    });

    it('should sync when both files added and removed', () => {
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: ['New.swift'],
        filesRemoved: ['Old.swift'],
        target: 'TestApp',
      });

      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        filesActuallyAdded: ['New.swift'],
        filesActuallyRemoved: ['Old.swift'],
      };

      const result = syncNode.execute(state as AddFeatureState);

      expect(result.xcodeUpdateSuccessful).toBe(true);
      expect(result.filesAddedToXcode).toEqual(['New.swift']);
      expect(result.filesRemovedFromXcode).toEqual(['Old.swift']);
    });

    it('should handle sync failures gracefully', () => {
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: false,
        error: 'Target not found',
      });

      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        filesActuallyAdded: ['New.swift'],
        filesActuallyRemoved: [],
        integrationErrorMessages: [],
      };

      const result = syncNode.execute(state as AddFeatureState);

      expect(result.xcodeUpdateSuccessful).toBe(false);
      expect(result.integrationErrorMessages).toBeDefined();
      expect(result.integrationErrorMessages?.length).toBeGreaterThan(0);
      expect(result.integrationErrorMessages?.[0]).toContain('Target not found');
    });

    it('should preserve existing error messages when sync fails', () => {
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: false,
        error: 'Sync error',
      });

      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        filesActuallyAdded: ['New.swift'],
        filesActuallyRemoved: [],
        integrationErrorMessages: ['Previous error'],
      };

      const result = syncNode.execute(state as AddFeatureState);

      expect(result.xcodeUpdateSuccessful).toBe(false);
      expect(result.integrationErrorMessages).toContain('Previous error');
      expect(result.integrationErrorMessages?.some(msg => msg.includes('Sync error'))).toBe(true);
    });

    it('should handle service exceptions', () => {
      vi.mocked(mockService.syncProject).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        filesActuallyAdded: ['New.swift'],
        filesActuallyRemoved: [],
        integrationErrorMessages: [],
      };

      const result = syncNode.execute(state as AddFeatureState);

      expect(result.xcodeUpdateSuccessful).toBe(false);
      expect(result.integrationErrorMessages).toBeDefined();
      expect(result.integrationErrorMessages?.some(msg => msg.includes('Unexpected error'))).toBe(
        true
      );
    });

    it('should sync multiple files at once', () => {
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: ['File1.swift', 'File2.swift', 'File3.m'],
        filesRemoved: ['Old1.swift', 'Old2.m'],
        target: 'TestApp',
      });

      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        filesActuallyAdded: ['File1.swift', 'File2.swift', 'File3.m'],
        filesActuallyRemoved: ['Old1.swift', 'Old2.m'],
      };

      const result = syncNode.execute(state as AddFeatureState);

      expect(result.xcodeUpdateSuccessful).toBe(true);
      expect(result.filesAddedToXcode?.length).toBe(3);
      expect(result.filesRemovedFromXcode?.length).toBe(2);
    });

    it('should handle undefined file arrays', () => {
      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        // filesActuallyAdded and filesActuallyRemoved are undefined
      };

      const result = syncNode.execute(state as AddFeatureState);

      expect(result.xcodeUpdateSuccessful).toBe(true);
      expect(mockService.syncProject).not.toHaveBeenCalled();
    });

    it('should handle warnings from sync service', () => {
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: ['New.swift'],
        filesRemoved: [],
        target: 'TestApp',
        warnings: 'Some files were already in project',
      });

      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        filesActuallyAdded: ['New.swift'],
        filesActuallyRemoved: [],
      };

      const result = syncNode.execute(state as AddFeatureState);

      expect(result.xcodeUpdateSuccessful).toBe(true);
      // Warnings should be logged but not fail the operation
    });

    it('should use correct xcodeproj path format', () => {
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: ['New.swift'],
        filesRemoved: [],
        target: 'MyAwesomeApp',
      });

      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'MyAwesomeApp',
        filesActuallyAdded: ['New.swift'],
        filesActuallyRemoved: [],
      };

      syncNode.execute(state as AddFeatureState);

      expect(mockService.syncProject).toHaveBeenCalledWith(
        expect.objectContaining({
          xcodeProjectPath: 'MyAwesomeApp.xcodeproj',
        })
      );
    });

    it('should pass target name correctly', () => {
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: ['New.swift'],
        filesRemoved: [],
        target: 'CustomTarget',
      });

      const state: Partial<AddFeatureState> = {
        platform: 'iOS',
        projectPath: '/path/to/project',
        projectName: 'CustomTarget',
        filesActuallyAdded: ['New.swift'],
        filesActuallyRemoved: [],
      };

      syncNode.execute(state as AddFeatureState);

      expect(mockService.syncProject).toHaveBeenCalledWith(
        expect.objectContaining({
          targetName: 'CustomTarget',
        })
      );
    });
  });
});
