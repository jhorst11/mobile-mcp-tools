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
import { listTemplates, getTemplate, findTemplate } from '../core/discovery.js';
import { generateApp } from '../core/generator.js';
import { testTemplate, watchTemplate } from '../core/testing.js';
import { createLayer, materializeTemplate } from '../core/layering.js';
import type { TemplateVariable } from '../core/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  const packageJsonPath = join(__dirname, '../../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
}

function showHelp(): void {
  console.log(`
magen-template - Layered, platform-agnostic app templating engine

Usage:
  magen-template <command> [options]

Commands:
  list                                List available templates
  show <name>                         Show template metadata and schema
  generate <template>                 Generate a concrete app from template
  template create <name>              Create new template (optionally layered)
  template test <name>                Generate/validate test instance
  template layer <name>               Create layer patch from template
  template validate <name>            Validate template structure

Options:
  --help                              Show this help message
  --version                           Show version number

Examples:
  magen-template list
  magen-template show ios-base
  magen-template generate ios-salesforce --out ./my-app

For more information, visit: https://github.com/forcedotcom/mobile-mcp-tools
`);
}

function showVersion(): void {
  console.log(`magen-template v${getVersion()}`);
}

function commandList(args: string[]): void {
  const platform = args.includes('--platform') ? args[args.indexOf('--platform') + 1] : undefined;

  const templates = listTemplates({ platform });

  if (templates.length === 0) {
    console.log('No templates found.');
    return;
  }

  console.log('\nAvailable Templates:\n');

  for (const template of templates) {
    const tags = template.tags?.length ? ` [${template.tags.join(', ')}]` : '';
    console.log(`  ${template.name} (${template.platform})${tags}`);
    if (template.description) {
      console.log(`    ${template.description}`);
    }
    if (template.basedOn) {
      console.log(`    Based on: ${template.basedOn}`);
    }
    console.log('');
  }
}

function commandShow(args: string[]): void {
  const templateName = args[0];

  if (!templateName) {
    console.error('Error: Template name is required.');
    console.error('Usage: magen-template show <name>');
    process.exit(1);
  }

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
}

function parseVariables(args: string[]): Record<string, string | number | boolean> {
  const variables: Record<string, string | number | boolean> = {};
  let i = 0;

  while (i < args.length) {
    if (args[i] === '--var' && i + 1 < args.length) {
      const varArg = args[i + 1];
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

      i += 2;
    } else {
      i++;
    }
  }

  return variables;
}

