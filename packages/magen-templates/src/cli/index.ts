#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { registerListCommand } from './commands/list.js';
import { registerShowCommand } from './commands/show.js';
import { registerInfoCommand } from './commands/info.js';
import { registerGenerateCommand } from './commands/generate.js';
import { registerTemplateCommands } from './commands/template/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  const packageJsonPath = join(__dirname, '../../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
}

const program = new Command();

program
  .name('magen-template')
  .description('Layered, platform-agnostic app templating engine')
  .version(getVersion(), '-v, --version', 'output the version number')
  .configureOutput({
    writeOut: str => {
      // Customize version output to match expected format
      if (str.trim().match(/^\d+\.\d+\.\d+$/)) {
        process.stdout.write(`magen-template v${str}`);
      } else {
        process.stdout.write(str);
      }
    },
    writeErr: str => process.stderr.write(str),
  });

// Register commands
registerListCommand(program);
registerShowCommand(program);
registerInfoCommand(program);
registerGenerateCommand(program);
registerTemplateCommands(program);

// Parse arguments and show help if no command provided
if (process.argv.length === 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);
