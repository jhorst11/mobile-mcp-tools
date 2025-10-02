/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MagiStateHandler, MagiStateContext, MagiStateResult } from './base.js';
import { BuildingPrdStateHandler } from './prd/buildingPrdState.js';

export class InitStateHandler extends MagiStateHandler {
  private buildingPrdHandler = new BuildingPrdStateHandler();

  async handle(context: MagiStateContext): Promise<MagiStateResult> {
    const { prdPath, tddPath, tasksPath } = context;

    // Initialize the feature - create placeholder files
    await this.createPlaceholderFile(prdPath, 'PRD');
    await this.createPlaceholderFile(tddPath, 'TDD');
    await this.createPlaceholderFile(tasksPath, 'Tasks');

    // Since we automatically move to buildingPrd state, delegate to that handler
    // but modify the context to indicate this is initialization
    const buildingPrdContext = {
      ...context,
      userInput: undefined, // No user input for guidance
    };

    const result = await this.buildingPrdHandler.handle(buildingPrdContext);

    // Modify the nextAction to indicate initialization
    return {
      ...result,
      nextAction: `Feature initialized! I've created placeholder documents for PRD, TDD, and Tasks.\n\n${result.nextAction}`,
    };
  }
}
