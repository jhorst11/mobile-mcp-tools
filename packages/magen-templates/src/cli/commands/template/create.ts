/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  cpSync,
  rmSync,
  readFileSync,
} from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';
import { findTemplate } from '../../../core/discovery.js';
import { materializeTemplate } from '../../../core/layering.js';
import type { TemplateVariable } from '../../../core/schema.js';
import { promptTemplateCreate } from '../../interactive.js';

export function registerCreateCommand(templateCmd: Command): void {
  templateCmd
    .command('create [name]')
    .description('Create new template (optionally layered)')
    .option('--based-on <parent>', 'Parent template name (for layered templates)')
    .option('--platform <platform>', 'Platform: ios, android, web', 'ios')
    .option('--template-version <version>', 'Template version (semver format)', '1.0.0')
    .option('--out <path>', 'Base templates directory (default: ./templates)')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .action(async (templateName: string | undefined, options) => {
      let finalTemplateName = templateName;
      let finalPlatform = options.platform;
      let finalVersion = options.templateVersion;
      let finalBasedOn = options.basedOn;

      // Interactive mode
      if (options.interactive || !templateName) {
        console.log(chalk.bold('\n🎨 Interactive Template Creation\n'));

        const params = await promptTemplateCreate();
        finalTemplateName = params.name;
        finalPlatform = params.platform;
        finalVersion = params.version;
        finalBasedOn = params.basedOn;
      }

      if (!finalTemplateName) {
        console.error(chalk.red('\nError: Template name is required'));
        console.error(
          chalk.gray("Run 'magen-template template create --interactive' for interactive mode")
        );
        process.exit(1);
      }

      // Validate version format
      const templateVersion = finalVersion;
      if (!/^\d+\.\d+\.\d+$/.test(templateVersion)) {
        console.error(`\nError: Invalid version format: ${templateVersion}`);
        console.error('Version must be semver format (e.g., 1.0.0)');
        process.exit(1);
      }

      // Build versioned directory path: templates/{name}/{version}/
      const templatesBaseDir = options.out || join(process.cwd(), 'templates');
      const templateDirectory = join(templatesBaseDir, finalTemplateName, templateVersion);

      try {
        console.log(`\nCreating template: ${chalk.cyan(finalTemplateName)}`);
        console.log(`Platform: ${finalPlatform}`);
        console.log(`Version: ${templateVersion}`);
        if (finalBasedOn) {
          console.log(`Based on: ${chalk.cyan(finalBasedOn)}`);
        }
        console.log(`Template directory: ${templateDirectory}\n`);

        // Check if template directory already exists
        if (existsSync(templateDirectory)) {
          const entries = readdirSync(templateDirectory);
          if (entries.length > 0) {
            throw new Error(
              `Template directory already exists and is not empty: ${templateDirectory}`
            );
          }
        }

        // Load parent template if specified
        let parentVariables: TemplateVariable[] = [];

        if (finalBasedOn) {
          try {
            const parentTemplateInfo = findTemplate(finalBasedOn);
            if (!parentTemplateInfo) {
              throw new Error(`Parent template not found: ${finalBasedOn}`);
            }

            parentVariables = parentTemplateInfo.descriptor.variables;
            console.log(`✓ Found parent template: ${chalk.cyan(finalBasedOn)}`);

            // For layered templates, copy parent to work/ directory for editing
            // (template/ directory is NOT used for layered templates - only the patch)
            const workDir = join(templateDirectory, 'work');

            // If parent is a base template, copy from template/
            // If parent is a layered template, we need to materialize it first
            const parentTemplateDir = join(parentTemplateInfo.templatePath, 'template');

            if (existsSync(parentTemplateDir)) {
              // Parent is a base template - copy directly from template/
              cpSync(parentTemplateDir, workDir, { recursive: true });
              console.log(`✓ Copied parent template files to work/ directory for editing`);

              // Also copy parent's variables.json to work/
              const parentVariablesPath = join(parentTemplateInfo.templatePath, 'variables.json');
              if (existsSync(parentVariablesPath)) {
                cpSync(parentVariablesPath, join(workDir, 'variables.json'));
                console.log(`✓ Copied parent variables.json to work/ directory`);
              }
            } else {
              // Parent is a layered template - need to materialize it first
              console.log(`Parent is a layered template - materializing...`);
              const tempDir = join(dirname(templateDirectory), `.temp-${Date.now()}`);

              try {
                materializeTemplate({
                  template: parentTemplateInfo.descriptor,
                  targetDirectory: tempDir,
                  templateDirectory: parentTemplateInfo.templatePath,
                });

                // Copy materialized files to work/
                cpSync(tempDir, workDir, { recursive: true });
                console.log(
                  `✓ Copied materialized parent template files to work/ directory for editing`
                );
              } finally {
                // Clean up temp directory
                if (existsSync(tempDir)) {
                  rmSync(tempDir, { recursive: true, force: true });
                }
              }
            }
          } catch {
            console.warn(`⚠ Warning: Could not load parent template ${finalBasedOn}`);
            console.warn(`  You can still create the template, but variables won't be inherited.`);
          }
        } else {
          // For base templates, create empty template/ directory
          mkdirSync(join(templateDirectory, 'template'), { recursive: true });
        }

        // Create template.json (metadata only, no variables)
        const templateJson: {
          name: string;
          platform: string;
          version: string;
          description: string;
          tags: string[];
          extends?: { template: string; version: string; patchFile: string };
        } = {
          name: finalTemplateName,
          platform: finalPlatform,
          version: templateVersion,
          description: `${finalTemplateName} template${finalBasedOn ? ` based on ${finalBasedOn}` : ''}`,
          tags: [],
        };

        // Add extends configuration if based on another template
        if (finalBasedOn) {
          // Get parent template to extract version
          const parentInfo = findTemplate(finalBasedOn);
          const parentVersion = parentInfo?.descriptor.version || '1.0.0';

          templateJson.extends = {
            template: finalBasedOn,
            version: parentVersion,
            patchFile: 'layer.patch',
          };
        }

        writeFileSync(
          join(templateDirectory, 'template.json'),
          JSON.stringify(templateJson, null, 2) + '\n',
          'utf-8'
        );

        // Create variables.json (only for base templates, not layered)
        // For layered templates, variables.json is in work/ and will be part of the patch
        let variablesJson;
        if (!options.basedOn) {
          variablesJson = {
            variables: [
              {
                name: 'appName',
                type: 'string',
                required: true,
                description: 'The name of the application',
                default: 'MyApp',
              },
            ],
          };

          writeFileSync(
            join(templateDirectory, 'variables.json'),
            JSON.stringify(variablesJson, null, 2) + '\n',
            'utf-8'
          );
        } else {
          // For layered templates, read variables from work/variables.json for README
          const workVariablesPath = join(templateDirectory, 'work', 'variables.json');
          if (existsSync(workVariablesPath)) {
            variablesJson = JSON.parse(readFileSync(workVariablesPath, 'utf-8'));
          } else {
            variablesJson = { variables: parentVariables };
          }
        }

        // Create a basic README
        const readmeContent = `# ${finalTemplateName}

${templateJson.description}

## Variables

${variablesJson.variables
  .map((v: TemplateVariable) => {
    const required = v.required ? '(required)' : '(optional)';
    const defaultVal = v.default !== undefined ? ` - default: \`${v.default}\`` : '';
    const desc = v.description || '';
    return `- **${v.name}** (\`${v.type}\`) ${required}: ${desc}${defaultVal}`;
  })
  .join('\n')}

## Usage

\`\`\`bash
magen-template generate ${finalTemplateName} --out ~/MyApp --var appName="MyApp"
\`\`\`

${
  finalBasedOn
    ? `## Development

This template is based on \`${finalBasedOn}\`. To modify:

1. Edit files in \`work/\` directory (concrete files copied from parent)
2. Make your changes (add/modify/delete files)
3. Generate layer patch: \`magen-template template layer ${finalTemplateName}\`
4. Test: \`magen-template template test ${finalTemplateName}\`

**Note**: Only \`template.json\`, \`layer.patch\`, and \`README.md\` are checked into version control.
The \`work/\` directory is for development only (add to .gitignore).
`
    : `## Development

1. Create your template files in \`template/\` directory
2. Use Handlebars placeholders like \`{{appName}}\`
3. Test: \`magen-template template test ${finalTemplateName}\`
`
}`;

        writeFileSync(join(templateDirectory, 'README.md'), readmeContent, 'utf-8');

        // For layered templates, create an empty layer.patch file
        if (finalBasedOn) {
          writeFileSync(join(templateDirectory, 'layer.patch'), '', 'utf-8');
          console.log(
            `  layer.patch: Created (empty - will be generated when you run 'template layer')`
          );
        }

        console.log(chalk.green('\n✓ Template created successfully!'));
        console.log(`\n  Template directory: ${chalk.cyan(templateDirectory)}`);
        console.log(`  template.json: Created`);
        if (!finalBasedOn) {
          console.log(`  variables.json: Created with ${variablesJson.variables.length} variables`);
        } else {
          console.log(
            `  work/variables.json: Inherited ${variablesJson.variables.length} variables from parent`
          );
        }
        console.log(`  README.md: Created`);

        console.log(chalk.bold('\n📋 Next steps:'));
        if (finalBasedOn) {
          console.log(chalk.gray(`  1. Edit files in: ${join(templateDirectory, 'work')}/`));
          console.log(chalk.gray(`  2. Make your changes (add/modify/delete files)`));
          console.log(
            chalk.gray(
              `  3. Generate layer patch: magen-template template layer ${finalTemplateName}`
            )
          );
          console.log(chalk.gray(`  4. Test: magen-template template test ${finalTemplateName}`));
          console.log(
            chalk.yellow(
              `\n💡 Note: For layered templates, only template.json and layer.patch are checked in.`
            )
          );
          console.log(
            chalk.yellow(
              `      The work/ directory is just for development (add it to .gitignore).`
            )
          );
        } else {
          console.log(
            chalk.gray(`  1. Create template files in: ${join(templateDirectory, 'template')}/`)
          );
          console.log(chalk.gray(`  2. Use Handlebars placeholders like {{appName}}`));
          console.log(chalk.gray(`  3. Test: magen-template template test ${finalTemplateName}`));
        }
        console.log('');
      } catch (error) {
        console.error(
          chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    });
}
