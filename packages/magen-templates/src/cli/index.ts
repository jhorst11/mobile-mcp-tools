#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  cpSync,
  rmSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { Command } from 'commander';
import { listTemplates, getTemplate, findTemplate } from '../core/discovery.js';
import { generateApp } from '../core/generator.js';
import { testTemplate, watchTemplate } from '../core/testing.js';
import { createLayer, materializeTemplate } from '../core/layering.js';
import type { TemplateVariable, TemplateDescriptor } from '../core/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  const packageJsonPath = join(__dirname, '../../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
}

function parseVariables(varArgs: string[]): Record<string, string | number | boolean> {
  const variables: Record<string, string | number | boolean> = {};

  for (const varArg of varArgs) {
    const [name, value] = varArg.split('=');

    if (!name || value === undefined) {
      console.error(`Error: Invalid variable format: ${varArg}`);
      console.error('Expected format: --var name=value');
      process.exit(1);
    }

    // Try to parse as number or boolean
    if (value === 'true') {
      variables[name] = true;
    } else if (value === 'false') {
      variables[name] = false;
    } else if (/^\d+$/.test(value)) {
      variables[name] = parseInt(value, 10);
    } else if (/^\d+\.\d+$/.test(value)) {
      variables[name] = parseFloat(value);
    } else {
      variables[name] = value;
    }
  }

  return variables;
}

const program = new Command();

program
  .name('magen-template')
  .description('Layered, platform-agnostic app templating engine')
  .version(getVersion(), '-v, --version', 'output the version number')
  .configureOutput({
    writeOut: str => {
      // Customize version output to match expected format
      if (str.trim().match(/^\d+\.\d+\.\d+$/)) {
        process.stdout.write(`magen-template v${str}`);
      } else {
        process.stdout.write(str);
      }
    },
    writeErr: str => process.stderr.write(str),
  });

// ANSI color codes
const colors = {
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
};

/**
 * Build the complete inheritance chain for a template
 */
function buildInheritanceChain(templateName: string, allTemplates: TemplateDescriptor[]): string[] {
  const chain: string[] = [templateName];
  const templateMap = new Map(allTemplates.map(t => [t.name, t]));

  let current = templateMap.get(templateName);
  while (current?.basedOn) {
    chain.push(current.basedOn);
    current = templateMap.get(current.basedOn);
  }

  return chain;
}

/**
 * Format the inheritance tree for display
 */
function formatInheritanceTree(chain: string[]): string {
  if (chain.length <= 1) {
    return '';
  }

  const lines: string[] = ['', '    Based on:'];

  for (let i = 1; i < chain.length; i++) {
    const indent = '  '.repeat(i);
    lines.push(
      `      ${indent}${colors.gray}└─${colors.reset} ${colors.cyan}${chain[i]}${colors.reset}`
    );
  }

  return lines.join('\n');
}

// List command
program
  .command('list')
  .description('List available templates')
  .option('--platform <platform>', 'Filter by platform (ios, android, web)')
  .action(options => {
    const templates = listTemplates({ platform: options.platform });

    if (templates.length === 0) {
      console.log('No templates found.');
      return;
    }

    console.log('\nAvailable Templates:\n');

    for (const template of templates) {
      const tags = template.tags?.length ? ` [${template.tags.join(', ')}]` : '';
      console.log(`  ${colors.cyan}${template.name}${colors.reset} (${template.platform})${tags}`);

      if (template.description) {
        console.log(`    ${template.description}`);
      }

      // Show inheritance tree
      const chain = buildInheritanceChain(template.name, templates);
      const tree = formatInheritanceTree(chain);
      if (tree) {
        console.log(tree);
      }

      console.log('');
    }
  });

