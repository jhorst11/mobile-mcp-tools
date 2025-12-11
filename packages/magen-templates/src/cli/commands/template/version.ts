/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { findTemplate } from '../../../core/discovery.js';
import { materializeTemplate } from '../../../core/layering.js';
import { selectTemplate, promptForTemplateVersion } from '../../interactive.js';

export function registerVersionCommand(templateCmd: Command): void {
  templateCmd
    .command('version [name] [new-version]')
    .description('Create a new version of an existing template')
    .option('--source-version <version>', 'Source version to copy from (defaults to latest)')
    .option('--out <path>', 'Base templates directory (default: ./templates)')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .action(async (templateName: string | undefined, newVersion: string | undefined, options) => {
      let finalTemplateName = templateName;
      let finalNewVersion = newVersion;

      // Interactive mode
      if (options.interactive || !templateName || !newVersion) {
        console.log(chalk.bold('\n📦 Interactive Template Versioning\n'));

        if (!finalTemplateName) {
          finalTemplateName = await selectTemplate({
            message: 'Select template to create new version of:',
          });
        }

        if (!finalNewVersion) {
          finalNewVersion = await promptForTemplateVersion(
            'Enter new version (semver, e.g., 2.0.0):'
          );
        }
      }

      if (!finalTemplateName) {
        console.error(chalk.red('\nError: Template name is required'));
        console.error(
          chalk.gray("Run 'magen-template template version --interactive' for interactive mode")
        );
        process.exit(1);
      }

      if (!finalNewVersion) {
        console.error(chalk.red('\nError: New version is required'));
        console.error(
          chalk.gray("Run 'magen-template template version --interactive' for interactive mode")
        );
        process.exit(1);
      }
      try {
        // Validate semver format
        if (!/^\d+\.\d+\.\d+$/.test(finalNewVersion)) {
          throw new Error(
            `Invalid version format: ${finalNewVersion}. Must be semver format (e.g., 2.0.0)`
          );
        }

        console.log(`\nCreating new version of template: ${chalk.cyan(finalTemplateName)}`);
        console.log(`New version: ${chalk.cyan(finalNewVersion)}`);

        // Find source template
        const sourceVersion = options.sourceVersion;
        const sourceTemplate = sourceVersion
          ? findTemplate(`${finalTemplateName}@${sourceVersion}`)
          : findTemplate(finalTemplateName); // Gets latest

        if (!sourceTemplate) {
          throw new Error(
            `Source template not found: ${finalTemplateName}${sourceVersion ? `@${sourceVersion}` : ''}`
          );
        }

        console.log(
          `Source version: ${chalk.cyan(sourceTemplate.descriptor.version)} at ${sourceTemplate.templatePath}`
        );

        // Determine output directory
        const templatesBaseDir = options.out || join(process.cwd(), 'templates');
        const newVersionDir = join(templatesBaseDir, finalTemplateName, finalNewVersion);

        // Check if new version already exists
        if (existsSync(newVersionDir)) {
          throw new Error(
            `Version ${finalNewVersion} of ${finalTemplateName} already exists at ${newVersionDir}`
          );
        }

        console.log(`Target directory: ${chalk.gray(newVersionDir)}`);

        // Create new version directory
        mkdirSync(newVersionDir, { recursive: true });

        // Determine if this is a base or layered template
        const isLayered = !!sourceTemplate.descriptor.extends;

        if (isLayered) {
          // Layered template: copy template.json, layer.patch, and README
          console.log(
            `\nTemplate is layered (extends ${sourceTemplate.descriptor.extends!.template})`
          );

          // Copy and update template.json
          const sourceTemplateJson = JSON.parse(
            readFileSync(join(sourceTemplate.templatePath, 'template.json'), 'utf-8')
          );
          sourceTemplateJson.version = finalNewVersion;

          writeFileSync(
            join(newVersionDir, 'template.json'),
            JSON.stringify(sourceTemplateJson, null, 2) + '\n',
            'utf-8'
          );
          console.log(chalk.green(`✓ Created template.json with version ${finalNewVersion}`));

          // Copy layer.patch if it exists
          const sourcePatchPath = join(sourceTemplate.templatePath, 'layer.patch');
          if (existsSync(sourcePatchPath)) {
            cpSync(sourcePatchPath, join(newVersionDir, 'layer.patch'));
            console.log(chalk.green(`✓ Copied layer.patch from source version`));
          }

          // Copy README if it exists
          const sourceReadmePath = join(sourceTemplate.templatePath, 'README.md');
          if (existsSync(sourceReadmePath)) {
            cpSync(sourceReadmePath, join(newVersionDir, 'README.md'));
            console.log(chalk.green(`✓ Copied README.md`));
          }

          // Materialize parent to work/ directory for editing
          console.log(
            chalk.yellow(`\nMaterializing parent template to work/ directory for editing...`)
          );
          const workDir = join(newVersionDir, 'work');
          const parentInfo = findTemplate(
            `${sourceTemplate.descriptor.extends!.template}@${sourceTemplate.descriptor.extends!.version}`
          );

          if (!parentInfo) {
            throw new Error(
              `Parent template not found: ${sourceTemplate.descriptor.extends!.template}@${sourceTemplate.descriptor.extends!.version}`
            );
          }

          const parentTemplateDir = join(parentInfo.templatePath, 'template');

          if (existsSync(parentTemplateDir)) {
            // Parent is a base template
            cpSync(parentTemplateDir, workDir, { recursive: true });
            console.log(chalk.green(`✓ Copied parent template files to work/ directory`));

            // Copy parent's variables.json to work/
            const parentVariablesPath = join(parentInfo.templatePath, 'variables.json');
            if (existsSync(parentVariablesPath)) {
              cpSync(parentVariablesPath, join(workDir, 'variables.json'));
              console.log(chalk.green(`✓ Copied parent variables.json to work/ directory`));
            }
          } else {
            // Parent is layered - materialize it
            const tempDir = join(tmpdir(), `magen-materialize-${Date.now()}`);
            try {
              materializeTemplate({
                template: parentInfo.descriptor,
                targetDirectory: tempDir,
                templateDirectory: parentInfo.templatePath,
              });
              cpSync(tempDir, workDir, { recursive: true });
              console.log(
                chalk.green(`✓ Copied materialized parent template files to work/ directory`)
              );
            } finally {
              if (existsSync(tempDir)) {
                rmSync(tempDir, { recursive: true, force: true });
              }
            }
          }

          // Apply existing patch to work/ directory
          if (existsSync(sourcePatchPath)) {
            console.log(chalk.yellow(`\nApplying existing layer patch to work/ directory...`));
            const gitRepoDir = workDir;

            try {
              // Initialize git in work directory
              execSync('git init', { cwd: gitRepoDir, stdio: 'pipe' });
              execSync('git config user.email "magen@salesforce.com"', {
                cwd: gitRepoDir,
                stdio: 'pipe',
              });
              execSync('git config user.name "Magen Template System"', {
                cwd: gitRepoDir,
                stdio: 'pipe',
              });

              // Commit current state
              execSync('git add -A', { cwd: gitRepoDir, stdio: 'pipe' });
              execSync('git commit -m "Base"', { cwd: gitRepoDir, stdio: 'pipe' });

              // Apply patch
              execSync(`git apply --allow-empty "${sourcePatchPath}"`, {
                cwd: gitRepoDir,
                stdio: 'pipe',
              });

              // Clean up git
              rmSync(join(gitRepoDir, '.git'), { recursive: true, force: true });

              console.log(chalk.green(`✓ Applied existing layer.patch to work/ directory`));
            } catch (error) {
              console.warn(
                chalk.yellow(
                  `⚠ Warning: Could not apply patch automatically. You may need to manually merge changes.`
                )
              );
              console.warn(
                chalk.gray(`  Error: ${error instanceof Error ? error.message : String(error)}`)
              );

              // Clean up git even on error
              const gitDir = join(gitRepoDir, '.git');
              if (existsSync(gitDir)) {
                rmSync(gitDir, { recursive: true, force: true });
              }
            }
          }
        } else {
          // Base template: copy template/, template.json, variables.json, and README
          console.log(`\nTemplate is a base template`);

          // Copy template/ directory
          const sourceTemplateDir = join(sourceTemplate.templatePath, 'template');
          if (existsSync(sourceTemplateDir)) {
            cpSync(sourceTemplateDir, join(newVersionDir, 'template'), { recursive: true });
            console.log(`✓ Copied template/ directory`);
          }

          // Copy and update template.json
          const sourceTemplateJson = JSON.parse(
            readFileSync(join(sourceTemplate.templatePath, 'template.json'), 'utf-8')
          );
          sourceTemplateJson.version = finalNewVersion;

          writeFileSync(
            join(newVersionDir, 'template.json'),
            JSON.stringify(sourceTemplateJson, null, 2) + '\n',
            'utf-8'
          );
          console.log(chalk.green(`✓ Created template.json with version ${finalNewVersion}`));

          // Copy variables.json
          const sourceVariablesPath = join(sourceTemplate.templatePath, 'variables.json');
          if (existsSync(sourceVariablesPath)) {
            cpSync(sourceVariablesPath, join(newVersionDir, 'variables.json'));
            console.log(chalk.green(`✓ Copied variables.json`));
          }

          // Copy README if it exists
          const sourceReadmePath = join(sourceTemplate.templatePath, 'README.md');
          if (existsSync(sourceReadmePath)) {
            cpSync(sourceReadmePath, join(newVersionDir, 'README.md'));
            console.log(chalk.green(`✓ Copied README.md`));
          }
        }

        console.log(
          chalk.green(`\n✓ Successfully created version ${finalNewVersion} of ${finalTemplateName}`)
        );
        console.log(chalk.bold(`\n📋 Next steps:`));
        if (isLayered) {
          console.log(chalk.gray(`  1. Edit files in ${newVersionDir}/work/`));
          console.log(
            chalk.gray(
              `  2. Generate new layer patch: magen-template template layer ${finalTemplateName} --out ${newVersionDir}`
            )
          );
          console.log(
            chalk.gray(
              `  3. Test the template: magen-template template test ${finalTemplateName}@${finalNewVersion}`
            )
          );
        } else {
          console.log(chalk.gray(`  1. Edit files in ${newVersionDir}/template/`));
          console.log(chalk.gray(`  2. Update ${newVersionDir}/variables.json if needed`));
          console.log(
            chalk.gray(
              `  3. Test the template: magen-template template test ${finalTemplateName}@${finalNewVersion}`
            )
          );
        }
        console.log(
          chalk.gray(
            `  4. Update dependent templates to use new version (or keep them pinned to current version)\n`
          )
        );
      } catch (error) {
        console.error(
          chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    });
}
