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
import { findTemplate, type TemplateInfo } from '../../../core/discovery.js';
import { selectTemplate } from '../../interactive.js';

// ANSI color codes
const colors = {
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

/**
 * Get the inheritance chain for a template (from template down to base)
 */
function getInheritanceChain(templateInfo: TemplateInfo): TemplateInfo[] {
  const chain: TemplateInfo[] = [templateInfo];
  let current = templateInfo;

  while (true) {
    const parentTemplate = current.descriptor.extends?.template || current.descriptor.basedOn;
    if (!parentTemplate) {
      break; // Reached base template
    }

    // Resolve parent template name with version
    const parentVersion = current.descriptor.extends?.version || '1.0.0';
    const parentName =
      parentVersion === 'latest' ? parentTemplate : `${parentTemplate}@${parentVersion}`;

    const parentInfo = findTemplate(parentName);
    if (!parentInfo) {
      break; // Parent not found, stop chain
    }

    chain.push(parentInfo);
    current = parentInfo;
  }

  return chain;
}

/**
 * Show diff for a single template to its parent
 */
function showSingleDiff(
  templateInfo: TemplateInfo,
  templateDirectory: string,
  showHeader: boolean = true
): void {
  const templateJson = templateInfo.descriptor;
  const templateName = templateInfo.descriptor.name;

  // Check if this is a layered template (support both old and new format)
  const parentTemplate = templateJson.extends?.template || templateJson.basedOn;
  const patchFile =
    templateJson.extends?.patchFile || templateJson.layer?.patchFile || 'layer.patch';

  if (!parentTemplate) {
    if (showHeader) {
      console.log(`\n${colors.cyan}${templateName}${colors.reset} is a base template (no parent)`);
    }
    return;
  }

  // Check if layer.patch exists
  const patchPath = join(templateDirectory, patchFile);
  if (!existsSync(patchPath)) {
    if (showHeader) {
      console.log(
        `\n${colors.cyan}${templateName}${colors.reset}: ${patchFile} not found at ${patchPath}`
      );
    }
    return;
  }

  // Read and display the patch
  const patchContent = readFileSync(patchPath, 'utf-8');

  if (showHeader) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`Template: ${colors.cyan}${templateName}${colors.reset}`);
    console.log(`Based on: ${colors.cyan}${parentTemplate}${colors.reset}`);
    if (templateJson.extends?.version) {
      console.log(`Parent version: ${colors.cyan}${templateJson.extends.version}${colors.reset}`);
    }
    console.log(`Patch file: ${patchPath}`);
    console.log('─'.repeat(80));
  }

  if (patchContent.trim().length === 0) {
    console.log(`${patchFile} is empty. Run "magen-template template layer" to generate it.`);
  } else {
    console.log(patchContent);
  }

  if (showHeader) {
    console.log('─'.repeat(80));
  }
}

export function registerDiffCommand(templateCmd: Command): void {
  templateCmd
    .command('diff [name]')
    .description('Show the layer.patch diff for a layered template')
    .option('--out <path>', 'Template directory')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .option('-r, --recursive', 'Show diffs recursively from template down to base')
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
        const templateInfo = findTemplate(finalTemplateName);
        if (!templateInfo) {
          throw new Error(`Template not found: ${finalTemplateName}`);
        }

        if (options.recursive) {
          // Recursive mode: show all diffs from template down to base
          console.log(
            `\nShowing recursive layer patches from: ${colors.cyan}${finalTemplateName}${colors.reset} down to base\n`
          );

          const chain = getInheritanceChain(templateInfo);

          if (chain.length === 1) {
            // Template has no parent
            console.log(
              `${colors.cyan}${finalTemplateName}${colors.reset} is a base template (no parent)`
            );
            return;
          }

          // Show diffs for each template in the chain (except the last one, which is the base)
          for (let i = 0; i < chain.length - 1; i++) {
            const currentTemplate = chain[i];
            const templateDirectory = options.out || currentTemplate.templatePath;
            showSingleDiff(currentTemplate, templateDirectory, true);
          }
        } else {
          // Non-recursive mode: show only the immediate parent diff
          console.log(
            `\nShowing layer patch for: ${colors.cyan}${finalTemplateName}${colors.reset}\n`
          );

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
            console.log(
              `${patchFile} is empty. Run "magen-template template layer" to generate it.`
            );
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
        }
      } catch (error) {
        console.error(
          chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    });
}
