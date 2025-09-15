/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SddUpdateInstructionsTool } from '../../../src/tools/sdd-update-instructions/tool.js';
import { SddUpdateInstructionsInputType } from '../../../src/schemas/sddUpdateInstructionsSchema.js';
import { vol } from 'memfs';
import { join } from 'path';

// Mock the file system and other dependencies
vi.mock('url', () => ({
  fileURLToPath: (url: string) => {
    if (url.includes('sdd-update-instructions')) {
      return '/mock/tools/sdd-update-instructions/tool.ts';
    }
    return '';
  },
}));

describe('SddUpdateInstructionsTool', () => {
        let tool: SddUpdateInstructionsTool;
    const projectPath = '/test-project';
    const magenDir = join(projectPath, '.magen');
    const instructionsDir = join(magenDir, '.instructions');
    const mockInstructionsResourcePath = '/mock/resources/instructions';

    beforeEach(async () => {
        // Reset the file system and mocks before each test
        vol.reset();
        vi.resetModules();

        // Mock 'fs' using doMock to avoid hoisting issues
        vi.doMock('fs', () => ({
            default: vol,
            promises: vol.promises,
        }));

        // Dynamically import the tool after mocks are set up
        const { SddUpdateInstructionsTool: Tool } = await import(
            '../../../src/tools/sdd-update-instructions/tool.js'
        );
        tool = new Tool();

        // Mock the tool's resourcesPath to point to our mock resources
        (tool as any).resourcesPath = mockInstructionsResourcePath;

        // Setup mock resource files
        vol.fromJSON(
            {
                'START.md': 'mock start content',
                'design/finalize-design.md': 'mock design content',
            },
            mockInstructionsResourcePath
        );
    });

    it('should successfully update instruction files', async () => {
        // Setup existing project
        vol.fromJSON(
            {
                'START.md': 'old start content',
                'stale-file.md': 'this file should be removed by the update',
            },
            instructionsDir
        );

        const input: SddUpdateInstructionsInputType = { projectPath };
        const result = await (tool as any).handleRequest(input);

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Successfully updated');

        // Verify files are updated
        const updatedStartMd = await vol.promises.readFile(join(instructionsDir, 'START.md'), 'utf8');
        expect(updatedStartMd).toBe('mock start content');

        const newDesignDoc = await vol.promises.readFile(join(instructionsDir, 'design', 'finalize-design.md'), 'utf8');
        expect(newDesignDoc).toBe('mock design content');

        // Verify that old files not in the source are removed (or in this case, not present)
        const files = await vol.promises.readdir(instructionsDir);
        expect(files).not.toContain('stale-file.md');
    });

    it('should return an error if the project path does not exist', async () => {
        const input: SddUpdateInstructionsInputType = { projectPath: '/non-existent-project' };
        const result = await (tool as any).handleRequest(input);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('does not exist or is not accessible');
    });

    it('should return an error if it is not a valid SDD project', async () => {
        // Setup a project without .magen/.instructions/START.md
        vol.fromJSON({ 'some-file.txt': 'content' }, projectPath);

        const input: SddUpdateInstructionsInputType = { projectPath };
        const result = await (tool as any).handleRequest(input);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('not appear to be a valid SDD project');
    });
});
