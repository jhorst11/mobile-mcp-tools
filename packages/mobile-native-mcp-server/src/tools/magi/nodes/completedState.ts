/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MagiStateHandler, MagiStateContext, MagiStateResult } from './base.js';

export class CompletedStateHandler extends MagiStateHandler {
  async handle(context: MagiStateContext): Promise<MagiStateResult> {
    const { featureId, projectPath, magiDirectory, prdPath, tddPath, tasksPath } = context;

    return {
      success: true,
      featureId,
      projectPath,
      magiDirectory,
      currentState: 'completed',
      nextAction: 'The magi workflow is already complete. All documents have been finalized.',
      documents: {
        prd: { status: 'finalized', path: prdPath },
        tdd: { status: 'finalized', path: tddPath },
        tasks: { status: 'finalized', path: tasksPath },
      },
    };
  }
}
