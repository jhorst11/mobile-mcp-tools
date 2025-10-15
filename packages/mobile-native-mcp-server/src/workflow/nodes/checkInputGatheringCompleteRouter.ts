/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { InputResponse } from '../inputGathering/types.js';

/**
 * Conditional router to check if input gathering is complete.
 *
 * This router examines the inputGatheringResponse to determine if all required
 * properties have been collected or if more input rounds are needed.
 */
export class CheckInputGatheringCompleteRouter {
  private readonly completeNodeName: string;
  private readonly incompleteNodeName: string;
  private readonly maxRounds: number;
  private readonly failureNodeName: string;

  /**
   * Creates a new CheckInputGatheringCompleteRouter.
   *
   * @param completeNodeName - The name of the node to route to if gathering is complete
   * @param incompleteNodeName - The name of the node to route to if more input is needed
   * @param failureNodeName - The name of the node to route to if max rounds exceeded
   * @param maxRounds - Maximum number of input gathering rounds (default: 5)
   */
  constructor(
    completeNodeName: string,
    incompleteNodeName: string,
    failureNodeName: string,
    maxRounds: number = 5
  ) {
    this.completeNodeName = completeNodeName;
    this.incompleteNodeName = incompleteNodeName;
    this.failureNodeName = failureNodeName;
    this.maxRounds = maxRounds;
  }

  execute = (state: State): string => {
    // Get the input gathering response from state
    const response = state.inputGatheringResponse as InputResponse | undefined;
    const round = state.inputGatheringRound ?? 0;

    // If no response yet, need to gather input
    if (!response) {
      return this.incompleteNodeName;
    }

    // Check if user cancelled
    if (response.userCancelled) {
      return this.failureNodeName;
    }

    // Check if complete
    if (response.complete) {
      return this.completeNodeName;
    }

    // Check if max rounds exceeded
    if (round >= this.maxRounds) {
      return this.failureNodeName;
    }

    // More input needed
    return this.incompleteNodeName;
  };
}
