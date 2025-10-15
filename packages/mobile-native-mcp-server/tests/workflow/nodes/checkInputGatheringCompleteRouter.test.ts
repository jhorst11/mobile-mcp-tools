/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import { CheckInputGatheringCompleteRouter } from '../../../src/workflow/nodes/checkInputGatheringCompleteRouter.js';
import { State } from '../../../src/workflow/metadata.js';
import { InputResponse } from '../../../src/workflow/inputGathering/types.js';

describe('CheckInputGatheringCompleteRouter', () => {
  const completeNode = 'templateDiscovery';
  const incompleteNode = 'inputOrchestrator';
  const failureNode = 'failure';

  const router = new CheckInputGatheringCompleteRouter(
    completeNode,
    incompleteNode,
    failureNode,
    3 // maxRounds
  );

  describe('Complete Responses', () => {
    it('should route to complete node when all properties collected', () => {
      const response: InputResponse = {
        collectedProperties: { platform: 'iOS', projectName: 'TestApp' },
        missingProperties: [],
        userCancelled: false,
        roundsUsed: 1,
        complete: true,
      };

      const state: Partial<State> = {
        inputGatheringResponse: response as any,
        inputGatheringRound: 1,
      };

      const result = router.execute(state as State);
      expect(result).toBe(completeNode);
    });
  });

  describe('Incomplete Responses', () => {
    it('should route to incomplete node when properties missing', () => {
      const response: InputResponse = {
        collectedProperties: { platform: 'iOS' },
        missingProperties: ['projectName'],
        userCancelled: false,
        roundsUsed: 1,
        complete: false,
      };

      const state: Partial<State> = {
        inputGatheringResponse: response as any,
        inputGatheringRound: 1,
      };

      const result = router.execute(state as State);
      expect(result).toBe(incompleteNode);
    });

    it('should route to incomplete node when no response yet', () => {
      const state: Partial<State> = {
        inputGatheringRound: 0,
      };

      const result = router.execute(state as State);
      expect(result).toBe(incompleteNode);
    });
  });

  describe('Failure Conditions', () => {
    it('should route to failure node when user cancelled', () => {
      const response: InputResponse = {
        collectedProperties: {},
        missingProperties: ['platform', 'projectName'],
        userCancelled: true,
        roundsUsed: 1,
        complete: false,
      };

      const state: Partial<State> = {
        inputGatheringResponse: response as any,
        inputGatheringRound: 1,
      };

      const result = router.execute(state as State);
      expect(result).toBe(failureNode);
    });

    it('should route to failure node when max rounds exceeded', () => {
      const response: InputResponse = {
        collectedProperties: {},
        missingProperties: ['platform'],
        userCancelled: false,
        roundsUsed: 3,
        complete: false,
      };

      const state: Partial<State> = {
        inputGatheringResponse: response as any,
        inputGatheringRound: 3,
      };

      const result = router.execute(state as State);
      expect(result).toBe(failureNode);
    });
  });
});
