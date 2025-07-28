/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BuildRunOnSimulatorTool } from '../../../src/tools/build/runOnSimulator.js';
import { BuildManager } from '../../../src/utils/buildManager.js';
import { FileUtils } from '../../../src/utils/fileUtils.js';

describe('BuildRunOnSimulatorTool', () => {
  let server: McpServer;
  let tool: BuildRunOnSimulatorTool;
  const annotations = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  };

  beforeEach(() => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new BuildRunOnSimulatorTool();
    vi.clearAllMocks();
  });

  it('should register the tool without throwing', () => {
    expect(() => tool.register(server, annotations)).not.toThrow();
  });

  it('should have correct tool metadata', () => {
    expect(tool.name).toBe('Build and Run on Simulator');
    expect(tool.toolId).toBe('build-run-on-simulator');
    expect(tool.description).toBeTruthy();
  });

  it('should return error if project path does not exist', async () => {
    vi.spyOn(FileUtils, 'exists').mockResolvedValue(false);

    const result = await tool['handleRequest']({
      projectPath: '/nonexistent/path',
      configuration: 'debug',
      clean: false,
      install: true,
      launch: true,
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(false);
    expect(response.error).toContain('Project directory does not exist');
  });

  it('should return error if platform cannot be detected', async () => {
    vi.spyOn(FileUtils, 'exists').mockResolvedValue(true);
    vi.spyOn(BuildManager, 'detectPlatform').mockResolvedValue(null);

    const result = await tool['handleRequest']({
      projectPath: '/test/path',
      configuration: 'debug',
      clean: false,
      install: true,
      launch: true,
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(false);
    expect(response.error).toContain('Could not detect project platform');
  });

  it('should return error for iOS on non-macOS', async () => {
    vi.spyOn(FileUtils, 'exists').mockResolvedValue(true);
    vi.spyOn(BuildManager, 'detectPlatform').mockResolvedValue('ios');

    // Mock process.platform to not be darwin
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux' });

    const result = await tool['handleRequest']({
      projectPath: '/test/path',
      configuration: 'debug',
      clean: false,
      install: true,
      launch: true,
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(false);
    expect(response.error).toContain('iOS development is only supported on macOS');

    // Restore original platform
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('should handle successful build and deploy', async () => {
    vi.spyOn(FileUtils, 'exists').mockResolvedValue(true);
    vi.spyOn(BuildManager, 'detectPlatform').mockResolvedValue('android');
    vi.spyOn(BuildManager, 'buildAndDeploy').mockResolvedValue({
      success: true,
      appPath: '/test/app.apk',
      deviceId: 'emulator-5554',
      deviceName: 'Test Device',
      appBundleId: 'com.test.app',
      buildLogPath: '/test/build.log',
    });

    const result = await tool['handleRequest']({
      projectPath: '/test/path',
      configuration: 'debug',
      clean: false,
      install: true,
      launch: true,
      targetDevice: 'Test Device',
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(true);
    expect(response.appPath).toBe('/test/app.apk');
    expect(response.deviceId).toBe('emulator-5554');
    expect(response.deviceName).toBe('Test Device');
    expect(response.appBundleId).toBe('com.test.app');
    expect(response.buildLogUri).toBe('file:///test/build.log');
  });

  it('should handle build failure', async () => {
    vi.spyOn(FileUtils, 'exists').mockResolvedValue(true);
    vi.spyOn(BuildManager, 'detectPlatform').mockResolvedValue('android');
    vi.spyOn(BuildManager, 'buildAndDeploy').mockResolvedValue({
      success: false,
      error: 'Build failed: Missing dependencies',
      buildLogPath: '/test/build.log',
    });

    const result = await tool['handleRequest']({
      projectPath: '/test/path',
      configuration: 'debug',
      clean: false,
      install: true,
      launch: true,
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(false);
    expect(response.error).toContain('Build failed: Missing dependencies');
    expect(response.buildLogUri).toBe('file:///test/build.log');
  });

  it('should handle exceptions gracefully', async () => {
    vi.spyOn(FileUtils, 'exists').mockRejectedValue(new Error('File system error'));

    const result = await tool['handleRequest']({
      projectPath: '/test/path',
      configuration: 'debug',
      clean: false,
      install: true,
      launch: true,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Error building and deploying project');
  });
});
