/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getTemplate } from '../../core/discovery.js';
import { selectTemplate } from '../interactive.js';

export function registerShowCommand(program: Command): void {
  program
    .command('show [name]')
    .description('Show template metadata and schema')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .action(async (templateName: string | undefined, options) => {
      let finalTemplateName = templateName;

      // Interactive mode
      if (options.interactive || !templateName) {
        console.log(chalk.bold('\n📋 Show Template Metadata\n'));

        if (!finalTemplateName) {
          finalTemplateName = await selectTemplate({
            message: 'Select template to show:',
          });
        }
      }

      if (!finalTemplateName) {
        console.error(chalk.red('\nError: Template name is required'));
        console.error(chalk.gray("Run 'magen-template show --interactive' for interactive mode"));
        process.exit(1);
      }
      try {
        const template = getTemplate(finalTemplateName);

        console.log(`\nTemplate: ${template.name}`);
        console.log(`Platform: ${template.platform}`);
        console.log(`Version: ${template.version}`);

        if (template.description) {
          console.log(`Description: ${template.description}`);
        }

        if (template.basedOn) {
          console.log(`Based on: ${template.basedOn}`);
        }

        if (template.tags?.length) {
          console.log(`Tags: ${template.tags.join(', ')}`);
        }

        if (template.variables.length > 0) {
          console.log('\nVariables:');
          for (const variable of template.variables) {
            const required = variable.required ? ' (required)' : ' (optional)';
            const defaultValue =
              variable.default !== undefined ? ` [default: ${variable.default}]` : '';
            console.log(`  ${variable.name}: ${variable.type}${required}${defaultValue}`);
            console.log(`    ${variable.description}`);

            if (variable.regex) {
              console.log(`    Pattern: ${variable.regex}`);
            }

            if (variable.enum) {
              console.log(`    Allowed values: ${variable.enum.join(', ')}`);
            }
          }
        }

        console.log('');
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    });
}

export function addShowCommand(program: Command): void {
  registerShowCommand(program);
}
