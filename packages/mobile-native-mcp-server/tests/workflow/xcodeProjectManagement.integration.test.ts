/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileSystemSnapshotNode } from '../../src/workflow/nodes/fileSystemSnapshot.js';
import { FileSystemDiffNode } from '../../src/workflow/nodes/fileSystemDiff.js';
import { XcodeProjectSyncNode } from '../../src/workflow/nodes/xcodeProjectSync.js';
import { XcodeProjectManagementService } from '../../src/services/xcodeProjectManagementService.js';
import { AddFeatureState } from '../../src/workflow/add-feature-metadata.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Xcode Project Management Integration', () => {
  let snapshotNode: FileSystemSnapshotNode;
  let diffNode: FileSystemDiffNode;
  let syncNode: XcodeProjectSyncNode;
  let mockService: XcodeProjectManagementService;
  let tempDir: string;

  beforeEach(() => {
    snapshotNode = new FileSystemSnapshotNode();
    diffNode = new FileSystemDiffNode();
    mockService = {
      syncProject: vi.fn(),
    } as unknown as XcodeProjectManagementService;
    syncNode = new XcodeProjectSyncNode(mockService);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Complete workflow: snapshot -> integration -> diff -> sync', () => {
    it('should track and sync newly added files', async () => {
      // Step 1: Create initial project state
      fs.writeFileSync(path.join(tempDir, 'Original.swift'), 'class Original {}');

      // Step 2: Take snapshot before integration
      let state: Partial<AddFeatureState> = {
        projectPath: tempDir,
        platform: 'iOS',
        projectName: 'TestApp',
      };

      const snapshotResult = snapshotNode.execute(state as AddFeatureState);
      state = { ...state, ...snapshotResult };

      // Verify snapshot captured initial state
      expect(state.preIntegrationFileSnapshot?.files.size).toBe(1);

      // Step 3: Simulate feature integration (LLM adds files)
      fs.writeFileSync(path.join(tempDir, 'Feature1.swift'), 'class Feature1 {}');
      fs.writeFileSync(path.join(tempDir, 'Feature2.m'), '@implementation Feature2 @end');

      // Step 4: Compute diff to see what changed
      const diffResult = diffNode.execute(state as AddFeatureState);
      state = { ...state, ...diffResult };

      // Verify diff detected new files
      expect(state.filesActuallyAdded?.length).toBe(2);
      expect(state.filesActuallyAdded).toContain('Feature1.swift');
      expect(state.filesActuallyAdded).toContain('Feature2.m');

      // Step 5: Mock successful Xcode sync
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: ['Feature1.swift', 'Feature2.m'],
        filesRemoved: [],
        target: 'TestApp',
      });

      // Step 6: Sync Xcode project
      const syncResult = syncNode.execute(state as AddFeatureState);

      // Verify sync was called correctly
      expect(mockService.syncProject).toHaveBeenCalledWith({
        projectPath: tempDir,
        xcodeProjectPath: 'TestApp.xcodeproj',
        filesToAdd: ['Feature1.swift', 'Feature2.m'],
        filesToRemove: [],
        targetName: 'TestApp',
      });

      expect(syncResult.xcodeUpdateSuccessful).toBe(true);
      expect(syncResult.filesAddedToXcode?.length).toBe(2);
    });

    it('should track and sync removed files', async () => {
      // Create initial files
      fs.writeFileSync(path.join(tempDir, 'ToKeep.swift'), 'class ToKeep {}');
      fs.writeFileSync(path.join(tempDir, 'ToRemove.swift'), 'class ToRemove {}');

      let state: Partial<AddFeatureState> = {
        projectPath: tempDir,
        platform: 'iOS',
        projectName: 'TestApp',
      };

      // Take snapshot
      const snapshotResult = snapshotNode.execute(state as AddFeatureState);
      state = { ...state, ...snapshotResult };

      // Simulate integration removing a file
      fs.unlinkSync(path.join(tempDir, 'ToRemove.swift'));

      // Compute diff
      const diffResult = diffNode.execute(state as AddFeatureState);
      state = { ...state, ...diffResult };

      expect(state.filesActuallyRemoved).toContain('ToRemove.swift');

      // Mock sync
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: [],
        filesRemoved: ['ToRemove.swift'],
        target: 'TestApp',
      });

      // Sync
      const syncResult = syncNode.execute(state as AddFeatureState);

      expect(syncResult.xcodeUpdateSuccessful).toBe(true);
      expect(syncResult.filesRemovedFromXcode).toContain('ToRemove.swift');
    });

    it('should handle complex integration with multiple operations', async () => {
      // Initial state
      fs.writeFileSync(path.join(tempDir, 'Existing1.swift'), 'class Existing1 {}');
      fs.writeFileSync(path.join(tempDir, 'Existing2.swift'), 'class Existing2 {}');
      fs.writeFileSync(path.join(tempDir, 'ToModify.swift'), 'class ToModify {}');
      fs.writeFileSync(path.join(tempDir, 'ToRemove.swift'), 'class ToRemove {}');

      let state: Partial<AddFeatureState> = {
        projectPath: tempDir,
        platform: 'iOS',
        projectName: 'TestApp',
      };

      // Snapshot
      const snapshotResult = snapshotNode.execute(state as AddFeatureState);
      state = { ...state, ...snapshotResult };

      // Simulate complex integration
      fs.writeFileSync(path.join(tempDir, 'ToModify.swift'), 'class ToModify { func new() {} }');
      fs.unlinkSync(path.join(tempDir, 'ToRemove.swift'));
      fs.writeFileSync(path.join(tempDir, 'NewFeature1.swift'), 'class NewFeature1 {}');
      fs.writeFileSync(path.join(tempDir, 'NewFeature2.m'), '@implementation NewFeature2 @end');

      // Diff
      const diffResult = diffNode.execute(state as AddFeatureState);
      state = { ...state, ...diffResult };

      expect(state.filesActuallyAdded?.length).toBe(2);
      expect(state.filesActuallyRemoved?.length).toBe(1);
      expect(state.filesActuallyModified?.length).toBeGreaterThan(0);

      // Mock sync
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: ['NewFeature1.swift', 'NewFeature2.m'],
        filesRemoved: ['ToRemove.swift'],
        target: 'TestApp',
      });

      // Sync
      const syncResult = syncNode.execute(state as AddFeatureState);

      expect(syncResult.xcodeUpdateSuccessful).toBe(true);
      expect(mockService.syncProject).toHaveBeenCalledWith(
        expect.objectContaining({
          filesToAdd: expect.arrayContaining(['NewFeature1.swift', 'NewFeature2.m']),
          filesToRemove: expect.arrayContaining(['ToRemove.swift']),
        })
      );
    });

    it('should handle sync failures gracefully', async () => {
      fs.writeFileSync(path.join(tempDir, 'Initial.swift'), 'class Initial {}');

      let state: Partial<AddFeatureState> = {
        projectPath: tempDir,
        platform: 'iOS',
        projectName: 'TestApp',
        integrationErrorMessages: [],
      };

      // Snapshot
      const snapshotResult = snapshotNode.execute(state as AddFeatureState);
      state = { ...state, ...snapshotResult };

      // Add new file
      fs.writeFileSync(path.join(tempDir, 'New.swift'), 'class New {}');

      // Diff
      const diffResult = diffNode.execute(state as AddFeatureState);
      state = { ...state, ...diffResult };

      // Mock sync failure
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: false,
        error: 'Project file not found',
      });

      // Sync
      const syncResult = syncNode.execute(state as AddFeatureState);

      expect(syncResult.xcodeUpdateSuccessful).toBe(false);
      expect(syncResult.integrationErrorMessages).toBeDefined();
      expect(
        syncResult.integrationErrorMessages?.some(msg => msg.includes('Project file not found'))
      ).toBe(true);
    });

    it('should skip sync for Android projects', async () => {
      fs.writeFileSync(path.join(tempDir, 'Initial.java'), 'class Initial {}');

      let state: Partial<AddFeatureState> = {
        projectPath: tempDir,
        platform: 'Android', // Android project
        projectName: 'TestApp',
      };

      // Snapshot
      const snapshotResult = snapshotNode.execute(state as AddFeatureState);
      state = { ...state, ...snapshotResult };

      // Add new file
      fs.writeFileSync(path.join(tempDir, 'New.java'), 'class New {}');

      // Diff (will still detect changes but they won't be Xcode-relevant)
      const diffResult = diffNode.execute(state as AddFeatureState);
      state = { ...state, ...diffResult };

      // Sync should skip
      const syncResult = syncNode.execute(state as AddFeatureState);

      expect(syncResult.xcodeUpdateSuccessful).toBe(true);
      expect(mockService.syncProject).not.toHaveBeenCalled();
    });

    it('should handle nested directory structures', async () => {
      // Create nested structure
      const featuresDir = path.join(tempDir, 'Features', 'Auth');
      fs.mkdirSync(featuresDir, { recursive: true });
      fs.writeFileSync(path.join(featuresDir, 'Initial.swift'), 'class Initial {}');

      let state: Partial<AddFeatureState> = {
        projectPath: tempDir,
        platform: 'iOS',
        projectName: 'TestApp',
      };

      // Snapshot
      const snapshotResult = snapshotNode.execute(state as AddFeatureState);
      state = { ...state, ...snapshotResult };

      // Add new file in nested directory
      fs.writeFileSync(path.join(featuresDir, 'Login.swift'), 'class Login {}');

      // Diff
      const diffResult = diffNode.execute(state as AddFeatureState);
      state = { ...state, ...diffResult };

      expect(state.filesActuallyAdded).toContain('Features/Auth/Login.swift');

      // Mock sync
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: ['Features/Auth/Login.swift'],
        filesRemoved: [],
        target: 'TestApp',
      });

      // Sync
      const syncResult = syncNode.execute(state as AddFeatureState);

      expect(syncResult.xcodeUpdateSuccessful).toBe(true);
      expect(mockService.syncProject).toHaveBeenCalledWith(
        expect.objectContaining({
          filesToAdd: expect.arrayContaining(['Features/Auth/Login.swift']),
        })
      );
    });

    it('should only track Xcode-relevant files throughout workflow', async () => {
      fs.writeFileSync(path.join(tempDir, 'Initial.swift'), 'class Initial {}');

      let state: Partial<AddFeatureState> = {
        projectPath: tempDir,
        platform: 'iOS',
        projectName: 'TestApp',
      };

      // Snapshot
      const snapshotResult = snapshotNode.execute(state as AddFeatureState);
      state = { ...state, ...snapshotResult };

      // Add various file types
      fs.writeFileSync(path.join(tempDir, 'Feature.swift'), 'class Feature {}');
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# README');
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'image.png'), 'fake-image');

      // Diff should only track .swift files
      const diffResult = diffNode.execute(state as AddFeatureState);
      state = { ...state, ...diffResult };

      expect(state.filesActuallyAdded?.length).toBe(1);
      expect(state.filesActuallyAdded).toContain('Feature.swift');
      expect(state.filesActuallyAdded).not.toContain('README.md');

      // Mock sync
      vi.mocked(mockService.syncProject).mockReturnValue({
        success: true,
        filesAdded: ['Feature.swift'],
        filesRemoved: [],
        target: 'TestApp',
      });

      // Sync should only process Swift file
      const syncResult = syncNode.execute(state as AddFeatureState);

      expect(syncResult.xcodeUpdateSuccessful).toBe(true);
      expect(mockService.syncProject).toHaveBeenCalledWith(
        expect.objectContaining({
          filesToAdd: ['Feature.swift'],
        })
      );
    });
  });
});