// Show command
program
  .command('show <name>')
  .description('Show template metadata and schema')
  .action((templateName: string) => {
    try {
      const template = getTemplate(templateName);

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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Generate command
program
  .command('generate <template>')
  .description('Generate a concrete app from template')
  .requiredOption('--out <directory>', 'Output directory for generated app')
  .option('--var <name=value...>', 'Template variable(s)', [])
  .option('--overwrite', 'Overwrite existing output directory')
  .action((templateName: string, options) => {
    const variables = parseVariables(options.var);

    try {
      console.log(`Generating ${templateName} to ${options.out}...`);

      generateApp({
        templateName,
        outputDirectory: options.out,
        variables,
        overwrite: options.overwrite,
      });

      console.log('✓ App generated successfully!');

      if (Object.keys(variables).length > 0) {
        console.log('\nVariables used:');
        for (const [name, value] of Object.entries(variables)) {
          console.log(`  ${name}: ${value}`);
        }
      }
    } catch (error) {
      console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Template command group
const templateCmd = program.command('template').description('Template management commands');

// Template create subcommand
templateCmd
  .command('create <name>')
  .description('Create new template (optionally layered)')
  .option('--based-on <parent>', 'Parent template name (for layered templates)')
  .option('--platform <platform>', 'Platform: ios, android, web', 'ios')
  .option('--out <path>', 'Template directory')
  .action((templateName: string, options) => {
    const templateDirectory = options.out || join(process.cwd(), 'templates', templateName);

    try {
      console.log(`\nCreating template: ${templateName}`);
      console.log(`Platform: ${options.platform}`);
      if (options.basedOn) {
        console.log(`Based on: ${options.basedOn}`);
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

      if (options.basedOn) {
        try {
          const parentTemplateInfo = findTemplate(options.basedOn);
          if (!parentTemplateInfo) {
            throw new Error(`Parent template not found: ${options.basedOn}`);
          }

          parentVariables = parentTemplateInfo.descriptor.variables;
          console.log(`✓ Found parent template: ${options.basedOn}`);

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
        } catch (_error) {
          console.warn(`⚠ Warning: Could not load parent template ${options.basedOn}`);
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
        basedOn?: string;
        layer?: { patchFile: string };
      } = {
        name: templateName,
        platform: options.platform,
        version: '1.0.0',
        description: `${templateName} template${options.basedOn ? ` based on ${options.basedOn}` : ''}`,
        tags: [],
      };

      // Add layer configuration if based on another template
      if (options.basedOn) {
        templateJson.basedOn = options.basedOn;
        templateJson.layer = {
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
      const readmeContent = `# ${templateName}

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
magen-template generate ${templateName} --out ~/MyApp --var appName="MyApp"
\`\`\`

${
  options.basedOn
    ? `## Development

This template is based on \`${options.basedOn}\`. To modify:

1. Edit files in \`work/\` directory (concrete files copied from parent)
2. Make your changes (add/modify/delete files)
3. Generate layer patch: \`magen-template template layer ${templateName}\`
4. Test: \`magen-template template test ${templateName}\`

**Note**: Only \`template.json\`, \`layer.patch\`, and \`README.md\` are checked into version control.
The \`work/\` directory is for development only (add to .gitignore).
`
    : `## Development

1. Create your template files in \`template/\` directory
2. Use Handlebars placeholders like \`{{appName}}\`
3. Test: \`magen-template template test ${templateName}\`
`
}`;

      writeFileSync(join(templateDirectory, 'README.md'), readmeContent, 'utf-8');

      // For layered templates, create an empty layer.patch file
      if (options.basedOn) {
        writeFileSync(join(templateDirectory, 'layer.patch'), '', 'utf-8');
        console.log(
          `  layer.patch: Created (empty - will be generated when you run 'template layer')`
        );
      }

      console.log('✓ Template created successfully!');
      console.log(`\n  Template directory: ${templateDirectory}`);
      console.log(`  template.json: Created`);
      if (!options.basedOn) {
        console.log(`  variables.json: Created with ${variablesJson.variables.length} variables`);
      } else {
        console.log(
          `  work/variables.json: Inherited ${variablesJson.variables.length} variables from parent`
        );
      }
      console.log(`  README.md: Created`);

      console.log('\nNext steps:');
      if (options.basedOn) {
        console.log(`  1. Edit files in: ${join(templateDirectory, 'work')}/`);
        console.log(`  2. Make your changes (add/modify/delete files)`);
        console.log(`  3. Generate layer patch: magen-template template layer ${templateName}`);
        console.log(`  4. Test: magen-template template test ${templateName}`);
        console.log(
          `\nNote: For layered templates, only template.json and layer.patch are checked in.`
        );
        console.log(`      The work/ directory is just for development (add it to .gitignore).`);
      } else {
        console.log(`  1. Create template files in: ${join(templateDirectory, 'template')}/`);
        console.log(`  2. Use Handlebars placeholders like {{appName}}`);
        console.log(`  3. Test: magen-template template test ${templateName}`);
      }
      console.log('');
    } catch (error) {
      console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Template test subcommand
templateCmd
  .command('test <name>')
  .description('Generate/validate test instance')
  .option('--regenerate', 'Force regeneration even if test directory exists')
  .option('--watch', 'Watch for changes and auto-regenerate')
  .option('--out <path>', 'Template directory')
  .option('--var <name=value...>', 'Override template variable(s)', [])
  .action((templateName: string, options) => {
    const templateDirectory = options.out || join(process.cwd(), 'templates', templateName);
    const variables = parseVariables(options.var);

    try {
      // Watch mode
      if (options.watch) {
        const cleanup = watchTemplate({
          templateName,
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
      console.log(`\nTesting template: ${templateName}`);
      console.log(`Template directory: ${templateDirectory}`);
      if (options.regenerate) {
        console.log('Regenerating test directory...');
      }

      // Check if this is a layered template and auto-generate layer.patch
      const templateJsonPath = join(templateDirectory, 'template.json');
      if (existsSync(templateJsonPath)) {
        const templateJson = JSON.parse(readFileSync(templateJsonPath, 'utf-8'));
        if (templateJson.basedOn) {
          console.log('🔄 Generating layer.patch from work/ directory...');
          try {
            createLayer({
              templateName,
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
        templateName,
        templateDirectory,
        variables,
        regenerate: options.regenerate,
      });

      if (result.created) {
        console.log('✓ Test instance created successfully!');
      } else {
        console.log('✓ Using existing test instance');
      }
      console.log(`\n  Test directory: ${result.workDirectory}`);

      if (Object.keys(result.variables).length > 0) {
        console.log('\n  Variables used:');
        for (const [name, value] of Object.entries(result.variables)) {
          console.log(`    ${name}: ${value}`);
        }
      }

      console.log('\nNext steps:');
      console.log(`  1. Open ${result.workDirectory} in Xcode`);
      console.log(`  2. Build and run your app to validate the template`);
      console.log(`  3. To modify template: edit template/ (base) or work/ (layered)`);
      console.log(
        `  4. Regenerate test: magen-template template test ${templateName} --regenerate`
      );
      console.log(
        `  5. Auto-regenerate on changes: magen-template template test ${templateName} --watch`
      );
      console.log('');
    } catch (error) {
      console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Template layer subcommand
templateCmd
  .command('layer <name>')
  .description('Create layer patch from template')
  .option('--based-on <parent>', 'Parent template name (overrides template.json)')
  .option('--out <path>', 'Template directory')
  .action((templateName: string, options) => {
    const templateDirectory = options.out || join(process.cwd(), 'templates', templateName);

    try {
      console.log(`\nCreating layer patch for: ${templateName}`);
      console.log(`Template directory: ${templateDirectory}`);

      const result = createLayer({
        templateName,
        templateDirectory,
        parentTemplateName: options.basedOn,
      });

      console.log('✓ Layer patch created successfully!');
      console.log(`\n  Parent template: ${result.parentTemplate}`);
      console.log(`  Child template: ${result.childTemplate}`);
      console.log(`  Patch file: ${result.patchPath}`);

      console.log('\nNext steps:');
      console.log(`  1. Verify layer.patch in ${templateDirectory}`);
      console.log(`  2. Update template.json to include layer configuration`);
      console.log(`  3. Test generation: magen-template generate ${templateName} --out ~/test-app`);
      console.log('');
    } catch (error) {
      console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Template materialize subcommand
templateCmd
  .command('materialize <name>')
  .description('Materialize layer.patch to work/ directory')
  .option('--out <path>', 'Template directory')
  .option('--force', 'Overwrite existing work/ directory')
  .action((templateName: string, options) => {
    const templateDirectory = options.out || join(process.cwd(), 'templates', templateName);

    try {
      console.log(`\nMaterializing template: ${templateName}`);
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

      const templateJson: TemplateDescriptor = JSON.parse(readFileSync(templateJsonPath, 'utf-8'));

      // Check if this is a layered template
      if (!templateJson.basedOn) {
        throw new Error(
          `Template ${templateName} is not a layered template. ` +
            `Only layered templates (with basedOn) can be materialized to work/.`
        );
      }

      // Check if work/ already exists
      const workDir = join(templateDirectory, 'work');
      if (existsSync(workDir) && !options.force) {
        throw new Error(
          `work/ directory already exists at ${workDir}. ` +
            `Use --force to overwrite, or delete it manually first.`
        );
      }

      // Find the template to get variables
      const templateInfo = findTemplate(templateName);
      if (!templateInfo) {
        throw new Error(`Template not found: ${templateName}`);
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

      console.log('\nMaterializing with placeholder variables...');

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

        console.log('✓ Template materialized successfully!');
        console.log(`\n  Work directory: ${workDir}`);
        console.log(`  Based on: ${templateJson.basedOn}`);

        console.log('\nNext steps:');
        console.log(`  1. Edit files in ${workDir}`);
        console.log(`  2. Generate layer patch: magen-template template layer ${templateName}`);
        console.log(`  3. Test generation: magen-template template test ${templateName}`);
        console.log('');
      } finally {
        // Clean up temp directory
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    } catch (error) {
      console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Template validate subcommand
templateCmd
  .command('validate <name>')
  .description('Validate template structure')
  .action((_templateName: string) => {
    console.error(`Command not yet implemented: validate`);
    console.error('Currently available: create, test, layer, materialize');
    process.exit(1);
  });

// Parse arguments and show help if no command provided
if (process.argv.length === 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);
