#!/usr/bin/env node

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';
import { TemplateRegistry } from '../registry/TemplateRegistry.js';
import { TemplateGenerator } from '../generation/TemplateGenerator.js';

const program = new Command();

program
  .name('magen-templates')
  .description('AI-friendly mobile app template system')
  .version('0.1.0');

const registry = new TemplateRegistry();
const generator = new TemplateGenerator(registry);

// Helper function to collect variables in key=value format
function collectVariables(value: string, previous: Record<string, string>): Record<string, string> {
  const [key, ...valueParts] = value.split('=');
  if (!key || valueParts.length === 0) {
    throw new Error(`Invalid variable format: ${value}. Use --variable key=value`);
  }
  previous[key] = valueParts.join('='); // Rejoin in case value contained '='
  return previous;
}

// Helper function to apply default values for template variables
function applyDefaults(
  metadata: import('../types/index.js').TemplateMetadata,
  providedVariables: Record<string, unknown>
): Record<string, unknown> {
  const variables = { ...providedVariables };

  for (const variable of metadata.templateVariables) {
    // If variable not provided and has a default, use the default
    if (!(variable.name in variables) && variable.default !== undefined) {
      variables[variable.name] = variable.default;
    }
  }

  return variables;
}

// List command
program
  .command('list')
  .description('List all available templates')
  .option('-p, --platform <platform>', 'Filter by platform (ios, android, cross-platform)')
  .option('-j, --json', 'Output in JSON format')
  .action(async options => {
    await listTemplates(options);
  });

// Info command
program
  .command('info <template-id>')
  .description('Show detailed information about a template')
  .option('-j, --json', 'Output in JSON format')
  .action(async (templateId, options) => {
    await showTemplateInfo(templateId, options);
  });

// Generate command
program
  .command('generate')
  .description('Generate a project from a template')
  .requiredOption('-t, --template <id>', 'Template ID')
  .requiredOption('-o, --output <path>', 'Output directory path')
  .option('--overwrite', 'Overwrite existing output directory')
  .option(
    '-v, --variable <key=value...>',
    'Template variables (can be repeated)',
    collectVariables,
    {}
  )
  .action(async options => {
    await generateProject(options);
  });

// Validate-config command
program
  .command('validate-config')
  .description('Validate template variables and configuration before generating')
  .requiredOption('-t, --template <id>', 'Template ID')
  .requiredOption('-o, --output <path>', 'Output directory path')
  .option('--overwrite', 'Allow overwriting existing output directory')
  .option('-j, --json', 'Output in JSON format')
  .option(
    '-v, --variable <key=value...>',
    'Template variables (can be repeated)',
    collectVariables,
    {}
  )
  .action(async options => {
    await validateConfig(options);
  });

// Search command
program
  .command('search')
  .description('Search templates by platform or tag')
  .option('-p, --platform <platform>', 'Filter by platform')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('-j, --json', 'Output in JSON format')
  .action(async options => {
    await searchTemplates(options);
  });

async function listTemplates(options: { platform?: string; json?: boolean }) {
  const templates = options.platform
    ? await registry.searchByPlatform(options.platform as 'ios' | 'android' | 'cross-platform')
    : await registry.discoverTemplates();

  if (options.json) {
    console.log(JSON.stringify(templates, null, 2));
    return;
  }

  console.log(`Found ${templates.length} template(s):\n`);

  for (const template of templates) {
    console.log(`ID: ${template.id}`);
    console.log(`Name: ${template.displayName}`);
    console.log(`Platform: ${template.platform.type}`);
    console.log(`Description: ${template.description}`);
    console.log(`Tags: ${template.tags.join(', ')}`);
    console.log('');
    console.log(`For more details: magen-templates info ${template.id}`);
    console.log('');
  }
}

async function showTemplateInfo(templateId: string, options: { json?: boolean }) {
  const metadata = await registry.getMetadata(templateId);

  if (options.json) {
    console.log(JSON.stringify(metadata, null, 2));
    return;
  }

  console.log(`Template: ${metadata.displayName}`);
  console.log(`ID: ${metadata.id}`);
  console.log(`Version: ${metadata.version}`);
  console.log(`Platform: ${metadata.platform.type} (min: ${metadata.platform.minVersion})`);
  console.log(`\nDescription:`);
  console.log(`  ${metadata.description}`);
  console.log(`\nUse Case:`);
  console.log(`  ${metadata.useCase.primary}`);
  console.log(`  When: ${metadata.useCase.when}`);
  console.log(`\nCapabilities (${metadata.capabilities.length}):`);
  console.log(`  ${metadata.capabilities.join(', ')}`);

  if (metadata.templateVariables.length > 0) {
    console.log(`\nRequired Variables:`);
    for (const variable of metadata.templateVariables.filter(v => v.required)) {
      console.log(`  - ${variable.name}: ${variable.description}`);
      if (variable.example) {
        console.log(`    Example: ${variable.example}`);
      }
    }
  }

  if (metadata.extensionPoints && metadata.extensionPoints.length > 0) {
    console.log(`\nExtension Points (${metadata.extensionPoints.length}):`);
    for (const point of metadata.extensionPoints) {
      console.log(`  - ${point.name}`);
      console.log(`    ${point.description}`);
    }
  }

  // Show usage example
  console.log(`\nUsage Example:`);
  console.log(`  magen-templates generate \\`);
  console.log(`    --template ${metadata.id} \\`);
  console.log(`    --output ./MyProject \\`);
  for (const variable of metadata.templateVariables.filter(v => v.required)) {
    const exampleValue = variable.example || `<${variable.name}>`;
    console.log(`    --variable ${variable.name}="${exampleValue}" \\`);
  }
  console.log('');
}

