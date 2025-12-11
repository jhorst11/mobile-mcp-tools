/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { findTemplate } from '../../core/discovery.js';
import { generateApp } from '../../core/generator.js';
import { createTemplateNotFoundError, apiValidateTemplateVariables } from '../../api/index.js';
import { formatErrorWithSuggestions, formatSuccess } from '../formatting.js';
import { selectTemplate, gatherVariables, promptOutputDirectory } from '../interactive.js';
import { parseVariables } from '../utils.js';

export function registerGenerateCommand(program: Command): void {
  program
    .command('generate [template]')
    .description('Generate a concrete app from template')
    .option('-o, --out <directory>', 'Output directory for generated app')
    .option('--var <name=value...>', 'Template variable(s)', [])
    .option('--overwrite', 'Overwrite existing output directory')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .action(async (templateName: string | undefined, options) => {
      try {
        let finalTemplateName = templateName;
        let outputDir = options.out;
        let variables = parseVariables(options.var);

        // Interactive mode
        if (options.interactive || !templateName) {
          console.log(chalk.bold('\n🚀 Interactive Template Generation\n'));

          // Select template if not provided
          if (!finalTemplateName) {
            finalTemplateName = await selectTemplate({
              message: 'Select a template to generate:',
            });
          }

          // Prompt for output directory if not provided
          if (!outputDir) {
            outputDir = await promptOutputDirectory(`./my-app`);
          }

          // Gather variables interactively
          console.log(chalk.bold('\n📝 Configure template variables:\n'));
          variables = await gatherVariables(finalTemplateName, variables);
        }

        if (!finalTemplateName) {
          console.error(chalk.red('\nError: Template name is required'));
          console.log(
            chalk.gray("Run 'magen-template generate --interactive' for interactive mode")
          );
          console.log(chalk.gray("Or run 'magen-template list' to see available templates"));
          process.exit(1);
        }

        if (!outputDir) {
          console.error(
            chalk.red('\nError: Output directory is required (use --out or --interactive)')
          );
          process.exit(1);
        }

        // Validate template exists with better error
        const templateInfo = findTemplate(finalTemplateName);
        if (!templateInfo) {
          const error = createTemplateNotFoundError(finalTemplateName);
          console.error(formatErrorWithSuggestions(error.message, error.suggestions));
          console.log(chalk.gray("Run 'magen-template list' to see all available templates"));
          process.exit(1);
        }

        // Validate variables before generating
        const validation = apiValidateTemplateVariables(finalTemplateName, variables);
        if (!validation.valid) {
          console.error(chalk.red.bold('\n❌ Variable validation failed:\n'));
          validation.errors.forEach(err => {
            console.error(chalk.red(`  • ${err}`));
          });

          if (validation.missingRequired.length > 0) {
            console.log(
              chalk.yellow(
                `\n💡 Tip: Run 'magen-template info ${finalTemplateName}' to see all required variables`
              )
            );
            console.log(
              chalk.yellow(`Or use 'magen-template generate --interactive' for guided setup`)
            );
          }
          process.exit(1);
        }

        // Generate with spinner (only in TTY)
        const spinner = process.stdout.isTTY
          ? ora({
              text: `Generating ${chalk.cyan(finalTemplateName)} to ${chalk.cyan(outputDir)}`,
              color: 'cyan',
            }).start()
          : null;

        if (!spinner) {
          console.log(`Generating ${finalTemplateName} to ${outputDir}...`);
        }

        try {
          generateApp({
            templateName: finalTemplateName,
            outputDirectory: outputDir,
            variables,
            overwrite: options.overwrite,
          });

          if (spinner) {
            spinner.succeed(formatSuccess(`App generated successfully!`));
          } else {
            console.log('✓ App generated successfully!');
          }

          console.log(chalk.bold('\n📦 Generation Summary:'));
          console.log(`  Template: ${chalk.cyan(finalTemplateName)}`);
          console.log(`  Output: ${chalk.cyan(outputDir)}`);

          if (Object.keys(variables).length > 0) {
            console.log(chalk.bold('\n  Variables:'));
            for (const [name, value] of Object.entries(variables)) {
              console.log(chalk.gray(`    ${name}: ${value}`));
            }
          }

          console.log(chalk.bold('\n🎉 Next steps:'));
          console.log(chalk.gray(`    cd ${outputDir}`));
          console.log(chalk.gray(`    # Open in your IDE and start building!\n`));
        } catch (genError) {
          if (spinner) {
            spinner.fail(chalk.red('Generation failed'));
          }
          throw genError;
        }
      } catch (error) {
        console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
