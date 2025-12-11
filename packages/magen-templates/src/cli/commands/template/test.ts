/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { findTemplate } from '../../../core/discovery.js';
import { testTemplate, watchTemplate } from '../../../core/testing.js';
import { createLayer } from '../../../core/layering.js';
import { parseVariables } from '../../utils.js';
import { selectTemplate, gatherVariables, confirmAction } from '../../interactive.js';

export function registerTestCommand(templateCmd: Command): void {
  templateCmd
    .command('test [name]')
    .description('Generate/validate test instance')
    .option('--regenerate', 'Force regeneration even if test directory exists')
    .option('--watch', 'Watch for changes and auto-regenerate')
    .option('--out <path>', 'Override template directory (defaults to discovered template path)')
    .option('--var <name=value...>', 'Override template variable(s)', [])
    .option('-i, --interactive', 'Interactive mode with prompts')
    .action(async (templateName: string | undefined, options) => {
      let finalTemplateName = templateName;
      let variables = parseVariables(options.var);
      let shouldRegenerate = options.regenerate;

      // Interactive mode
      if (options.interactive || !templateName) {
        console.log(chalk.bold('\n🧪 Interactive Template Testing\n'));

        // Select template if not provided
        if (!finalTemplateName) {
          finalTemplateName = await selectTemplate({
            message: 'Select a template to test:',
          });
        }

        // Ask about regeneration if test already exists
        const templateInfo = findTemplate(finalTemplateName);
        if (templateInfo) {
          const testDir = join(templateInfo.templatePath, 'test');
          if (existsSync(testDir) && !shouldRegenerate) {
            shouldRegenerate = await confirmAction(
              'Test directory already exists. Regenerate?',
              false
            );
          }
        }

        // Gather test variables interactively
        console.log(chalk.bold('\n📝 Configure test variables:\n'));
        variables = await gatherVariables(finalTemplateName, variables);
      }

      if (!finalTemplateName) {
        console.error(chalk.red('\nError: Template name is required'));
        console.error(
          chalk.gray("Run 'magen-template template test --interactive' for interactive mode")
        );
        process.exit(1);
      }

      // If --out is not provided, discover the template to get its path
      let templateDirectory = options.out;
      if (!templateDirectory) {
        const templateInfo = findTemplate(finalTemplateName);
        if (!templateInfo) {
          console.error(`\nError: Template not found: ${finalTemplateName}`);
          console.error('Run "magen-template list" to see available templates.');
          process.exit(1);
        }
        templateDirectory = templateInfo.templatePath;
      }

      try {
        // Watch mode
        if (options.watch) {
          const cleanup = watchTemplate({
            templateName: finalTemplateName,
            templateDirectory,
            variables,
            regenerate: true, // Always regenerate in watch mode
          });

          // Handle Ctrl+C gracefully
          process.on('SIGINT', () => {
            cleanup();
            process.exit(0);
          });

          // Keep process alive
          return;
        }

        // Non-watch mode (normal test)
        console.log(`\nTesting template: ${chalk.cyan(finalTemplateName)}`);
        console.log(`Template directory: ${templateDirectory}`);
        if (shouldRegenerate) {
          console.log(chalk.yellow('Regenerating test directory...'));
        }

        // Check if this is a layered template and auto-generate layer.patch
        const templateJsonPath = join(templateDirectory, 'template.json');
        if (existsSync(templateJsonPath)) {
          const templateJson = JSON.parse(readFileSync(templateJsonPath, 'utf-8'));
          if (templateJson.basedOn) {
            console.log('🔄 Generating layer.patch from work/ directory...');
            try {
              createLayer({
                templateName: finalTemplateName,
                templateDirectory,
                parentTemplateName: templateJson.basedOn,
              });
              console.log('✓ layer.patch updated\n');
            } catch (error) {
              console.warn(
                `⚠ Warning: Could not generate layer.patch: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          }
        }

        const result = testTemplate({
          templateName: finalTemplateName,
          templateDirectory,
          variables,
          regenerate: shouldRegenerate,
        });

        if (result.created) {
          console.log(chalk.green('\n✓ Test instance created successfully!'));
        } else {
          console.log(chalk.green('\n✓ Using existing test instance'));
        }
        console.log(`\n  Test directory: ${chalk.cyan(result.workDirectory)}`);

        if (Object.keys(result.variables).length > 0) {
          console.log(chalk.bold('\n  Variables used:'));
          for (const [name, value] of Object.entries(result.variables)) {
            console.log(chalk.gray(`    ${name}: ${value}`));
          }
        }

        console.log(chalk.bold('\n📋 Next steps:'));
        console.log(chalk.gray(`  1. Open ${result.workDirectory} in Xcode`));
        console.log(chalk.gray(`  2. Build and run your app to validate the template`));
        console.log(
          chalk.gray(`  3. To modify template: edit template/ (base) or work/ (layered)`)
        );
        console.log(
          chalk.gray(
            `  4. Regenerate test: magen-template template test ${finalTemplateName} --regenerate`
          )
        );
        console.log(
          chalk.gray(
            `  5. Auto-regenerate on changes: magen-template template test ${finalTemplateName} --watch`
          )
        );
        console.log('');
      } catch (error) {
        console.error(
          chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    });
}