async function generateProject(options: {
  template: string;
  output: string;
  overwrite?: boolean;
  variable: Record<string, string>;
}) {
  const metadata = await registry.getMetadata(options.template);

  console.log(`Generating project from template: ${metadata.displayName}`);
  console.log(`Output path: ${options.output}\n`);

  // Apply default values for variables not provided
  const variables = applyDefaults(metadata, options.variable);

  const result = await generator.generate({
    templateId: options.template,
    metadata,
    variables,
    outputPath: options.output,
    options: { overwrite: options.overwrite },
  });

  if (result.success) {
    console.log('✓ Project generated successfully!');
    console.log(`  Generated ${result.files.length} file(s)`);

    if (result.postGenerationInstructions && result.postGenerationInstructions.length > 0) {
      console.log('\nNext Steps:');
      result.postGenerationInstructions.forEach(instruction => {
        console.log(`  ${instruction}`);
      });
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(w => console.log(`  ⚠ ${w}`));
    }
  } else {
    console.error('✗ Generation failed\n');
    if (result.errors) {
      result.errors.forEach(e => {
        console.error(`  ✗ ${e.message}`);
      });
    }
    process.exit(1);
  }
}

async function searchTemplates(options: { platform?: string; tag?: string; json?: boolean }) {
  if (!options.platform && !options.tag) {
    console.error('Error: Specify --platform or --tag');
    process.exit(1);
  }

  const templates = options.platform
    ? await registry.searchByPlatform(options.platform as 'ios' | 'android' | 'cross-platform')
    : await registry.searchByTags([options.tag!]);

  if (options.json) {
    console.log(JSON.stringify(templates, null, 2));
    return;
  }

  console.log(`Found ${templates.length} matching template(s):\n`);

  for (const template of templates) {
    console.log(`- ${template.displayName} (${template.id})`);
    console.log(`  ${template.description}`);
    console.log(`  Platform: ${template.platform.type}`);
    console.log(`\n  Usage:`);
    console.log(`    magen-templates info ${template.id}`);
    console.log('');
  }
}

async function validateConfig(options: {
  template: string;
  output: string;
  overwrite?: boolean;
  json?: boolean;
  variable: Record<string, string>;
}) {
  const metadata = await registry.getMetadata(options.template);

  const validation = await generator.validateConfig({
    templateId: options.template,
    metadata,
    variables: options.variable,
    outputPath: options.output,
    options: { overwrite: options.overwrite },
  });

  if (options.json) {
    console.log(JSON.stringify(validation, null, 2));
    process.exit(validation.valid ? 0 : 1);
  }

  // Human-readable output
  if (validation.valid) {
    console.log('✓ Configuration is valid\n');
    console.log('Summary:');
    console.log(`  Template: ${metadata.displayName} (${options.template})`);
    console.log(`  Output: ${options.output}`);

    if (Object.keys(options.variable).length > 0) {
      console.log('  Variables:');
      for (const [key, value] of Object.entries(options.variable)) {
        console.log(`    - ${key}: ${value}`);
      }
    }

    console.log('\n✓ All required variables provided');
    console.log('✓ All variable formats valid');

    if (validation.warnings.length > 0) {
      console.log('\nWarnings:');
      validation.warnings.forEach((w: { message: string }) => {
        console.log(`  ⚠ ${w.message}`);
      });
    }

    console.log('\nReady to generate:');
    console.log(`  magen-templates generate \\`);
    console.log(`    --template ${options.template} \\`);
    console.log(`    --output ${options.output} \\`);
    for (const [key, value] of Object.entries(options.variable)) {
      console.log(`    --variable ${key}="${value}" \\`);
    }
  } else {
    console.log('✗ Configuration is invalid\n');

    if (validation.errors.length > 0) {
      console.log('Errors:');
      validation.errors.forEach((e: { type: string; message: string }) => {
        console.log(`  ✗ ${e.type}: ${e.message}`);
      });
    }

    if (validation.warnings.length > 0) {
      console.log('\nWarnings:');
      validation.warnings.forEach((w: { message: string }) => {
        console.log(`  ⚠ ${w.message}`);
      });
    }

    console.log('\nPlease fix these errors before generating.');
    console.log(`Run 'magen-templates info ${options.template}' to see required variables.`);
  }

  process.exit(validation.valid ? 0 : 1);
}

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
