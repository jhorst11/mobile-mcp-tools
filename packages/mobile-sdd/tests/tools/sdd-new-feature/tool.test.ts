/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SddNewFeatureTool } from '../../../src/tools/sdd-new-feature/tool.js';
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

// We'll mock the SddNewFeatureTool methods instead of the SddInitTool class

describe('SddNewFeatureTool', () => {
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

    // Default mock implementations
    (fs.access as any).mockImplementation(path => {
      if (path.includes('.magen')) {
        return Promise.reject(new Error('ENOENT'));
      }
      return Promise.resolve();
    });
    (fs.mkdir as any).mockResolvedValue(undefined);
    (fs.readdir as any).mockResolvedValue([]);
    (fs.readFile as any).mockResolvedValue('# START.md content');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register with the MCP server', () => {
    const tool = new SddNewFeatureTool();

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

  it('should initialize SDD when .magen directory does not exist', async () => {
    // Create a test subclass that overrides the initializeSdd method
    class TestSddNewFeatureTool extends SddNewFeatureTool {
      protected async initializeSdd(projectPath: string) {
        return {
          content: [{ type: 'text', text: 'Initialized SDD' }],
        };
      }
    }

    const tool = new TestSddNewFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);
    const projectPath = '/path/to/project';

    // Mock fs.readFile to return START.md content
    (fs.readFile as any).mockResolvedValue('# START.md content');

    // Mock fs.access to throw for .magen and succeed for other paths
    (fs.access as any).mockImplementation(path => {
      if (path.includes('.magen')) {
        return Promise.reject(new Error('ENOENT'));
      }
      return Promise.resolve();
    });

    // Mock fs.mkdir to succeed
    (fs.mkdir as any).mockResolvedValue(undefined);

    const result = await handleRequest({ projectPath });

    expect(result.content[0].text).toContain('New SDD Feature Created');
    expect(result.content[0].text).toContain('✅ Initialized SDD instructions');
  });

  it('should use existing .magen directory when it exists', async () => {
    // Create a test subclass that overrides the initializeSdd method
    class TestSddNewFeatureTool extends SddNewFeatureTool {
      protected async initializeSdd(projectPath: string) {
        throw new Error('This should not be called');
        // Return type needed for TypeScript, but this code is never reached
        return { content: [{ type: 'text' as const, text: '' }] };
      }
    }

    const tool = new TestSddNewFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);
    const projectPath = '/path/to/project';

    // Mock .magen directory exists
    (fs.access as any).mockResolvedValue(undefined);
    // Mock fs.readFile to return START.md content
    (fs.readFile as any).mockResolvedValue('# START.md content');
    // Mock fs.mkdir to succeed
    (fs.mkdir as any).mockResolvedValue(undefined);

    const result = await handleRequest({ projectPath });

    expect(result.content[0].text).toContain('New SDD Feature Created');
    expect(result.content[0].text).not.toContain('✅ Initialized SDD instructions');
  });

  it('should use provided feature ID when available', async () => {
    // Create a test subclass that overrides the initializeSdd method
    class TestSddNewFeatureTool extends SddNewFeatureTool {
      protected async initializeSdd(projectPath: string) {
        return {
          content: [{ type: 'text', text: 'Initialized SDD' }],
        };
      }
    }

    const tool = new TestSddNewFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);
    const projectPath = '/path/to/project';
    const featureId = '123-custom-feature';

    // Mock fs.readFile to return START.md content
    (fs.readFile as any).mockResolvedValue('# START.md content');
    // Mock fs.mkdir to succeed
    (fs.mkdir as any).mockResolvedValue(undefined);

    const result = await handleRequest({ projectPath, featureId });

    expect(result.content[0].text).toContain(featureId);
  });

  it('should generate feature ID based on existing features', async () => {
    // Create a test subclass that overrides the initializeSdd method
    class TestSddNewFeatureTool extends SddNewFeatureTool {
      protected async initializeSdd(projectPath: string) {
        return {
          content: [{ type: 'text', text: 'Initialized SDD' }],
        };
      }
    }

    const tool = new TestSddNewFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);
    const projectPath = '/path/to/project';

    // Mock existing feature directories
    (fs.readdir as any).mockImplementation((path, options) => {
      if (path.includes('specs')) {
        return Promise.resolve([
          { name: '001-feature-one', isDirectory: () => true },
          { name: '002-feature-two', isDirectory: () => true },
          { name: 'not-a-feature', isDirectory: () => true },
        ]);
      }
      return Promise.resolve([]);
    });

    // Mock fs.readFile to return START.md content
    (fs.readFile as any).mockResolvedValue('# START.md content');
    // Mock fs.mkdir to succeed
    (fs.mkdir as any).mockResolvedValue(undefined);

    const result = await handleRequest({ projectPath });

    expect(result.content[0].text).toContain('003-new-feature');
  });

  it('should handle error when project path does not exist', async () => {
    const tool = new SddNewFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);
    const projectPath = '/path/to/nonexistent';

    // Mock project path does not exist
    (fs.access as any).mockRejectedValue(new Error('ENOENT'));

    const result = await handleRequest({ projectPath });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('does not exist');
  });
});
