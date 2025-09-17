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
  design: {
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
    design: {
      build: join(instructionsDir, 'design', 'build-design.md'),
      finalize: join(instructionsDir, 'design', 'finalize-design.md'),
      iterate: join(instructionsDir, 'design', 'iterate-design.md'),
      update: join(instructionsDir, 'design', 'update-design.md'),
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
