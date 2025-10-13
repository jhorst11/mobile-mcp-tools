/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import {
  MAGI_TOOL,
  MAGI_INPUT_SCHEMA,
  MAGI_OUTPUT_SCHEMA,
} from '../../../src/tools/magi/metadata.js';

describe('Magi Metadata', () => {
  describe('MAGI_TOOL', () => {
    it('should have correct tool metadata structure', () => {
      expect(MAGI_TOOL).toEqual({
        toolId: 'magi',
        title: 'Magi Workflow Tool',
        description: expect.stringContaining('Simplified magi workflow'),
        inputSchema: MAGI_INPUT_SCHEMA,
        outputSchema: MAGI_OUTPUT_SCHEMA,
      });
    });

    it('should have descriptive title and description', () => {
      expect(MAGI_TOOL.title).toBe('Magi Workflow Tool');
      expect(MAGI_TOOL.description).toContain('Feature IDs are automatically formatted');
      expect(MAGI_TOOL.description).toContain('XXX-feature-name');
    });
  });

  describe('MAGI_INPUT_SCHEMA', () => {
    it('should validate valid input', () => {
      const validInput = {
        projectPath: '/test/project',
        featureId: '001-test-feature',
        userInput: 'finalize',
      };

      const result = MAGI_INPUT_SCHEMA.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should validate input without optional userInput', () => {
      const validInput = {
        projectPath: '/test/project',
        featureId: '001-test-feature',
      };

      const result = MAGI_INPUT_SCHEMA.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...validInput,
          userInput: undefined,
        });
      }
    });

    it('should reject input missing required fields', () => {
      const invalidInput = {
        projectPath: '/test/project',
        // Missing featureId
      };

      const result = MAGI_INPUT_SCHEMA.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input with wrong types', () => {
      const invalidInput = {
        projectPath: 123, // Should be string
        featureId: '001-test-feature',
      };

      const result = MAGI_INPUT_SCHEMA.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept empty userInput string', () => {
      const validInput = {
        projectPath: '/test/project',
        featureId: '001-test-feature',
        userInput: '',
      };

      const result = MAGI_INPUT_SCHEMA.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe('MAGI_OUTPUT_SCHEMA', () => {
    it('should validate valid output', () => {
      const validOutput = {
        success: true,
        featureId: '001-test-feature',
        projectPath: '/test/project',
        magiDirectory: '/test/project/magi-sdd/001-test-feature',
        currentState: 'init',
        nextAction: 'Create PRD document',
        documents: {
          prd: {
            status: 'not_created',
            path: '/test/project/magi-sdd/001-test-feature/prd.md',
          },
          tdd: {
            status: 'not_created',
            path: '/test/project/magi-sdd/001-test-feature/tdd.md',
          },
          tasks: {
            status: 'not_created',
            path: '/test/project/magi-sdd/001-test-feature/tasks.md',
          },
        },
      };

      const result = MAGI_OUTPUT_SCHEMA.safeParse(validOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validOutput);
      }
    });

    it('should validate all possible states', () => {
      const states = ['init', 'buildingPrd', 'buildingTdd', 'buildingTasks', 'completed'];

      states.forEach(state => {
        const output = {
          success: true,
          featureId: '001-test-feature',
          projectPath: '/test/project',
          magiDirectory: '/test/project/magi-sdd/001-test-feature',
          currentState: state,
          nextAction: `Action for ${state}`,
          documents: {
            prd: {
              status: 'not_created',
              path: '/test/project/magi-sdd/001-test-feature/prd.md',
            },
            tdd: {
              status: 'not_created',
              path: '/test/project/magi-sdd/001-test-feature/tdd.md',
            },
            tasks: {
              status: 'not_created',
              path: '/test/project/magi-sdd/001-test-feature/tasks.md',
            },
          },
        };

        const result = MAGI_OUTPUT_SCHEMA.safeParse(output);
        expect(result.success).toBe(true);
      });
    });

    it('should accept any string for currentState', () => {
      // Note: The current schema doesn't restrict currentState to specific values
      const outputWithAnyState = {
        success: true,
        featureId: '001-test-feature',
        projectPath: '/test/project',
        magiDirectory: '/test/project/magi-sdd/001-test-feature',
        currentState: 'anyState',
        nextAction: 'Test action',
        documents: {
          prd: {
            status: 'not_created',
            path: '/test/project/magi-sdd/001-test-feature/prd.md',
          },
          tdd: {
            status: 'not_created',
            path: '/test/project/magi-sdd/001-test-feature/tdd.md',
          },
          tasks: {
            status: 'not_created',
            path: '/test/project/magi-sdd/001-test-feature/tasks.md',
          },
        },
      };

      const result = MAGI_OUTPUT_SCHEMA.safeParse(outputWithAnyState);
      expect(result.success).toBe(true);
    });

    it('should validate with different document statuses', () => {
      const validOutput = {
        success: true,
        featureId: '001-test-feature',
        projectPath: '/test/project',
        magiDirectory: '/test/project/magi-sdd/001-test-feature',
        currentState: 'buildingTdd',
        nextAction: 'Complete TDD document',
        documents: {
          prd: {
            status: 'finalized',
            path: '/test/project/magi-sdd/001-test-feature/prd.md',
          },
          tdd: {
            status: 'in_progress',
            path: '/test/project/magi-sdd/001-test-feature/tdd.md',
          },
          tasks: {
            status: 'not_created',
            path: '/test/project/magi-sdd/001-test-feature/tasks.md',
          },
        },
      };

      const result = MAGI_OUTPUT_SCHEMA.safeParse(validOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.documents.prd.status).toBe('finalized');
        expect(result.data.documents.tdd.status).toBe('in_progress');
      }
    });

    it('should reject output missing required fields', () => {
      const invalidOutput = {
        success: true,
        featureId: '001-test-feature',
        // Missing projectPath, magiDirectory, currentState, nextAction, documents
      };

      const result = MAGI_OUTPUT_SCHEMA.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should reject output with wrong document structure', () => {
      const invalidOutput = {
        success: true,
        featureId: '001-test-feature',
        projectPath: '/test/project',
        magiDirectory: '/test/project/magi-sdd/001-test-feature',
        currentState: 'init',
        nextAction: 'Test action',
        documents: 'not-an-object',
      };

      const result = MAGI_OUTPUT_SCHEMA.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should validate complete document structure', () => {
      const validOutput = {
        success: true,
        featureId: '001-test-feature',
        projectPath: '/test/project',
        magiDirectory: '/test/project/magi-sdd/001-test-feature',
        currentState: 'init',
        nextAction: 'Initialize documents',
        documents: {
          prd: {
            status: 'not_created',
            path: '/test/project/magi-sdd/001-test-feature/prd.md',
          },
          tdd: {
            status: 'not_created',
            path: '/test/project/magi-sdd/001-test-feature/tdd.md',
          },
          tasks: {
            status: 'not_created',
            path: '/test/project/magi-sdd/001-test-feature/tasks.md',
          },
        },
      };

      const result = MAGI_OUTPUT_SCHEMA.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });
});
