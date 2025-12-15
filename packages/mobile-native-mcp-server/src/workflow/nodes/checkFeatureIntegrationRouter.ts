/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { AddFeatureState } from '../add-feature-metadata.js';

/**
 * Router that checks if feature integration was successful
 * Routes to either build validation or failure
 */
export class CheckFeatureIntegrationRouter {
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

    if (
      state.integrationSuccessful === true &&
      (!state.integrationErrorMessages || state.integrationErrorMessages.length === 0)
    ) {
      return this.nextNodeOnSuccess;
    }

    return this.failureNodeName;
  };
}
