/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { input, select, confirm } from '@inquirer/prompts';
import { searchTemplates, getTemplateInfo } from '../api/index.js';
import type { TemplateVariable } from '../core/schema.js';

/**
 * Interactively select a template
 */
export async function selectTemplate(options?: {
  platform?: string;
  message?: string;
}): Promise<string> {
  const searchResult = searchTemplates({ platform: options?.platform });

  if (searchResult.templates.length === 0) {
    throw new Error('No templates found');
  }

  const choices = searchResult.templates.map(t => ({
    name: `${t.name} - ${t.description || 'No description'}`,
    value: t.name,
    description: t.tags?.join(', ') || '',
  }));

  const templateName = await select({
    message: options?.message || 'Select a template:',
    choices,
    pageSize: 10,
  });

  return templateName;
}

/**
 * Interactively gather variables for a template
 */
export async function gatherVariables(
  templateName: string,
  providedVars: Record<string, string | number | boolean> = {}
): Promise<Record<string, string | number | boolean>> {
  const templateInfo = getTemplateInfo(templateName);
  if (!templateInfo) {
    throw new Error(`Template not found: ${templateName}`);
  }

  const variables: Record<string, string | number | boolean> = { ...providedVars };

  // First, prompt for required variables that aren't provided
  const requiredVars = templateInfo.descriptor.variables.filter(v => v.required);

  for (const variable of requiredVars) {
    if (variables[variable.name] !== undefined) {
      continue; // Already provided
    }

    const value = await promptForVariable(variable);
    if (value !== null) {
      variables[variable.name] = value;
    }
  }

  // Ask if they want to configure optional variables
  const optionalVars = templateInfo.descriptor.variables.filter(v => !v.required);

  if (optionalVars.length > 0) {
    const configureOptional = await confirm({
      message: 'Would you like to configure optional variables?',
      default: false,
    });

    if (configureOptional) {
      for (const variable of optionalVars) {
        if (variables[variable.name] !== undefined) {
          continue; // Already provided
        }

        const value = await promptForVariable(variable);
        if (value !== null) {
          variables[variable.name] = value;
        }
      }
    }
  }

  return variables;
}

/**
 * Prompt for a single variable
 */
async function promptForVariable(
  variable: TemplateVariable
): Promise<string | number | boolean | null> {
  const message = variable.description
    ? `${variable.name} (${variable.type}) - ${variable.description}:`
    : `${variable.name} (${variable.type}):`;

  const defaultValue = variable.default !== undefined ? String(variable.default) : undefined;

  // Handle different types
  if (variable.type === 'boolean') {
    return await confirm({
      message,
      default: variable.default === true,
    });
  }

  if (variable.enum && variable.enum.length > 0) {
    return await select({
      message,
      choices: variable.enum.map(v => ({ name: String(v), value: v })),
      default: defaultValue,
    });
  }

  // String or number input
  const value = await input({
    message,
    default: defaultValue,
    validate: (val: string) => {
      if (!val && variable.required) {
        return 'This field is required';
      }

      // Type validation
      if (val && variable.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          return 'Must be a valid number';
        }
      }

      // Regex validation
      if (val && variable.regex) {
        const regex = new RegExp(variable.regex);
        if (!regex.test(val)) {
          return `Must match pattern: ${variable.regex}`;
        }
      }

      return true;
    },
  });

  if (!value) {
    return null;
  }

  // Convert to appropriate type
  if (variable.type === 'number') {
    return Number(value);
  }

  return value;
}

/**
 * Interactively confirm an action
 */
export async function confirmAction(message: string, defaultValue = false): Promise<boolean> {
  return await confirm({
    message,
    default: defaultValue,
  });
}

/**
 * Prompt for output directory
 */
export async function promptOutputDirectory(defaultValue?: string): Promise<string> {
  return await input({
    message: 'Output directory:',
    default: defaultValue || './output',
    validate: (val: string) => {
      if (!val) {
        return 'Output directory is required';
      }
      return true;
    },
  });
}
