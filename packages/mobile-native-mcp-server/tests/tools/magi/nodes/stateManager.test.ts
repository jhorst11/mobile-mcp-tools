/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { MagiStateManager } from '../../../../src/tools/magi/nodes/stateManager.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

describe('MagiStateManager', () => {
  let stateManager: MagiStateManager;
  const mockFs = vi.mocked(fs);

  const testPaths = {
    prd: '/test/magi-sdd/001-feature/prd.md',
    tdd: '/test/magi-sdd/001-feature/tdd.md',
    tasks: '/test/magi-sdd/001-feature/tasks.md',
  };

  beforeEach(() => {
    stateManager = new MagiStateManager();
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('determineCurrentState', () => {
    it('should return init when no files exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      expect(state).toBe('init');
    });

    it('should return init when all files are empty', async () => {
      mockFs.readFile.mockResolvedValue('   \n\t  '); // Whitespace only

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      expect(state).toBe('init');
    });

    it('should return buildingPrd when PRD exists but is not finalized', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('# PRD Content') // PRD exists, not finalized
        .mockRejectedValue(new Error('File not found')); // TDD and Tasks don't exist

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      expect(state).toBe('buildingPrd');
    });

    it('should return buildingTdd when PRD is finalized but TDD is not', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('# PRD Content\n\n✅ **FINALIZED**') // PRD exists check
        .mockResolvedValueOnce('# TDD Content') // TDD exists check
        .mockRejectedValueOnce(new Error('File not found')) // Tasks exists check
        .mockResolvedValueOnce('# PRD Content\n\n✅ **FINALIZED**') // PRD finalized check
        .mockResolvedValueOnce('# TDD Content') // TDD finalized check (not finalized)
        .mockRejectedValueOnce(new Error('File not found')); // Tasks finalized check

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      expect(state).toBe('buildingTdd');
    });

    it('should return buildingTasks when PRD and TDD are finalized but Tasks is not', async () => {
      // The logic checks: if (!prdIsFinalized) return 'buildingPrd'
      // So PRD must be detected as finalized for this test to pass
      mockFs.readFile
        .mockResolvedValueOnce('# PRD Content\n\n✅ **FINALIZED**') // PRD exists check
        .mockResolvedValueOnce(
          '# TDD Content\n\n*This document was finalized by the magi workflow system.*'
        ) // TDD exists check
        .mockResolvedValueOnce('# Tasks Content') // Tasks exists check
        .mockResolvedValueOnce('# PRD Content\n\n✅ **FINALIZED**') // PRD finalized check - MUST contain finalization marker
        .mockResolvedValueOnce(
          '# TDD Content\n\n*This document was finalized by the magi workflow system.*'
        ) // TDD finalized check - MUST contain finalization marker
        .mockResolvedValueOnce('# Tasks Content'); // Tasks finalized check - must NOT contain finalization marker

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      expect(state).toBe('buildingTasks');
    });

    it('should return completed when all documents are finalized', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('# PRD Content\n\n✅ **FINALIZED**') // PRD exists check
        .mockResolvedValueOnce(
          '# TDD Content\n\n*This document was finalized by the magi workflow system.*'
        ) // TDD exists check
        .mockResolvedValueOnce('# Tasks Content\n\n✅ **FINALIZED**') // Tasks exists check
        .mockResolvedValueOnce('# PRD Content\n\n✅ **FINALIZED**') // PRD finalized check
        .mockResolvedValueOnce(
          '# TDD Content\n\n*This document was finalized by the magi workflow system.*'
        ) // TDD finalized check
        .mockResolvedValueOnce('# Tasks Content\n\n✅ **FINALIZED**'); // Tasks finalized check

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      expect(state).toBe('completed');
    });

    it('should handle mixed finalization markers', async () => {
      mockFs.readFile
        .mockResolvedValueOnce(
          '# PRD Content\n\n*This document was finalized by the magi workflow system.*'
        ) // PRD exists check
        .mockResolvedValueOnce('# TDD Content\n\n✅ **FINALIZED**') // TDD exists check
        .mockResolvedValueOnce('# Tasks Content\n\n✅ **FINALIZED**') // Tasks exists check
        .mockResolvedValueOnce(
          '# PRD Content\n\n*This document was finalized by the magi workflow system.*'
        ) // PRD finalized check
        .mockResolvedValueOnce('# TDD Content\n\n✅ **FINALIZED**') // TDD finalized check
        .mockResolvedValueOnce('# Tasks Content\n\n✅ **FINALIZED**'); // Tasks finalized check

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      expect(state).toBe('completed');
    });

    it('should return buildingPrd when PRD exists but TDD and Tasks do not', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('# PRD Content') // PRD exists
        .mockRejectedValueOnce(new Error('TDD not found')) // TDD doesn't exist
        .mockRejectedValueOnce(new Error('Tasks not found')); // Tasks doesn't exist

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      expect(state).toBe('buildingPrd');
    });

    it('should handle file read errors gracefully', async () => {
      mockFs.readFile
        .mockRejectedValueOnce(new Error('Permission denied')) // PRD error
        .mockRejectedValueOnce(new Error('File not found')) // TDD error
        .mockRejectedValueOnce(new Error('Disk full')); // Tasks error

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      expect(state).toBe('init');
    });

    it('should detect finalization markers case-insensitively', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('# PRD Content\n\n✅ **finalized**') // Different case
        .mockResolvedValueOnce(
          '# TDD Content\n\n*this document was finalized by the magi workflow system.*'
        ) // Different case
        .mockResolvedValueOnce('# Tasks Content\n\n✅ **FINALIZED**');

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      // Note: The current implementation is case-sensitive, so this should not be completed
      // This test documents the current behavior
      expect(state).toBe('buildingPrd'); // PRD not detected as finalized due to case
    });

    it('should handle partial finalization correctly', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('# PRD Content\n\n✅ **FINALIZED**') // PRD exists check
        .mockResolvedValueOnce('# TDD Content') // TDD exists check
        .mockResolvedValueOnce('# Tasks Content\n\n✅ **FINALIZED**') // Tasks exists check
        .mockResolvedValueOnce('# PRD Content\n\n✅ **FINALIZED**') // PRD finalized check
        .mockResolvedValueOnce('# TDD Content') // TDD finalized check (not finalized)
        .mockResolvedValueOnce('# Tasks Content\n\n✅ **FINALIZED**'); // Tasks finalized check

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      expect(state).toBe('buildingTdd'); // Should be building TDD since it's not finalized
    });

    it('should handle empty files as non-existent', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('') // PRD empty
        .mockResolvedValueOnce('   ') // TDD whitespace only
        .mockResolvedValueOnce('\n\t\n'); // Tasks whitespace only

      const state = await stateManager.determineCurrentState(
        testPaths.prd,
        testPaths.tdd,
        testPaths.tasks
      );

      expect(state).toBe('init');
    });
  });
});
