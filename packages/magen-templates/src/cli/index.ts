#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { listTemplates, getTemplate } from '../core/discovery.js';
import { generateApp } from '../core/generator.js';

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
  template create <name> --from <base>  Create authoring instance
  template dev <name>                 Re-enter authoring mode
  template finalize <name>            Extract schema, rewrite, compute patch
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
      console.error(`Command not yet implemented: ${command}`);
      console.error('Run "magen-template --help" for usage information.');
      process.exit(1);
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
