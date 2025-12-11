/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';

export function registerValidateCommand(templateCmd: Command): void {
  templateCmd
    .command('validate [name]')
    .description('Validate template structure')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .action(() => {
      console.error(`Command not yet implemented: validate`);
      console.error('Currently available: create, test, layer, materialize, diff, version');
      process.exit(1);
    });
}
