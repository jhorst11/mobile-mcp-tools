/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import { InputGatheringSetupNode } from '../../../src/workflow/nodes/inputGatheringSetupNode.js';
import { State, WORKFLOW_USER_INPUT_PROPERTIES } from '../../../src/workflow/metadata.js';
import { InputRequestContext } from '../../../src/workflow/inputGathering/types.js';

describe('InputGatheringSetupNode', () => {
  const node = new InputGatheringSetupNode();

  it('should initialize input gathering context', () => {
    const state: Partial<State> = {};

    const result = node.execute(state as State);

    expect(result).toHaveProperty('inputGatheringContext');
    expect(result).toHaveProperty('inputGatheringRound');
    expect(result.inputGatheringRound).toBe(0);
  });

  it('should set up context with all required properties', () => {
    const state: Partial<State> = {};

    const result = node.execute(state as State);
    const context = result.inputGatheringContext as InputRequestContext;

    expect(context).toBeDefined();
    expect(context.properties).toBeDefined();
    expect(context.purpose).toContain('mobile app');
    expect(context.strategy).toBeDefined();
    expect(context.strategy?.type).toBe('multiple');
  });

  it('should include property names in strategy', () => {
    const state: Partial<State> = {};

    const result = node.execute(state as State);
    const context = result.inputGatheringContext as InputRequestContext;

    if (context.strategy?.type === 'multiple') {
      const expectedPropertyNames = Object.keys(WORKFLOW_USER_INPUT_PROPERTIES);
      expect(context.strategy.propertyNames).toEqual(expectedPropertyNames);
    }
  });

  it('should include existing state properties in workflow context', () => {
    const state: Partial<State> = {
      platform: 'iOS',
      projectName: 'TestApp',
    };

    const result = node.execute(state as State);
    const context = result.inputGatheringContext as InputRequestContext;

    expect(context.workflowContext).toBeDefined();
    expect(context.workflowContext?.platform).toBe('iOS');
    expect(context.workflowContext?.projectName).toBe('TestApp');
  });

  it('should set allowPartial to true', () => {
    const state: Partial<State> = {};

    const result = node.execute(state as State);
    const context = result.inputGatheringContext as InputRequestContext;

    expect(context.allowPartial).toBe(true);
  });

  it('should set maxRounds to 5', () => {
    const state: Partial<State> = {};

    const result = node.execute(state as State);
    const context = result.inputGatheringContext as InputRequestContext;

    expect(context.maxRounds).toBe(5);
  });
});
