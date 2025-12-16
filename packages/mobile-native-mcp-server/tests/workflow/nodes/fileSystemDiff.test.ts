/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemDiffNode } from '../../../src/workflow/nodes/add-feature/fileSystemDiff.js';
import {
  FileSystemSnapshotNode,
  FileSnapshot,
} from '../../../src/workflow/nodes/add-feature/fileSystemSnapshot.js';
import { AddFeatureState } from '../../../src/workflow/add-feature-metadata.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileSystemDiffNode', () => {
  let diffNode: FileSystemDiffNode;
  let snapshotNode: FileSystemSnapshotNode;
  let tempDir: string;

  beforeEach(() => {
    diffNode = new FileSystemDiffNode();
    snapshotNode = new FileSystemSnapshotNode();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diff-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('execute', () => {
    it('should detect newly added files', () => {
      // Create initial state
      fs.writeFileSync(path.join(tempDir, 'Original.swift'), 'class Original {}');

      const snapshotState: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };
      const snapshotResult = snapshotNode.execute(snapshotState as AddFeatureState);

      // Add new files
      fs.writeFileSync(path.join(tempDir, 'New1.swift'), 'class New1 {}');
      fs.writeFileSync(path.join(tempDir, 'New2.m'), '@implementation New2 @end');

      const diffState: Partial<AddFeatureState> = {
        projectPath: tempDir,
        preIntegrationFileSnapshot: snapshotResult.preIntegrationFileSnapshot,
      };

      const result = diffNode.execute(diffState as AddFeatureState);

      expect(result.filesActuallyAdded).toBeDefined();
      expect(result.filesActuallyAdded?.length).toBe(2);
      expect(result.filesActuallyAdded).toContain('New1.swift');
      expect(result.filesActuallyAdded).toContain('New2.m');
    });

    it('should detect removed files', () => {
      // Create initial files
      fs.writeFileSync(path.join(tempDir, 'ToKeep.swift'), 'class ToKeep {}');
      fs.writeFileSync(path.join(tempDir, 'ToRemove1.swift'), 'class ToRemove1 {}');
      fs.writeFileSync(path.join(tempDir, 'ToRemove2.m'), '@implementation ToRemove2 @end');

      const snapshotState: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };
      const snapshotResult = snapshotNode.execute(snapshotState as AddFeatureState);

      // Remove files
      fs.unlinkSync(path.join(tempDir, 'ToRemove1.swift'));
      fs.unlinkSync(path.join(tempDir, 'ToRemove2.m'));

      const diffState: Partial<AddFeatureState> = {
        projectPath: tempDir,
        preIntegrationFileSnapshot: snapshotResult.preIntegrationFileSnapshot,
      };

      const result = diffNode.execute(diffState as AddFeatureState);

      expect(result.filesActuallyRemoved).toBeDefined();
      expect(result.filesActuallyRemoved?.length).toBe(2);
      expect(result.filesActuallyRemoved).toContain('ToRemove1.swift');
      expect(result.filesActuallyRemoved).toContain('ToRemove2.m');
    });

    it('should detect both additions and removals', () => {
      // Create initial files
      fs.writeFileSync(path.join(tempDir, 'Old.swift'), 'class Old {}');
      fs.writeFileSync(path.join(tempDir, 'ToRemove.swift'), 'class ToRemove {}');

      const snapshotState: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };
      const snapshotResult = snapshotNode.execute(snapshotState as AddFeatureState);

      // Remove one, add one
      fs.unlinkSync(path.join(tempDir, 'ToRemove.swift'));
      fs.writeFileSync(path.join(tempDir, 'New.swift'), 'class New {}');

      const diffState: Partial<AddFeatureState> = {
        projectPath: tempDir,
        preIntegrationFileSnapshot: snapshotResult.preIntegrationFileSnapshot,
      };

      const result = diffNode.execute(diffState as AddFeatureState);

      expect(result.filesActuallyAdded).toContain('New.swift');
      expect(result.filesActuallyRemoved).toContain('ToRemove.swift');
      expect(result.filesActuallyModified).toBeDefined();
    });

    it('should detect modified files', () => {
      // Create initial file
      fs.writeFileSync(path.join(tempDir, 'Modified.swift'), 'class Modified {}');

      const snapshotState: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };
      const snapshotResult = snapshotNode.execute(snapshotState as AddFeatureState);

      // Modify the file
      fs.writeFileSync(path.join(tempDir, 'Modified.swift'), 'class Modified { func new() {} }');

      const diffState: Partial<AddFeatureState> = {
        projectPath: tempDir,
        preIntegrationFileSnapshot: snapshotResult.preIntegrationFileSnapshot,
      };

      const result = diffNode.execute(diffState as AddFeatureState);

      expect(result.filesActuallyModified).toBeDefined();
      expect(result.filesActuallyModified).toContain('Modified.swift');
      // Modified files should not appear in added or removed
      expect(result.filesActuallyAdded).not.toContain('Modified.swift');
      expect(result.filesActuallyRemoved).not.toContain('Modified.swift');
    });

    it('should handle no changes', () => {
      // Create initial files
      fs.writeFileSync(path.join(tempDir, 'Unchanged.swift'), 'class Unchanged {}');

      const snapshotState: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };
      const snapshotResult = snapshotNode.execute(snapshotState as AddFeatureState);

      // No changes
      const diffState: Partial<AddFeatureState> = {
        projectPath: tempDir,
        preIntegrationFileSnapshot: snapshotResult.preIntegrationFileSnapshot,
      };

      const result = diffNode.execute(diffState as AddFeatureState);

      expect(result.filesActuallyAdded).toEqual([]);
      expect(result.filesActuallyRemoved).toEqual([]);
    });

    it('should only track Xcode-relevant files', () => {
      const snapshotState: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };
      const snapshotResult = snapshotNode.execute(snapshotState as AddFeatureState);

      // Add various file types
      fs.writeFileSync(path.join(tempDir, 'Source.swift'), 'class Source {}');
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# README');
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const diffState: Partial<AddFeatureState> = {
        projectPath: tempDir,
        preIntegrationFileSnapshot: snapshotResult.preIntegrationFileSnapshot,
      };

      const result = diffNode.execute(diffState as AddFeatureState);

      expect(result.filesActuallyAdded).toContain('Source.swift');
      expect(result.filesActuallyAdded).not.toContain('README.md');
      expect(result.filesActuallyAdded).not.toContain('package.json');
    });

    it('should handle files in subdirectories', () => {
      const subDir = path.join(tempDir, 'Sources', 'Models');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'Initial.swift'), 'class Initial {}');

      const snapshotState: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };
      const snapshotResult = snapshotNode.execute(snapshotState as AddFeatureState);

      // Add new file in subdirectory
      fs.writeFileSync(path.join(subDir, 'New.swift'), 'class New {}');

      const diffState: Partial<AddFeatureState> = {
        projectPath: tempDir,
        preIntegrationFileSnapshot: snapshotResult.preIntegrationFileSnapshot,
      };

      const result = diffNode.execute(diffState as AddFeatureState);

      expect(result.filesActuallyAdded).toContain('Sources/Models/New.swift');
    });

    it('should return empty arrays when no pre-integration snapshot exists', () => {
      fs.writeFileSync(path.join(tempDir, 'Test.swift'), 'class Test {}');

      const state: Partial<AddFeatureState> = {
        projectPath: tempDir,
        // No preIntegrationFileSnapshot
      };

      const result = diffNode.execute(state as AddFeatureState);

      expect(result.filesActuallyAdded).toEqual([]);
      expect(result.filesActuallyRemoved).toEqual([]);
      expect(result.filesActuallyModified).toEqual([]);
    });

    it('should return error if project path is missing', () => {
      const snapshot: FileSnapshot = {
        files: new Map(),
        timestamp: Date.now(),
      };

      const state: Partial<AddFeatureState> = {
        preIntegrationFileSnapshot: snapshot,
        // No projectPath
      };

      const result = diffNode.execute(state as AddFeatureState);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages?.length).toBeGreaterThan(0);
    });

    it('should handle multiple files with same extension', () => {
      const snapshotState: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };
      const snapshotResult = snapshotNode.execute(snapshotState as AddFeatureState);

      // Add multiple Swift files
      fs.writeFileSync(path.join(tempDir, 'Model1.swift'), 'class Model1 {}');
      fs.writeFileSync(path.join(tempDir, 'Model2.swift'), 'class Model2 {}');
      fs.writeFileSync(path.join(tempDir, 'Model3.swift'), 'class Model3 {}');

      const diffState: Partial<AddFeatureState> = {
        projectPath: tempDir,
        preIntegrationFileSnapshot: snapshotResult.preIntegrationFileSnapshot,
      };

      const result = diffNode.execute(diffState as AddFeatureState);

      expect(result.filesActuallyAdded?.length).toBe(3);
      expect(result.filesActuallyAdded).toContain('Model1.swift');
      expect(result.filesActuallyAdded).toContain('Model2.swift');
      expect(result.filesActuallyAdded).toContain('Model3.swift');
    });

    it('should ignore files in ignored directories', () => {
      const snapshotState: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };
      const snapshotResult = snapshotNode.execute(snapshotState as AddFeatureState);

      // Add files in ignored directories
      const podsDir = path.join(tempDir, 'Pods');
      fs.mkdirSync(podsDir, { recursive: true });
      fs.writeFileSync(path.join(podsDir, 'Pod.swift'), 'class Pod {}');

      // Add a normal file
      fs.writeFileSync(path.join(tempDir, 'App.swift'), 'class App {}');

      const diffState: Partial<AddFeatureState> = {
        projectPath: tempDir,
        preIntegrationFileSnapshot: snapshotResult.preIntegrationFileSnapshot,
      };

      const result = diffNode.execute(diffState as AddFeatureState);

      expect(result.filesActuallyAdded).toContain('App.swift');
      expect(result.filesActuallyAdded).not.toContain('Pods/Pod.swift');
    });

    it('should handle complex scenario with multiple operations', () => {
      // Initial state
      fs.writeFileSync(path.join(tempDir, 'Keep.swift'), 'class Keep {}');
      fs.writeFileSync(path.join(tempDir, 'Modify.swift'), 'class Modify {}');
      fs.writeFileSync(path.join(tempDir, 'Remove.swift'), 'class Remove {}');

      const snapshotState: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };
      const snapshotResult = snapshotNode.execute(snapshotState as AddFeatureState);

      // Perform multiple operations
      fs.writeFileSync(path.join(tempDir, 'Modify.swift'), 'class Modify { func updated() {} }');
      fs.unlinkSync(path.join(tempDir, 'Remove.swift'));
      fs.writeFileSync(path.join(tempDir, 'Add1.swift'), 'class Add1 {}');
      fs.writeFileSync(path.join(tempDir, 'Add2.m'), '@implementation Add2 @end');

      const diffState: Partial<AddFeatureState> = {
        projectPath: tempDir,
        preIntegrationFileSnapshot: snapshotResult.preIntegrationFileSnapshot,
      };

      const result = diffNode.execute(diffState as AddFeatureState);

      expect(result.filesActuallyAdded?.length).toBe(2);
      expect(result.filesActuallyAdded).toContain('Add1.swift');
      expect(result.filesActuallyAdded).toContain('Add2.m');

      expect(result.filesActuallyRemoved?.length).toBe(1);
      expect(result.filesActuallyRemoved).toContain('Remove.swift');

      expect(result.filesActuallyModified).toContain('Modify.swift');
      expect(result.filesActuallyModified).toContain('Keep.swift');
    });
  });
});
