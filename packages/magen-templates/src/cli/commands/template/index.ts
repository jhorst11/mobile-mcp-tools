/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';
import { registerCreateCommand } from './create.js';
import { registerVersionCommand } from './version.js';
import { registerTestCommand } from './test.js';
import { registerLayerCommand } from './layer.js';
import { registerMaterializeCommand } from './materialize.js';
import { registerDiffCommand } from './diff.js';
import { registerValidateCommand } from './validate.js';

export function registerTemplateCommands(program: Command): void {
  const templateCmd = program
    .command('template')
    .description('Template management commands')
    .action(() => {
      // When called without a subcommand, show help with exit code 0
      templateCmd.outputHelp();
      process.exit(0);
    });

  registerCreateCommand(templateCmd);
  registerVersionCommand(templateCmd);
  registerTestCommand(templateCmd);
  registerLayerCommand(templateCmd);
  registerMaterializeCommand(templateCmd);
  registerDiffCommand(templateCmd);
  registerValidateCommand(templateCmd);
}
