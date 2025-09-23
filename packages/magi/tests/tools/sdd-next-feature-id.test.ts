/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SddNextFeatureIdTool } from '../../src/tools/sdd-next-feature-id/tool.js';
import { SddInitTool } from '../../src/tools/sdd-init/tool.js';

describe('SddNextFeatureIdTool', () => {
  let tempDir: string;
  let tool: SddNextFeatureIdTool;
  let initTool: SddInitTool;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = join(tmpdir(), `sdd-next-feature-id-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    tool = new SddNextFeatureIdTool();
    initTool = new SddInitTool();
  });

  afterEach(async () => {
    // Clean up the temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should return 001 for the first feature when no features exist', async () => {
    // Initialize the SDD environment
    await initTool.initialize({ projectPath: tempDir });

    const result = await tool.getNextFeatureId({
      projectPath: tempDir,
      featureName: 'add-login-screen',
    });

    expect(result.isError).toBe(undefined);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toBe('Next feature ID: 001-add-login-screen');
    expect(result.data).toEqual({
      featureId: '001-add-login-screen',
      featureName: 'add-login-screen',
      featureNumber: '001',
    });
  });

  it('should return the next sequential number when features exist', async () => {
    // Initialize the SDD environment
    await initTool.initialize({ projectPath: tempDir });

    const magenDir = join(tempDir, 'magi-sdd');

    // Create some existing feature directories
    await fs.mkdir(join(magenDir, '001-first-feature'), { recursive: true });
    await fs.mkdir(join(magenDir, '002-second-feature'), { recursive: true });
    await fs.mkdir(join(magenDir, '004-fourth-feature'), { recursive: true });

    const result = await tool.getNextFeatureId({
      projectPath: tempDir,
      featureName: 'add-login-screen',
    });

    expect(result.isError).toBe(undefined);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toBe('Next feature ID: 003-add-login-screen');
    expect(result.data).toEqual({
      featureId: '003-add-login-screen',
      featureName: 'add-login-screen',
      featureNumber: '003',
    });
  });

  it('should handle non-sequential gaps in feature numbers', async () => {
    // Initialize the SDD environment
    await initTool.initialize({ projectPath: tempDir });

    const magenDir = join(tempDir, 'magi-sdd');

    // Create some existing feature directories with gaps
    await fs.mkdir(join(magenDir, '001-first-feature'), { recursive: true });
    await fs.mkdir(join(magenDir, '003-third-feature'), { recursive: true });
    await fs.mkdir(join(magenDir, '005-fifth-feature'), { recursive: true });

    const result = await tool.getNextFeatureId({
      projectPath: tempDir,
      featureName: 'fill-the-gap',
    });

    expect(result.isError).toBe(undefined);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toBe('Next feature ID: 002-fill-the-gap');
    expect(result.data).toEqual({
      featureId: '002-fill-the-gap',
      featureName: 'fill-the-gap',
      featureNumber: '002',
    });
  });

  it('should ignore non-feature directories and files', async () => {
    // Initialize the SDD environment
    await initTool.initialize({ projectPath: tempDir });

    const magenDir = join(tempDir, 'magi-sdd');

    // Create some existing feature directories and non-feature items
    await fs.mkdir(join(magenDir, '001-first-feature'), { recursive: true });
    await fs.mkdir(join(magenDir, '002-second-feature'), { recursive: true });
    await fs.mkdir(join(magenDir, 'random-directory'), { recursive: true });
    await fs.mkdir(join(magenDir, '.instructions'), { recursive: true });
    await fs.writeFile(join(magenDir, 'random-file.txt'), 'content');

    const result = await tool.getNextFeatureId({
      projectPath: tempDir,
      featureName: 'new-feature',
    });

    expect(result.isError).toBe(undefined);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toBe('Next feature ID: 003-new-feature');
    expect(result.data).toEqual({
      featureId: '003-new-feature',
      featureName: 'new-feature',
      featureNumber: '003',
    });
  });

  it('should return error if project path does not exist', async () => {
    const result = await tool.getNextFeatureId({
      projectPath: '/nonexistent/path',
      featureName: 'test-feature',
    });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('does not exist or is not accessible');
  });

  it('should return error if magi-sdd directory is not initialized', async () => {
    const result = await tool.getNextFeatureId({
      projectPath: tempDir,
      featureName: 'test-feature',
    });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('does not exist in the project path');
  });
});
