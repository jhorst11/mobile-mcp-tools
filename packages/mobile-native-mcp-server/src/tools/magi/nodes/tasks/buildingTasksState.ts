/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { MagiStateContext } from '../base.js';
import { BuildingStateBase, DocumentConfig } from '../buildingStateBase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BuildingTasksStateHandler extends BuildingStateBase {
  protected getDocumentConfig(context: MagiStateContext): DocumentConfig {
    const { tasksPath } = context;

    return {
      name: 'Tasks',
      currentPath: tasksPath,
      currentState: 'buildingTasks',
      instructionsFile: path.join(__dirname, 'tasks-instructions.md'),
      // No next state - this is the final step
    };
  }
}
