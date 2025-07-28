/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CheckPrerequisitesTool } from '../../../src/tools/environment/checkPrerequisites.js';
import { CommandRunner } from '../../../src/utils/commandRunner.js';

describe('CheckPrerequisitesTool', () => {
  let server: McpServer;
  let tool: CheckPrerequisitesTool;
  const annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };

  beforeEach(() => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new CheckPrerequisitesTool();
    vi.clearAllMocks();
  });

  it('should register the tool without throwing', () => {
    expect(() => tool.register(server, annotations)).not.toThrow();
  });

  it('should have correct tool metadata', () => {
    expect(tool.name).toBe('Environment Prerequisites Checker');
    expect(tool.toolId).toBe('env-check-prerequisites');
    expect(tool.description).toBeTruthy();
  });

  it('should check prerequisites and return success when all tools are found', async () => {
    // Mock CommandRunner methods
    vi.spyOn(CommandRunner, 'exists').mockResolvedValue(true);
    vi.spyOn(CommandRunner, 'getVersion').mockResolvedValue('18.0.0');

    const result = await tool['handleRequest']();

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(true);
    expect(response.details).toBeInstanceOf(Array);
  });

  it('should check prerequisites and return failure when required tools are missing', async () => {
    // Mock CommandRunner to return false for Node.js
    vi.spyOn(CommandRunner, 'exists').mockImplementation(command => {
      return Promise.resolve(command !== 'node');
    });

    const result = await tool['handleRequest']();

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(false);
    expect(response.details).toBeInstanceOf(Array);

    // Find the Node.js check result
    const nodeResult = response.details.find(
      (detail: { tool: string }) => detail.tool === 'Node.js'
    );
    expect(nodeResult?.status).toBe('missing');
  });

  it('should handle version checking correctly', async () => {
    vi.spyOn(CommandRunner, 'exists').mockResolvedValue(true);
    vi.spyOn(CommandRunner, 'getVersion').mockImplementation(command => {
      if (command === 'node') return Promise.resolve('v16.0.0'); // Below minimum
      return Promise.resolve('2.0.0');
    });

    const result = await tool['handleRequest']();
    const response = JSON.parse(result.content[0].text);

    // Find the Node.js check result
    const nodeResult = response.details.find(
      (detail: { tool: string }) => detail.tool === 'Node.js'
    );
    expect(nodeResult?.status).toBe('outdated');
  });

  it('should handle errors gracefully', async () => {
    vi.spyOn(CommandRunner, 'exists').mockRejectedValue(new Error('Command failed'));

    const result = await tool['handleRequest']();

    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Error checking prerequisites');
  });
});
