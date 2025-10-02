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

export class BuildingPrdStateHandler extends BuildingStateBase {
  protected getDocumentConfig(context: MagiStateContext): DocumentConfig {
    const { prdPath, tddPath } = context;

    return {
      name: 'PRD',
      currentPath: prdPath,
      nextPath: tddPath,
      currentState: 'buildingPrd',
      nextState: 'buildingTdd',
      instructionsFile: path.join(__dirname, 'prd-instructions.md'),
      nextInstructionsFile: path.join(__dirname, '..', 'tdd', 'tdd-instructions.md'),
    };
  }
}
