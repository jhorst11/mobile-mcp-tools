/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SddInitTool } from '../../../src/tools/sdd-init/tool.js';
import { promises as fs } from 'fs';
import { join } from 'path';

// Mock the fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      access: vi.fn(),
      mkdir: vi.fn(),
      readdir: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    },
  };
});

describe('SddInitTool', () => {
  const mockServer = {
    tool: vi.fn(),
  };

  const mockAnnotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register with the MCP server', () => {
    const tool = new SddInitTool();

    tool.register(mockServer as any, mockAnnotations);

    expect(mockServer.tool).toHaveBeenCalledWith(
      tool.toolId,
      tool.description,
      expect.any(Object),
      expect.objectContaining({
        ...mockAnnotations,
        title: tool.title,
      }),
      expect.any(Function)
    );
  });

  it('should handle request successfully', async () => {
    const tool = new SddInitTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);
    const projectPath = '/path/to/project';
    const targetDir = join(projectPath, '.magen');

    // Mock successful file operations
    (fs.access as any).mockResolvedValue(undefined);
    (fs.mkdir as any).mockResolvedValue(undefined);
    (fs.readdir as any).mockImplementation((path, options) => {
      return Promise.resolve([
        { name: 'file1.md', isDirectory: () => false },
        { name: 'file2.md', isDirectory: () => false },
      ]);
    });
    (fs.readFile as any).mockImplementation(path => {
      return Promise.resolve(Buffer.from('file content'));
    });
    (fs.writeFile as any).mockResolvedValue(undefined);

    const result = await handleRequest({ projectPath });

    expect(fs.access).toHaveBeenCalledWith(projectPath);
    expect(fs.mkdir).toHaveBeenCalledWith(targetDir, { recursive: true });
    expect(fs.readdir).toHaveBeenCalled();

    // With the recursive implementation, we don't know exactly how many times
    // these will be called, but we know they should be called at least once
    expect(fs.readFile).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Successfully initialized'),
        },
      ],
    });
  });

  it('should handle error when project path does not exist', async () => {
    const tool = new SddInitTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);
    const projectPath = '/path/to/nonexistent';

    // Mock fs.access to throw an error
    (fs.access as any).mockRejectedValue(new Error('ENOENT'));

    const result = await handleRequest({ projectPath });

    expect(fs.access).toHaveBeenCalledWith(projectPath);
    expect(fs.mkdir).not.toHaveBeenCalled();

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: expect.stringContaining('does not exist'),
        },
      ],
    });
  });

  it('should handle error when mkdir fails', async () => {
    const tool = new SddInitTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);
    const projectPath = '/path/to/project';

    // Mock fs.access to succeed but fs.mkdir to fail
    (fs.access as any).mockResolvedValue(undefined);
    (fs.mkdir as any).mockRejectedValue(new Error('Permission denied'));

    const result = await handleRequest({ projectPath });

    expect(fs.access).toHaveBeenCalledWith(projectPath);
    expect(fs.mkdir).toHaveBeenCalled();

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Failed to create .magen directory'),
        },
      ],
    });
  });
});