function commandGenerate(args: string[]): void {
  if (args.length === 0) {
    console.error('Error: Template name is required.');
    console.error('Usage: magen-template generate <template> --out <directory> [--var name=value]');
    process.exit(1);
  }

  const templateName = args[0];
  const outIndex = args.indexOf('--out');
  const overwrite = args.includes('--overwrite');

  if (outIndex === -1 || outIndex + 1 >= args.length) {
    console.error('Error: Output directory is required.');
    console.error('Usage: magen-template generate <template> --out <directory> [--var name=value]');
    process.exit(1);
  }

  const outputDirectory = args[outIndex + 1];
  const variables = parseVariables(args);

  try {
    console.log(`Generating ${templateName} to ${outputDirectory}...`);

    generateApp({
      templateName,
      outputDirectory,
      variables,
      overwrite,
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
}

function commandTemplate(args: string[]): void {
  if (args.length === 0) {
    console.error('Error: Subcommand is required.');
    console.error('Usage: magen-template template <subcommand> [options]');
    console.error('Subcommands: create, test, layer, validate');
    process.exit(1);
  }

  const subcommand = args[0];
  const subcommandArgs = args.slice(1);

  switch (subcommand) {
    case 'create':
      commandTemplateCreate(subcommandArgs);
      break;

    case 'test':
      commandTemplateTest(subcommandArgs);
      break;

    case 'layer':
      commandTemplateLayer(subcommandArgs);
      break;

    case 'validate':
      console.error(`Subcommand not yet implemented: ${subcommand}`);
      console.error('Currently available: create, test, layer');
      process.exit(1);
      break;

    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error('Available subcommands: create, test, layer, validate');
      process.exit(1);
  }
}

function commandTemplateCreate(args: string[]): void {
  const templateName = args[0];

  if (!templateName) {
    console.error('Error: Template name is required.');
    console.error('Usage: magen-template template create <name> [options]');
    console.error('Options:');
    console.error('  --based-on <parent>   Parent template name (for layered templates)');
    console.error('  --platform <platform> Platform: ios, android, web (default: ios)');
    console.error('  --out <path>          Template directory (default: ./templates/<name>)');
    process.exit(1);
  }

  // Parse options
  const basedOnIndex = args.indexOf('--based-on');
  const basedOn =
    basedOnIndex !== -1 && basedOnIndex + 1 < args.length ? args[basedOnIndex + 1] : undefined;

  const platformIndex = args.indexOf('--platform');
  const platform =
    platformIndex !== -1 && platformIndex + 1 < args.length ? args[platformIndex + 1] : 'ios';

  const outIndex = args.indexOf('--out');
  const templateDirectory =
    outIndex !== -1 && outIndex + 1 < args.length
      ? args[outIndex + 1]
      : join(process.cwd(), 'templates', templateName);

  try {
    console.log(`\nCreating template: ${templateName}`);
    console.log(`Platform: ${platform}`);
    if (basedOn) {
      console.log(`Based on: ${basedOn}`);
    }
    console.log(`Template directory: ${templateDirectory}\n`);

    // Check if template directory already exists
    if (existsSync(templateDirectory)) {
      const entries = readdirSync(templateDirectory);
      if (entries.length > 0) {
        throw new Error(`Template directory already exists and is not empty: ${templateDirectory}`);
      }
    }

    // Load parent template if specified
    let parentVariables: TemplateVariable[] = [];

    if (basedOn) {
      try {
        const parentTemplateInfo = findTemplate(basedOn);
        if (!parentTemplateInfo) {
          throw new Error(`Parent template not found: ${basedOn}`);
        }

        parentVariables = parentTemplateInfo.descriptor.variables;
        console.log(`✓ Found parent template: ${basedOn}`);

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
        console.warn(`⚠ Warning: Could not load parent template ${basedOn}`);
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
      platform: platform,
      version: '1.0.0',
      description: `${templateName} template${basedOn ? ` based on ${basedOn}` : ''}`,
      tags: [],
    };

    // Add layer configuration if based on another template
    if (basedOn) {
      templateJson.basedOn = basedOn;
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
    if (!basedOn) {
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
  basedOn
    ? `## Development

This template is based on \`${basedOn}\`. To modify:

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
    if (basedOn) {
      writeFileSync(join(templateDirectory, 'layer.patch'), '', 'utf-8');
      console.log(
        `  layer.patch: Created (empty - will be generated when you run 'template layer')`
      );
    }

    console.log('✓ Template created successfully!');
    console.log(`\n  Template directory: ${templateDirectory}`);
    console.log(`  template.json: Created`);
    if (!basedOn) {
      console.log(`  variables.json: Created with ${variablesJson.variables.length} variables`);
    } else {
      console.log(
        `  work/variables.json: Inherited ${variablesJson.variables.length} variables from parent`
      );
    }
    console.log(`  README.md: Created`);

    console.log('\nNext steps:');
    if (basedOn) {
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
}

function commandTemplateTest(args: string[]): void {
  const templateName = args[0];

  if (!templateName) {
    console.error('Error: Template name is required.');
    console.error('Usage: magen-template template test <name> [options]');
    console.error('Options:');
    console.error('  --regenerate          Force regeneration even if test directory exists');
    console.error('  --watch               Watch for changes and auto-regenerate');
    console.error('  --out <path>          Template directory (default: ./templates/<name>)');
    console.error('  --var <name>=<value>  Override template variable');
    process.exit(1);
  }

  // Parse options
  const regenerate = args.includes('--regenerate');
  const watchMode = args.includes('--watch');
  const outIndex = args.indexOf('--out');
  const templateDirectory =
    outIndex !== -1 && outIndex + 1 < args.length
      ? args[outIndex + 1]
      : join(process.cwd(), 'templates', templateName);

  const variables = parseVariables(args);

  try {
    // Watch mode
    if (watchMode) {
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
    if (regenerate) {
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
      regenerate,
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
    console.log(`  4. Regenerate test: magen-template template test ${templateName} --regenerate`);
    console.log(
      `  5. Auto-regenerate on changes: magen-template template test ${templateName} --watch`
    );
    console.log('');
  } catch (error) {
    console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function commandTemplateLayer(args: string[]): void {
  const templateName = args[0];

  if (!templateName) {
    console.error('Error: Template name is required.');
    console.error('Usage: magen-template template layer <name> [options]');
    console.error('Options:');
    console.error('  --based-on <parent>   Parent template name (overrides template.json)');
    console.error('  --out <path>          Template directory (default: ./templates/<name>)');
    process.exit(1);
  }

  // Parse options
  const basedOnIndex = args.indexOf('--based-on');
  const parentTemplateName =
    basedOnIndex !== -1 && basedOnIndex + 1 < args.length ? args[basedOnIndex + 1] : undefined;

  const outIndex = args.indexOf('--out');
  const templateDirectory =
    outIndex !== -1 && outIndex + 1 < args.length
      ? args[outIndex + 1]
      : join(process.cwd(), 'templates', templateName);

  try {
    console.log(`\nCreating layer patch for: ${templateName}`);
    console.log(`Template directory: ${templateDirectory}`);

    const result = createLayer({
      templateName,
      templateDirectory,
      parentTemplateName,
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
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  switch (command) {
    case 'list':
      commandList(commandArgs);
      break;

    case 'show':
      commandShow(commandArgs);
      break;

    case 'generate':
      commandGenerate(commandArgs);
      break;

    case 'template':
      commandTemplate(commandArgs);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "magen-template --help" for usage information.');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
