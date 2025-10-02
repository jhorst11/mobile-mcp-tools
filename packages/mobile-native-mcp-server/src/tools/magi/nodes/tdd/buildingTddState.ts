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

export class BuildingTddStateHandler extends BuildingStateBase {
  protected getDocumentConfig(context: MagiStateContext): DocumentConfig {
    const { tddPath, tasksPath } = context;

    return {
      name: 'TDD',
      currentPath: tddPath,
      nextPath: tasksPath,
      currentState: 'buildingTdd',
      nextState: 'buildingTasks',
      instructionsFile: path.join(__dirname, 'tdd-instructions.md'),
      nextInstructionsFile: path.join(__dirname, '..', 'tasks', 'tasks-instructions.md'),
    };
  }
}
