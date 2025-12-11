/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getTemplateInfo, createTemplateNotFoundError } from '../../api/index.js';
import { formatTemplateInfo, formatErrorWithSuggestions } from '../formatting.js';
import { selectTemplate } from '../interactive.js';

export function registerInfoCommand(program: Command): void {
  program
    .command('info [name]')
    .description('Show detailed template information')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .action(async (templateName: string | undefined, options) => {
      let finalTemplateName = templateName;

      // Interactive mode
      if (options.interactive || !templateName) {
        console.log(chalk.bold('\n📋 Show Template Information\n'));

        if (!finalTemplateName) {
          finalTemplateName = await selectTemplate({
            message: 'Select template to show info:',
          });
        }
      }

      if (!finalTemplateName) {
        console.error(chalk.red('\nError: Template name is required'));
        console.error(chalk.gray("Run 'magen-template info --interactive' for interactive mode"));
        process.exit(1);
      }
      try {
        const info = getTemplateInfo(finalTemplateName);

        if (!info) {
          const error = createTemplateNotFoundError(finalTemplateName);
          console.error(formatErrorWithSuggestions(error.message, error.suggestions));
          console.log(chalk.gray("Run 'magen-template list' to see all available templates."));
          process.exit(1);
        }

        console.log(formatTemplateInfo(info));
      } catch (error) {
        console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}

export function addInfoCommand(program: Command): void {
  registerInfoCommand(program);
}
