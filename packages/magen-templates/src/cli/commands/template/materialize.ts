/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';
import { existsSync, readFileSync, rmSync, cpSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import chalk from 'chalk';
import { findTemplate } from '../../../core/discovery.js';
import { materializeTemplate } from '../../../core/layering.js';
import type { TemplateDescriptor } from '../../../core/schema.js';
import { selectTemplate, confirmAction } from '../../interactive.js';

export function registerMaterializeCommand(templateCmd: Command): void {
  templateCmd
    .command('materialize [name]')
    .description('Materialize layer.patch to work/ directory')
    .option('--out <path>', 'Override template directory (defaults to discovered template path)')
    .option('--force', 'Overwrite existing work/ directory')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .action(async (templateName: string | undefined, options) => {
      let finalTemplateName = templateName;
      let shouldForce = options.force;

      // Interactive mode
      if (options.interactive || !templateName) {
        console.log(chalk.bold('\n🔄 Interactive Template Materialization\n'));

        if (!finalTemplateName) {
          finalTemplateName = await selectTemplate({
            message: 'Select layered template to materialize:',
          });
        }

        // Check if work/ already exists and ask about force
        const templateInfo = findTemplate(finalTemplateName);
        if (templateInfo && !shouldForce) {
          const workDir = join(templateInfo.templatePath, 'work');
          if (existsSync(workDir)) {
            shouldForce = await confirmAction('work/ directory already exists. Overwrite?', false);
          }
        }
      }

      if (!finalTemplateName) {
        console.error(chalk.red('\nError: Template name is required'));
        console.error(
          chalk.gray("Run 'magen-template template materialize --interactive' for interactive mode")
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
        console.log(`\nMaterializing template: ${chalk.cyan(finalTemplateName)}`);
        console.log(`Template directory: ${templateDirectory}`);

        // Check if template directory exists
        if (!existsSync(templateDirectory)) {
          throw new Error(`Template directory not found: ${templateDirectory}`);
        }

        // Load template.json
        const templateJsonPath = join(templateDirectory, 'template.json');
        if (!existsSync(templateJsonPath)) {
          throw new Error(`Template descriptor not found at ${templateJsonPath}`);
        }

        const templateJson: TemplateDescriptor = JSON.parse(
          readFileSync(templateJsonPath, 'utf-8')
        );

        // Check if this is a layered template (support both old and new format)
        const parentTemplate = templateJson.extends?.template || templateJson.basedOn;

        if (!parentTemplate) {
          throw new Error(
            `Template ${templateName} is not a layered template. ` +
              `Only layered templates can be materialized to work/.`
          );
        }

        // Check if work/ already exists
        const workDir = join(templateDirectory, 'work');
        if (existsSync(workDir) && !shouldForce) {
          throw new Error(
            `work/ directory already exists at ${workDir}. ` +
              `Use --force to overwrite, or delete it manually first.`
          );
        }

        // Find the template to get variables
        const templateInfo = findTemplate(finalTemplateName);
        if (!templateInfo) {
          throw new Error(`Template not found: ${finalTemplateName}`);
        }

        // Get default values for all variables
        const variables: Record<string, string | number | boolean> = {};
        for (const variable of templateInfo.descriptor.variables) {
          if (variable.default !== undefined) {
            variables[variable.name] = variable.default;
          } else if (variable.required) {
            // For required variables without defaults, use placeholder values
            switch (variable.type) {
              case 'string':
                variables[variable.name] = `{{${variable.name}}}`;
                break;
              case 'number':
                variables[variable.name] = 0;
                break;
              case 'boolean':
                variables[variable.name] = false;
                break;
            }
          }
        }

        console.log(chalk.yellow('\nMaterializing with placeholder variables...'));

        // Materialize the template
        const tempDir = join(tmpdir(), `magen-materialize-${Date.now()}`);
        try {
          materializeTemplate({
            template: templateJson,
            targetDirectory: tempDir,
            templateDirectory,
          });

          // Remove existing work/ directory if it exists
          if (existsSync(workDir)) {
            rmSync(workDir, { recursive: true, force: true });
          }

          // Copy materialized template to work/
          cpSync(tempDir, workDir, { recursive: true });

          console.log(chalk.green('\n✓ Template materialized successfully!'));
          console.log(`\n  Work directory: ${chalk.cyan(workDir)}`);
          console.log(`  Based on: ${chalk.cyan(templateJson.basedOn)}`);

          console.log(chalk.bold('\n📋 Next steps:'));
          console.log(chalk.gray(`  1. Edit files in ${workDir}`));
          console.log(
            chalk.gray(
              `  2. Generate layer patch: magen-template template layer ${finalTemplateName}`
            )
          );
          console.log(
            chalk.gray(`  3. Test generation: magen-template template test ${finalTemplateName}`)
          );
          console.log('');
        } finally {
          // Clean up temp directory
          if (existsSync(tempDir)) {
            rmSync(tempDir, { recursive: true, force: true });
          }
        }
      } catch (error) {
        console.error(
          chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    });
}
