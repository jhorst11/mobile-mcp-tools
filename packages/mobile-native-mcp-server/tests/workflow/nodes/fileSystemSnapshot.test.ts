/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemSnapshotNode } from '../../../src/workflow/nodes/add-feature/fileSystemSnapshot.js';
import { AddFeatureState } from '../../../src/workflow/add-feature-metadata.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileSystemSnapshotNode', () => {
  let snapshotNode: FileSystemSnapshotNode;
  let tempDir: string;

  beforeEach(() => {
    snapshotNode = new FileSystemSnapshotNode();
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('execute', () => {
    it('should capture snapshot of project files', () => {
      // Create test files
      fs.writeFileSync(path.join(tempDir, 'Test.swift'), 'class Test {}');
      fs.writeFileSync(path.join(tempDir, 'Main.m'), '@interface Main @end');
      fs.writeFileSync(path.join(tempDir, 'Header.h'), '#import <Foundation/Foundation.h>');

      const state: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };

      const result = snapshotNode.execute(state as AddFeatureState);

      expect(result.preIntegrationFileSnapshot).toBeDefined();
      expect(result.preIntegrationFileSnapshot?.files.size).toBe(3);
      expect(result.preIntegrationFileSnapshot?.files.has('Test.swift')).toBe(true);
      expect(result.preIntegrationFileSnapshot?.files.has('Main.m')).toBe(true);
      expect(result.preIntegrationFileSnapshot?.files.has('Header.h')).toBe(true);
    });

    it('should capture files in subdirectories', () => {
      // Create nested directory structure
      const subDir = path.join(tempDir, 'src', 'components');
      fs.mkdirSync(subDir, { recursive: true });

      fs.writeFileSync(path.join(tempDir, 'App.swift'), 'class App {}');
      fs.writeFileSync(path.join(subDir, 'Button.swift'), 'class Button {}');

      const state: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };

      const result = snapshotNode.execute(state as AddFeatureState);

      expect(result.preIntegrationFileSnapshot).toBeDefined();
      expect(result.preIntegrationFileSnapshot?.files.size).toBe(2);
      expect(result.preIntegrationFileSnapshot?.files.has('App.swift')).toBe(true);
      expect(result.preIntegrationFileSnapshot?.files.has('src/components/Button.swift')).toBe(
        true
      );
    });

    it('should only capture Xcode-relevant file types', () => {
      // Create various file types
      fs.writeFileSync(path.join(tempDir, 'Source.swift'), 'class Source {}');
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# README');
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'Image.png'), 'fake-image');

      const state: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };

      const result = snapshotNode.execute(state as AddFeatureState);

      expect(result.preIntegrationFileSnapshot).toBeDefined();
      // Should only capture Source.swift (.json extension is supported but package.json is not a source file we track)
      expect(result.preIntegrationFileSnapshot?.files.size).toBe(1);
      expect(result.preIntegrationFileSnapshot?.files.has('Source.swift')).toBe(true);
      expect(result.preIntegrationFileSnapshot?.files.has('README.md')).toBe(false);
      expect(result.preIntegrationFileSnapshot?.files.has('Image.png')).toBe(false);
    });

    it('should ignore standard ignored directories', () => {
      // Create ignored directories
      const nodeModules = path.join(tempDir, 'node_modules');
      const pods = path.join(tempDir, 'Pods');
      const build = path.join(tempDir, 'build');

      fs.mkdirSync(nodeModules, { recursive: true });
      fs.mkdirSync(pods, { recursive: true });
      fs.mkdirSync(build, { recursive: true });

      fs.writeFileSync(path.join(tempDir, 'App.swift'), 'class App {}');
      fs.writeFileSync(path.join(nodeModules, 'module.swift'), 'should be ignored');
      fs.writeFileSync(path.join(pods, 'Pod.swift'), 'should be ignored');
      fs.writeFileSync(path.join(build, 'Build.swift'), 'should be ignored');

      const state: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };

      const result = snapshotNode.execute(state as AddFeatureState);

      expect(result.preIntegrationFileSnapshot).toBeDefined();
      expect(result.preIntegrationFileSnapshot?.files.size).toBe(1);
      expect(result.preIntegrationFileSnapshot?.files.has('App.swift')).toBe(true);
    });

    it('should handle empty project directory', () => {
      const state: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };

      const result = snapshotNode.execute(state as AddFeatureState);

      expect(result.preIntegrationFileSnapshot).toBeDefined();
      expect(result.preIntegrationFileSnapshot?.files.size).toBe(0);
    });

    it('should return error if project path is missing', () => {
      const state: Partial<AddFeatureState> = {};

      const result = snapshotNode.execute(state as AddFeatureState);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages?.length).toBeGreaterThan(0);
      expect(result.workflowFatalErrorMessages?.[0]).toContain('project path is missing');
    });

    it('should return error if project path does not exist', () => {
      const state: Partial<AddFeatureState> = {
        projectPath: '/nonexistent/path/to/project',
      };

      const result = snapshotNode.execute(state as AddFeatureState);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages?.length).toBeGreaterThan(0);
    });

    it('should capture all Xcode-relevant file extensions', () => {
      // Create files with all supported extensions
      const extensions = [
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

      extensions.forEach((ext, index) => {
        fs.writeFileSync(path.join(tempDir, `File${index}${ext}`), `content ${index}`);
      });

      const state: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };

      const result = snapshotNode.execute(state as AddFeatureState);

      expect(result.preIntegrationFileSnapshot).toBeDefined();
      expect(result.preIntegrationFileSnapshot?.files.size).toBe(extensions.length);
    });

    it('should include timestamp in snapshot', () => {
      fs.writeFileSync(path.join(tempDir, 'Test.swift'), 'class Test {}');

      const state: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };

      const beforeTime = Date.now();
      const result = snapshotNode.execute(state as AddFeatureState);
      const afterTime = Date.now();

      expect(result.preIntegrationFileSnapshot?.timestamp).toBeDefined();
      expect(result.preIntegrationFileSnapshot?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.preIntegrationFileSnapshot?.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle deeply nested directory structures', () => {
      const deepPath = path.join(tempDir, 'a', 'b', 'c', 'd', 'e');
      fs.mkdirSync(deepPath, { recursive: true });
      fs.writeFileSync(path.join(deepPath, 'Deep.swift'), 'class Deep {}');

      const state: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };

      const result = snapshotNode.execute(state as AddFeatureState);

      expect(result.preIntegrationFileSnapshot).toBeDefined();
      expect(result.preIntegrationFileSnapshot?.files.size).toBe(1);
      expect(result.preIntegrationFileSnapshot?.files.has('a/b/c/d/e/Deep.swift')).toBe(true);
    });

    it('should store relative paths correctly', () => {
      const subDir = path.join(tempDir, 'Sources');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'Main.swift'), 'class Main {}');

      const state: Partial<AddFeatureState> = {
        projectPath: tempDir,
      };

      const result = snapshotNode.execute(state as AddFeatureState);

      expect(result.preIntegrationFileSnapshot).toBeDefined();
      const fileInfo = result.preIntegrationFileSnapshot?.files.get('Sources/Main.swift');
      expect(fileInfo).toBeDefined();
      expect(fileInfo?.relativePath).toBe('Sources/Main.swift');
      expect(fileInfo?.exists).toBe(true);
      expect(fileInfo?.isDirectory).toBe(false);
    });
  });
});
