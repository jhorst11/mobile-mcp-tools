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
import { selectTemplate } from '../../interactive.js';

// ANSI color codes
const colors = {
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

export function registerDiffCommand(templateCmd: Command): void {
  templateCmd
    .command('diff [name]')
    .description('Show the layer.patch diff for a layered template')
    .option('--out <path>', 'Template directory')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .action(async (templateName: string | undefined, options) => {
      let finalTemplateName = templateName;

      // Interactive mode
      if (options.interactive || !templateName) {
        console.log(chalk.bold('\n📋 Interactive Layer Patch Diff\n'));

        if (!finalTemplateName) {
          finalTemplateName = await selectTemplate({
            message: 'Select layered template to show diff:',
          });
        }
      }

      if (!finalTemplateName) {
        console.error(chalk.red('\nError: Template name is required'));
        console.error(
          chalk.gray("Run 'magen-template template diff --interactive' for interactive mode")
        );
        process.exit(1);
      }

      try {
        console.log(
          `\nShowing layer patch for: ${colors.cyan}${finalTemplateName}${colors.reset}\n`
        );

        const templateInfo = findTemplate(finalTemplateName);
        if (!templateInfo) {
          throw new Error(`Template not found: ${finalTemplateName}`);
        }

        const templateDirectory = options.out || templateInfo.templatePath;
        const templateJson = templateInfo.descriptor;

        // Check if this is a layered template (support both old and new format)
        const parentTemplate = templateJson.extends?.template || templateJson.basedOn;
        const patchFile =
          templateJson.extends?.patchFile || templateJson.layer?.patchFile || 'layer.patch';

        if (!parentTemplate) {
          throw new Error(
            `Template ${finalTemplateName} is not a layered template. ` +
              `Only layered templates have layer.patch files.`
          );
        }

        // Check if layer.patch exists
        const patchPath = join(templateDirectory, patchFile);
        if (!existsSync(patchPath)) {
          throw new Error(`${patchFile} not found at ${patchPath}`);
        }

        // Read and display the patch
        const patchContent = readFileSync(patchPath, 'utf-8');

        if (patchContent.trim().length === 0) {
          console.log(`${patchFile} is empty. Run "magen-template template layer" to generate it.`);
          return;
        }

        console.log(`Based on: ${colors.cyan}${parentTemplate}${colors.reset}`);
        if (templateJson.extends?.version) {
          console.log(
            `Parent version: ${colors.cyan}${templateJson.extends.version}${colors.reset}`
          );
        }
        console.log(`Patch file: ${patchPath}\n`);
        console.log('─'.repeat(80));
        console.log(patchContent);
        console.log('─'.repeat(80));
      } catch (error) {
        console.error(
          chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    });
}
