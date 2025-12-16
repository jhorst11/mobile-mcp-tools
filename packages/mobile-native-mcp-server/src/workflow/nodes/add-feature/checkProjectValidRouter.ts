/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { AddFeatureState } from '../../add-feature-metadata.js';

/**
 * Router that checks if project validation was successful
 * Routes to either feature template fetch or failure
 */
export class CheckProjectValidRouter {
  private readonly nextNodeOnSuccess: string;
  private readonly failureNodeName: string;

  constructor(nextNodeOnSuccess: string, failureNodeName: string) {
    this.nextNodeOnSuccess = nextNodeOnSuccess;
    this.failureNodeName = failureNodeName;
  }

  execute = (state: AddFeatureState): string => {
    if (state.workflowFatalErrorMessages && state.workflowFatalErrorMessages.length > 0) {
      return this.failureNodeName;
    }

    if (state.validProject === true) {
      return this.nextNodeOnSuccess;
    }

    return this.failureNodeName;
  };
}
