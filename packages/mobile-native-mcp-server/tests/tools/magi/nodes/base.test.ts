/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { MagiStateHandler, MagiStateContext } from '../../../../src/tools/magi/nodes/base.js';
import { createComponentLogger } from '../../../../src/logging/logger.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../../../src/logging/logger.js', () => ({
  createComponentLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Concrete implementation for testing
class TestMagiStateHandler extends MagiStateHandler {
  async handle(context: MagiStateContext) {
    return {
      state: 'test' as any,
      message: 'Test handler executed',
      nextAction: 'Test action',
      documentsCreated: [],
      documentsFinalized: [],
    };
  }
}

describe('MagiStateHandler', () => {
  let handler: TestMagiStateHandler;
  let mockContext: MagiStateContext;
  const mockFs = vi.mocked(fs);

  beforeEach(() => {
    handler = new TestMagiStateHandler();
    mockContext = {
      featureId: '001-test-feature',
      projectPath: '/test/project',
      magiDirectory: '/test/project/magi-sdd/001-test-feature',
      prdPath: '/test/project/magi-sdd/001-test-feature/prd.md',
      tddPath: '/test/project/magi-sdd/001-test-feature/tdd.md',
      tasksPath: '/test/project/magi-sdd/001-test-feature/tasks.md',
      userInput: undefined,
      logger: createComponentLogger('test'),
    };
    vi.clearAllMocks();
  });

  describe('handle', () => {
    it('should execute the concrete implementation', async () => {
      const result = await handler.handle(mockContext);

      expect(result).toEqual({
        state: 'test',
        message: 'Test handler executed',
        nextAction: 'Test action',
        documentsCreated: [],
        documentsFinalized: [],
      });
    });
  });

  describe('createPlaceholderFile', () => {
    it('should create a placeholder file with correct content', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler['createPlaceholderFile']('/test/path/document.md', 'PRD');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/document.md',
        expect.stringContaining('# PRD Document'),
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/document.md',
        expect.stringContaining('This is a placeholder PRD document'),
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/document.md',
        expect.stringContaining('Edit this file with your PRD content'),
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/document.md',
        expect.stringContaining('*This file was created by the magi workflow system.*'),
        'utf8'
      );
    });

    it('should handle different document types', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler['createPlaceholderFile']('/test/path/tdd.md', 'TDD');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/tdd.md',
        expect.stringContaining('# TDD Document'),
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/tdd.md',
        expect.stringContaining('This is a placeholder TDD document'),
        'utf8'
      );
    });

    it('should throw error when file creation fails', async () => {
      const writeError = new Error('Permission denied');
      mockFs.writeFile.mockRejectedValue(writeError);

      await expect(
        handler['createPlaceholderFile']('/test/path/document.md', 'PRD')
      ).rejects.toThrow('Failed to create PRD placeholder file: Error: Permission denied');
    });

    it('should create valid markdown content', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler['createPlaceholderFile']('/test/path/tasks.md', 'Tasks');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const content = writeCall[1] as string;

      // Verify markdown structure
      expect(content).toMatch(/^# Tasks Document/m);
      expect(content).toMatch(/^## Overview/m);
      expect(content).toMatch(/^## Instructions/m);
      expect(content).toMatch(/^---/m);
    });
  });

  describe('markDocumentAsFinalized', () => {
    it('should append finalization marker to existing content', async () => {
      const existingContent = '# PRD Document\n\nThis is the PRD content.';
      mockFs.readFile.mockResolvedValue(existingContent);
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler['markDocumentAsFinalized']('/test/path/prd.md', 'PRD');

      expect(mockFs.readFile).toHaveBeenCalledWith('/test/path/prd.md', 'utf8');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/prd.md',
        expect.stringContaining(existingContent),
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/prd.md',
        expect.stringContaining('✅ **FINALIZED**'),
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/prd.md',
        expect.stringContaining('*This document was finalized by the magi workflow system.*'),
        'utf8'
      );
    });

    it('should handle different document types in finalization', async () => {
      const existingContent = '# TDD Document\n\nTechnical details here.';
      mockFs.readFile.mockResolvedValue(existingContent);
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler['markDocumentAsFinalized']('/test/path/tdd.md', 'TDD');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/tdd.md',
        expect.stringContaining(existingContent),
        'utf8'
      );
    });

    it('should throw error when reading existing file fails', async () => {
      const readError = new Error('File not found');
      mockFs.readFile.mockRejectedValue(readError);

      await expect(handler['markDocumentAsFinalized']('/test/path/prd.md', 'PRD')).rejects.toThrow(
        'Failed to mark PRD document as finalized: Error: File not found'
      );
    });

    it('should throw error when writing finalized file fails', async () => {
      const existingContent = '# PRD Document';
      mockFs.readFile.mockResolvedValue(existingContent);
      const writeError = new Error('Disk full');
      mockFs.writeFile.mockRejectedValue(writeError);

      await expect(handler['markDocumentAsFinalized']('/test/path/prd.md', 'PRD')).rejects.toThrow(
        'Failed to mark PRD document as finalized: Error: Disk full'
      );
    });

    it('should create proper finalization section structure', async () => {
      const existingContent = '# Document\n\nContent here.';
      mockFs.readFile.mockResolvedValue(existingContent);
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler['markDocumentAsFinalized']('/test/path/doc.md', 'Document');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const finalizedContent = writeCall[1] as string;

      // Verify structure
      expect(finalizedContent).toContain(existingContent);
      expect(finalizedContent).toMatch(/\n\n---\n\n## Finalization Status\n\n/);
      expect(finalizedContent).toContain('✅ **FINALIZED**');
      expect(finalizedContent).toContain(
        'This document is complete and approved for the next phase'
      );
    });

    it('should handle empty existing content', async () => {
      mockFs.readFile.mockResolvedValue('');
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler['markDocumentAsFinalized']('/test/path/empty.md', 'Empty');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const finalizedContent = writeCall[1] as string;

      expect(finalizedContent).toContain('✅ **FINALIZED**');
      expect(finalizedContent).toContain(
        '*This document was finalized by the magi workflow system.*'
      );
    });
  });
});


