/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import chalk from 'chalk';
import type { TemplateInfo, TemplateVariable } from '../api/index.js';

/**
 * Format template info for display
 */
export function formatTemplateInfo(info: TemplateInfo): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.cyan(`📱 ${info.descriptor.name}@${info.descriptor.version}`));
  lines.push(chalk.gray(`Platform: ${info.descriptor.platform}`));

  // Tags
  if (info.descriptor.tags && info.descriptor.tags.length > 0) {
    lines.push(chalk.gray(`Tags: ${info.descriptor.tags.join(', ')}`));
  }

  lines.push('');

  // Description
  if (info.descriptor.description) {
    lines.push(chalk.bold('Description:'));
    lines.push(`  ${info.descriptor.description}`);
    lines.push('');
  }

  // Inheritance chain
  if (info.inheritanceChain.length > 1) {
    lines.push(chalk.bold('Inheritance Chain:'));
    info.inheritanceChain.forEach((template, index) => {
      const indent = '  ' + '  '.repeat(index);
      const prefix = index === 0 ? '' : chalk.gray('└─ ');
      lines.push(`${indent}${prefix}${chalk.cyan(template)}`);
    });
    lines.push('');
  }

  // Variables
  if (info.descriptor.variables.length > 0) {
    const requiredVars = info.descriptor.variables.filter(v => v.required);
    const optionalVars = info.descriptor.variables.filter(v => !v.required);

    if (requiredVars.length > 0) {
      lines.push(chalk.bold('Required Variables:'));
      requiredVars.forEach(v => {
        lines.push(formatVariable(v, true));
      });
      lines.push('');
    }

    if (optionalVars.length > 0) {
      lines.push(chalk.bold('Optional Variables:'));
      optionalVars.forEach(v => {
        lines.push(formatVariable(v, false));
      });
      lines.push('');
    }
  }

  // Example usage
  lines.push(chalk.bold('Example Usage:'));

  // Always show all required variables
  // Variables without defaults come first, then ones with defaults
  const requiredVarsWithoutDefaults = info.descriptor.variables.filter(
    v => v.required && v.default === undefined
  );
  const requiredVarsWithDefaults = info.descriptor.variables.filter(
    v => v.required && v.default !== undefined
  );

  // Combine: vars without defaults first, then vars with defaults (limit to 3)
  const varsToShow = [...requiredVarsWithoutDefaults, ...requiredVarsWithDefaults.slice(0, 3)];

  const exampleVars = varsToShow
    .map(v => {
      const exampleValue =
        v.default !== undefined
          ? v.default
          : v.type === 'boolean'
            ? 'true'
            : v.type === 'number'
              ? '123'
              : `"<${v.name}>"`;
      return `--var ${v.name}=${exampleValue}`;
    })
    .join(' \\\n    ');

  lines.push(chalk.gray(`  magen-template generate ${info.descriptor.name} --out ~/MyApp \\`));
  if (exampleVars) {
    lines.push(chalk.gray(`    ${exampleVars}`));
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format a single variable
 */
function formatVariable(v: TemplateVariable, isRequired: boolean): string {
  const bullet = isRequired ? chalk.red('  •') : chalk.gray('  ○');
  const name = chalk.cyan(v.name);
  const type = chalk.gray(`(${v.type})`);
  const desc = v.description || '';
  const defaultVal = v.default !== undefined ? chalk.gray(` - default: ${v.default}`) : '';

  return `${bullet} ${name} ${type}: ${desc}${defaultVal}`;
}

/**
 * Format error with suggestions
 */
export function formatErrorWithSuggestions(message: string, suggestions?: string[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.red.bold('❌ Error: ') + message);
  lines.push('');

  if (suggestions && suggestions.length > 0) {
    lines.push(chalk.yellow('💡 Did you mean one of these?'));
    suggestions.forEach(s => {
      lines.push(chalk.yellow(`   • ${s}`));
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format success message
 */
export function formatSuccess(message: string): string {
  return chalk.green.bold('✓ ') + message;
}

/**
 * Format warning message
 */
export function formatWarning(message: string): string {
  return chalk.yellow.bold('⚠ ') + message;
}

/**
 * Format info message
 */
export function formatInfo(message: string): string {
  return chalk.blue.bold('ℹ ') + message;
}
