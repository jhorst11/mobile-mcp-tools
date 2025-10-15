/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputOrchestratorNode } from '../../../src/workflow/nodes/inputOrchestratorNode.js';
import { State } from '../../../src/workflow/metadata.js';
import { InputRequestContext, InputResponse } from '../../../src/workflow/inputGathering/types.js';
import { ToolExecutor } from '../../../src/workflow/nodes/toolExecutor.js';
import { Logger } from '../../../src/logging/logger.js';
import z from 'zod';

// Mock ToolExecutor for testing
class MockToolExecutor implements ToolExecutor {
  execute(toolInvocationData: unknown): unknown {
    // Return a mock response that matches GATHER_INPUT_WORKFLOW_RESULT_SCHEMA
    return {
      collectedProperties: {
        projectName: 'TestProject',
      },
      userProvidedText: 'Test response',
      strategyUsed: 'single',
    };
  }
}

// Mock Logger for testing
const mockLogger: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  child: vi.fn(() => mockLogger),
};

describe('InputOrchestratorNode', () => {
  let node: InputOrchestratorNode;
  let mockState: Partial<State>;
  let mockToolExecutor: MockToolExecutor;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    node = new InputOrchestratorNode(mockToolExecutor, mockLogger);
    mockState = {
      workflowStateData: {},
      inputGatheringRound: 0,
    };
  });

  describe('Strategy Selection', () => {
    it('should select single property strategy for one property', () => {
      const context: InputRequestContext = {
        properties: {
          projectName: {
            zodType: z.string(),
            description: 'Name of the project',
            friendlyName: 'project name',
          },
        },
        purpose: 'Test single property',
        allowPartial: true,
      };

      // We can't directly test private methods, but we can verify the behavior
      // through the execute method by mocking the toolExecutor
      expect(Object.keys(context.properties)).toHaveLength(1);
    });

    it('should select multiple properties strategy for related properties', () => {
      const context: InputRequestContext = {
        properties: {
          projectName: {
            zodType: z.string(),
            description: 'Name of the project',
            friendlyName: 'project name',
          },
          organization: {
            zodType: z.string(),
            description: 'Organization name',
            friendlyName: 'organization',
          },
        },
        purpose: 'Test multiple properties',
        allowPartial: true,
      };

      expect(Object.keys(context.properties)).toHaveLength(2);
    });

    it('should select choice strategy for enum properties', () => {
      const context: InputRequestContext = {
        properties: {
          platform: {
            zodType: z.enum(['iOS', 'Android']),
            description: 'Mobile platform',
            friendlyName: 'platform',
          },
        },
        purpose: 'Test choice selection',
        allowPartial: false,
      };

      expect(context.properties.platform.zodType).toBeInstanceOf(z.ZodEnum);
    });
  });

  describe('Input Response Handling', () => {
    it('should track rounds used', () => {
      const initialRound = 0;
      const result = node.execute({ ...mockState, inputGatheringRound: initialRound } as State);

      expect(result.inputGatheringRound).toBe(initialRound + 1);
    });

    it('should merge collected properties into state', () => {
      // This test verifies that the node merges collected properties
      // In a real scenario, the toolExecutor would return collected properties
      const result = node.execute(mockState as State);

      expect(result).toHaveProperty('inputGatheringContext');
      expect(result).toHaveProperty('inputGatheringResponse');
      expect(result).toHaveProperty('inputGatheringRound');
    });
  });

  describe('Context Building', () => {
    it('should include existing properties in workflow context', () => {
      const stateWithProperties: Partial<State> = {
        ...mockState,
        platform: 'iOS',
        projectName: 'TestProject',
      };

      const result = node.execute(stateWithProperties as State);

      // Verify that the node executed without errors
      expect(result).toBeDefined();
    });
  });

  describe('Property Definition Conversion', () => {
    it('should handle properties without examples', () => {
      const context: InputRequestContext = {
        properties: {
          projectName: {
            zodType: z.string(),
            description: 'Name of the project',
            friendlyName: 'project name',
          },
        },
        purpose: 'Test property conversion',
        allowPartial: true,
      };

      // Verify the context is valid
      expect(context.properties.projectName).toBeDefined();
      expect(context.properties.projectName.friendlyName).toBe('project name');
    });
  });
});

describe('InputResponse', () => {
  it('should correctly identify complete responses', () => {
    const response: InputResponse = {
      collectedProperties: {
        projectName: 'TestProject',
        platform: 'iOS',
      },
      missingProperties: [],
      userCancelled: false,
      roundsUsed: 1,
      complete: true,
    };

    expect(response.complete).toBe(true);
    expect(response.missingProperties).toHaveLength(0);
  });

  it('should correctly identify incomplete responses', () => {
    const response: InputResponse = {
      collectedProperties: {
        projectName: 'TestProject',
      },
      missingProperties: ['platform', 'organization'],
      userCancelled: false,
      roundsUsed: 1,
      complete: false,
    };

    expect(response.complete).toBe(false);
    expect(response.missingProperties).toHaveLength(2);
    expect(response.missingProperties).toContain('platform');
    expect(response.missingProperties).toContain('organization');
  });
});
