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
    finalize: string;
    iterate: string;
    update: string;
  };
  requirements: {
    build: string;
    finalize: string;
    iterate: string;
    update: string;
  };
  tasks: {
    build: string;
    finalize: string;
    update: string;
  };
}

/**
 * Gets all instruction files absolute paths
 * @param magenDir The .magen directory path
 * @returns Object containing all instruction file paths
 */
export function getInstructionFilePaths(magenDir: string): InstructionFilePaths {
  const instructionsDir = join(magenDir, '.instructions');
  return {
    start: join(instructionsDir, 'START.md'),
    state: join(instructionsDir, 'state.json'),
    prd: {
      build: join(instructionsDir, 'prd', 'build-prd.md'),
      finalize: join(instructionsDir, 'prd', 'finalize-prd.md'),
      iterate: join(instructionsDir, 'prd', 'iterate-prd.md'),
      update: join(instructionsDir, 'prd', 'update-prd.md'),
    },
    requirements: {
      build: join(instructionsDir, 'requirements', 'build-requirements.md'),
      finalize: join(instructionsDir, 'requirements', 'finalize-requirements.md'),
      iterate: join(instructionsDir, 'requirements', 'iterate-requirements.md'),
      update: join(instructionsDir, 'requirements', 'update-requirements.md'),
    },
    tasks: {
      build: join(instructionsDir, 'tasks', 'build-tasks.md'),
      finalize: join(instructionsDir, 'tasks', 'finalize-tasks.md'),
      update: join(instructionsDir, 'tasks', 'update-tasks.md'),
    },
  };
}
