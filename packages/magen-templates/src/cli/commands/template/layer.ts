/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { findTemplate } from '../../../core/discovery.js';
import { createLayer } from '../../../core/layering.js';
import { selectTemplate } from '../../interactive.js';

export function registerLayerCommand(templateCmd: Command): void {
  templateCmd
    .command('layer [name]')
    .description('Create layer patch from template')
    .option('--based-on <parent>', 'Parent template name (overrides template.json)')
    .option('--out <path>', 'Override template directory (defaults to discovered template path)')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .action(async (templateName: string | undefined, options) => {
      let finalTemplateName = templateName;

      // Interactive mode
      if (options.interactive || !templateName) {
        console.log(chalk.bold('\n📦 Interactive Layer Patch Creation\n'));

        if (!finalTemplateName) {
          finalTemplateName = await selectTemplate({
            message: 'Select template to create layer patch for:',
          });
        }
      }

      if (!finalTemplateName) {
        console.error(chalk.red('\nError: Template name is required'));
        console.error(
          chalk.gray("Run 'magen-template template layer --interactive' for interactive mode")
        );
        process.exit(1);
      }
      // If --out is not provided, discover the template to get its path
      let templateDirectory = options.out;
      if (!templateDirectory) {
        const templateInfo = findTemplate(finalTemplateName);
        if (!templateInfo) {
          console.error(chalk.red(`\nError: Template not found: ${finalTemplateName}`));
          console.error(chalk.gray('Run "magen-template list" to see available templates.'));
          process.exit(1);
        }
        templateDirectory = templateInfo.templatePath;
      }

      try {
        console.log(`\nCreating layer patch for: ${chalk.cyan(finalTemplateName)}`);
        console.log(`Template directory: ${templateDirectory}`);

        const result = createLayer({
          templateName: finalTemplateName,
          templateDirectory,
          parentTemplateName: options.basedOn,
        });

        console.log(chalk.green('\n✓ Layer patch created successfully!'));
        console.log(`\n  Parent template: ${chalk.cyan(result.parentTemplate)}`);
        console.log(`  Child template: ${chalk.cyan(result.childTemplate)}`);
        console.log(`  Patch file: ${result.patchPath}`);

        console.log(chalk.bold('\n📋 Next steps:'));
        console.log(chalk.gray(`  1. Verify layer.patch in ${templateDirectory}`));
        console.log(chalk.gray(`  2. Update template.json to include layer configuration`));
        console.log(
          chalk.gray(
            `  3. Test generation: magen-template generate ${finalTemplateName} --out ~/test-app`
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
