/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { AddFeatureState } from '../add-feature-metadata.js';

/**
 * Router that checks if pod install is needed.
 * Routes to pod install node if iOS and Podfile was modified, otherwise skips to build validation.
 */
export class CheckPodInstallRouter {
  constructor(
    private readonly podInstallNodeName: string,
    private readonly buildValidationNodeName: string
  ) {}

  execute = (state: AddFeatureState): string => {
    // Check if iOS platform and Podfile was modified
    if (state.platform === 'iOS' && state.podfileModified === true) {
      return this.podInstallNodeName;
    }
    // Skip to build validation
    return this.buildValidationNodeName;
  };
}
