/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseNode } from './abstractBaseNode.js';
import { State, WORKFLOW_USER_INPUT_PROPERTIES } from '../metadata.js';
import { InputRequestContext } from '../inputGathering/types.js';

/**
 * Input Gathering Setup Node - Initializes the input gathering context
 *
 * This node sets up the InputRequestContext with the required properties
 * for the workflow before the InputOrchestratorNode runs.
 */
export class InputGatheringSetupNode extends BaseNode {
  constructor() {
    super('inputGatheringSetup');
  }

  /**
   * Initializes the input gathering context
   */
  execute = (state: State): Partial<State> => {
    // Create the input request context with all required workflow properties
    const inputContext: InputRequestContext = {
      properties: WORKFLOW_USER_INPUT_PROPERTIES as any, // Cast needed due to readonly
      purpose: 'To generate your mobile app, I need some information about your project',
      strategy: {
        type: 'multiple',
        propertyNames: Object.keys(WORKFLOW_USER_INPUT_PROPERTIES),
        groupLabel: 'Project Configuration',
      },
      allowPartial: true,
      maxRounds: 5,
      workflowContext: {
        // Include any existing state context
        ...(state.platform && { platform: state.platform }),
        ...(state.projectName && { projectName: state.projectName }),
        ...(state.packageName && { packageName: state.packageName }),
        ...(state.organization && { organization: state.organization }),
        ...(state.loginHost && { loginHost: state.loginHost }),
      },
    };

    return {
      inputGatheringContext: inputContext,
      inputGatheringRound: 0,
    };
  };
}
