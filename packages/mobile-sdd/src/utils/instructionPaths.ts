/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { join } from 'path';

export interface InstructionFilePaths {
  start: string;
  state: string;
  prd: {
    build: string;
  };
  tdd: {
    build: string;
  };
  tasks: {
    build: string;
  };
}

/**
 * Gets all instruction files absolute paths
 * @param magenDir The magi-sdd directory path
 * @returns Object containing all instruction file paths
 */
export function getInstructionFilePaths(magenDir: string): InstructionFilePaths {
  const instructionsDir = join(magenDir, '.instructions');
  return {
    start: join(instructionsDir, 'START.md'),
    state: join(instructionsDir, 'state.json'),
    prd: {
      build: join(instructionsDir, 'prd', 'build-prd.md'),
    },
    tdd: {
      build: join(instructionsDir, 'tdd', 'build-tdd.md'),
    },
    tasks: {
      build: join(instructionsDir, 'tasks', 'build-tasks.md'),
    },
  };
}
