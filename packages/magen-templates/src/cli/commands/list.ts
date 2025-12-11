/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Command } from 'commander';
import { listTemplates } from '../../core/discovery.js';
import type { TemplateDescriptor } from '../../core/schema.js';

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
    // basedOn might include @version, strip it to find the template
    const baseName = current.basedOn.split('@')[0];
    current = templateMap.get(baseName);

    // If we found the parent template but basedOn didn't include version,
    // add the version to the chain for consistency
    if (current && !chain[chain.length - 1].includes('@')) {
      chain[chain.length - 1] = `${baseName}@${current.version}`;
    }
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

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List available templates')
    .option('--platform <platform>', 'Filter by platform (ios, android, web)')
    .option('--tag <tags...>', 'Filter by tag(s) - can specify multiple times or comma-separated')
    .action(options => {
      const allTemplates = listTemplates({ platform: options.platform });
      let templates = allTemplates;

      // Filter by tags if specified
      if (options.tag && options.tag.length > 0) {
        // Parse tags - support both comma-separated and multiple --tag flags
        const filterTags: string[] = [];
        for (const tagArg of options.tag) {
          // Split by comma and trim whitespace
          const tags = tagArg.split(',').map((t: string) => t.trim());
          filterTags.push(...tags);
        }

        // Filter templates that have ALL specified tags (AND logic)
        templates = templates.filter(template => {
          if (!template.tags || template.tags.length === 0) {
            return false;
          }
          return filterTags.every(filterTag => template.tags!.includes(filterTag));
        });
      }

      if (templates.length === 0) {
        console.log('No templates found.');
        return;
      }

      console.log('\nAvailable Templates:\n');

      for (const template of templates) {
        const tags = template.tags?.length ? ` [${template.tags.join(', ')}]` : '';
        console.log(
          `  ${colors.cyan}${template.name}${colors.reset} (${template.platform})${tags}`
        );

        if (template.description) {
          console.log(`    ${template.description}`);
        }

        // Show inheritance tree (use all templates to build complete chain)
        const chain = buildInheritanceChain(template.name, allTemplates);
        const tree = formatInheritanceTree(chain);
        if (tree) {
          console.log(tree);
        }

        console.log('');
      }
    });
}
