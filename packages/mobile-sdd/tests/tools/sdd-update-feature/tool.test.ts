/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SddUpdateFeatureTool } from '../../../src/tools/sdd-update-feature/tool.js';
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

describe('SddUpdateFeatureTool', () => {
  const mockServer = {
    tool: vi.fn(),
  };

  const mockAnnotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };

  const projectPath = '/repo';
  const magenDir = join(projectPath, '.magen');
  const featureId = '001-example-feature';
  const featureDir = join(magenDir, featureId);
  const startMd = join(magenDir, '.instructions', 'START.md');

  beforeEach(() => {
    vi.resetAllMocks();

    // Default: everything exists
    (fs.access as any).mockResolvedValue(undefined);

    // Default file reads
    (fs.readFile as any).mockImplementation((path: string) => {
      if (path.includes('state.json')) {
        return Promise.resolve(
          JSON.stringify({
            prd: { state: 'finalized' },
            requirements: { state: 'finalized' },
            timestamps: {},
            changelog: [],
          })
        );
      }
      if (path.endsWith('START.md')) {
        return Promise.resolve('# START.md');
      }
      return Promise.resolve('');
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers with the MCP server', () => {
    const tool = new SddUpdateFeatureTool();
    tool.register(mockServer as any, mockAnnotations);

    expect(mockServer.tool).toHaveBeenCalledWith(
      tool.toolId,
      tool.description,
      expect.any(Object),
      expect.objectContaining({ title: tool.title }),
      expect.any(Function)
    );
  });

  it('errors when project path does not exist', async () => {
    const tool = new SddUpdateFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);

    // First access(projectPath) fails
    (fs.access as any).mockRejectedValueOnce(new Error('ENOENT'));

    const result = await handleRequest({ projectPath, featureId, target: 'prd' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('does not exist');
  });

  it('errors when .magen does not exist', async () => {
    const tool = new SddUpdateFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);

    // project exists, .magen missing
    (fs.access as any)
      .mockResolvedValueOnce(undefined) // projectPath
      .mockRejectedValueOnce(new Error('ENOENT')); // .magen

    const result = await handleRequest({ projectPath, featureId, target: 'prd' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('The .magen directory does not exist');
  });

  it('errors when START.md is missing', async () => {
    const tool = new SddUpdateFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);

    // project, .magen ok; START.md missing
    (fs.access as any)
      .mockResolvedValueOnce(undefined) // projectPath
      .mockResolvedValueOnce(undefined) // .magen
      .mockRejectedValueOnce(new Error('ENOENT')); // START.md

    const result = await handleRequest({ projectPath, featureId, target: 'prd' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('START.md');
  });

  it('errors when feature directory does not exist', async () => {
    const tool = new SddUpdateFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);

    (fs.access as any)
      .mockResolvedValueOnce(undefined) // projectPath
      .mockResolvedValueOnce(undefined) // .magen
      .mockResolvedValueOnce(undefined) // START.md
      .mockRejectedValueOnce(new Error('ENOENT')); // featureDir

    const result = await handleRequest({ projectPath, featureId, target: 'prd' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Feature directory');
  });

  it('enforces PRD-first gating for requirements when PRD is not finalized', async () => {
    const tool = new SddUpdateFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);

    // project, .magen, START.md, featureDir, artifact, instruction doc exist
    (fs.access as any)
      .mockResolvedValueOnce(undefined) // projectPath
      .mockResolvedValueOnce(undefined) // .magen
      .mockResolvedValueOnce(undefined) // START.md
      .mockResolvedValueOnce(undefined) // featureDir
      .mockResolvedValueOnce(undefined) // artifact requirements.md
      .mockResolvedValueOnce(undefined); // instruction doc update-requirements.md

    // state.json says prd.state = pending
    (fs.readFile as any).mockImplementation((path: string) => {
      if (path.includes('state.json')) {
        return Promise.resolve(
          JSON.stringify({ prd: { state: 'pending' }, requirements: { state: 'pending' } })
        );
      }
      if (path.endsWith('START.md')) {
        return Promise.resolve('# START.md');
      }
      return Promise.resolve('');
    });

    const result = await handleRequest({ projectPath, featureId, target: 'requirements' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Cannot update requirements until PRD is finalized');
  });

  it('enforces Requirements-first gating for tasks when Requirements are not finalized', async () => {
    const tool = new SddUpdateFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);

    // project, .magen, START.md, featureDir, artifact, instruction doc exist
    (fs.access as any)
      .mockResolvedValueOnce(undefined) // projectPath
      .mockResolvedValueOnce(undefined) // .magen
      .mockResolvedValueOnce(undefined) // START.md
      .mockResolvedValueOnce(undefined) // featureDir
      .mockResolvedValueOnce(undefined) // artifact tasks.md
      .mockResolvedValueOnce(undefined); // instruction doc update-tasks.md

    // state.json says requirements.state = pending
    (fs.readFile as any).mockImplementation((path: string) => {
      if (path.includes('state.json')) {
        return Promise.resolve(
          JSON.stringify({ prd: { state: 'finalized' }, requirements: { state: 'pending' } })
        );
      }
      if (path.endsWith('START.md')) {
        return Promise.resolve('# START.md');
      }
      return Promise.resolve('');
    });

    const result = await handleRequest({ projectPath, featureId, target: 'tasks' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Cannot update tasks until requirements are finalized'
    );
  });

  it('returns guidance when checks pass for PRD update', async () => {
    const tool = new SddUpdateFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);

    // project, .magen, START.md, featureDir, artifact, instruction doc exist
    (fs.access as any)
      .mockResolvedValueOnce(undefined) // projectPath
      .mockResolvedValueOnce(undefined) // .magen
      .mockResolvedValueOnce(undefined) // START.md
      .mockResolvedValueOnce(undefined) // featureDir
      .mockResolvedValueOnce(undefined) // artifact prd.md
      .mockResolvedValueOnce(undefined); // instruction doc update-prd.md

    const result = await handleRequest({
      projectPath,
      featureId,
      target: 'prd',
      changeSummary: 'Tweak story wording',
    });

    expect(result.isError).not.toBe(true);
    expect(result.content[0].text).toContain('Update SDD Feature');
    expect(result.content[0].text).toContain('Target: prd');
    expect(result.content[0].text).toContain('Change summary: Tweak story wording');
  });

  it('errors if artifact file is missing', async () => {
    const tool = new SddUpdateFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);

    // project, .magen, START.md, featureDir ok
    (fs.access as any)
      .mockResolvedValueOnce(undefined) // projectPath
      .mockResolvedValueOnce(undefined) // .magen
      .mockResolvedValueOnce(undefined) // START.md
      .mockResolvedValueOnce(undefined) // featureDir
      .mockRejectedValueOnce(new Error('ENOENT')); // artifact missing

    const result = await handleRequest({ projectPath, featureId, target: 'prd' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('expected artifact file');
  });

  it('errors if update instruction doc is missing', async () => {
    const tool = new SddUpdateFeatureTool();
    const handleRequest = (tool as any).handleRequest.bind(tool);

    // project, .magen, START.md, featureDir, artifact ok; instruction doc missing
    (fs.access as any)
      .mockResolvedValueOnce(undefined) // projectPath
      .mockResolvedValueOnce(undefined) // .magen
      .mockResolvedValueOnce(undefined) // START.md
      .mockResolvedValueOnce(undefined) // featureDir
      .mockResolvedValueOnce(undefined) // artifact exists
      .mockRejectedValueOnce(new Error('ENOENT')); // instruction doc missing

    const result = await handleRequest({ projectPath, featureId, target: 'prd' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('update instructions were not found');
  });
});
