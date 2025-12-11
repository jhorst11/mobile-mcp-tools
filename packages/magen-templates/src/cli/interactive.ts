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

/**
 * Interactively gather template creation parameters
 */
export async function promptTemplateCreate(): Promise<{
  name: string;
  platform: string;
  version: string;
  basedOn?: string;
}> {
  const name = await input({
    message: 'Template name:',
    validate: (val: string) => {
      if (!val) {
        return 'Template name is required';
      }
      if (!/^[a-z0-9-]+$/.test(val)) {
        return 'Template name must contain only lowercase letters, numbers, and hyphens';
      }
      return true;
    },
  });

  const platform = await select({
    message: 'Platform:',
    choices: [
      { name: 'iOS', value: 'ios' },
      { name: 'Android', value: 'android' },
      { name: 'Web', value: 'web' },
    ],
    default: 'ios',
  });

  const version = await input({
    message: 'Version (semver):',
    default: '1.0.0',
    validate: (val: string) => {
      if (!/^\d+\.\d+\.\d+$/.test(val)) {
        return 'Version must be in semver format (e.g., 1.0.0)';
      }
      return true;
    },
  });

  const isLayered = await confirm({
    message: 'Create layered template (based on another template)?',
    default: false,
  });

  let basedOn: string | undefined;
  if (isLayered) {
    basedOn = await selectTemplate({
      platform,
      message: 'Select parent template:',
    });
  }

  return { name, platform, version, basedOn };
}

/**
 * Prompt for a template name
 */
export async function promptForTemplateName(defaultValue?: string): Promise<string> {
  return await input({
    message: 'Enter template name:',
    default: defaultValue,
    validate: (val: string) => {
      if (!val) {
        return 'Template name is required';
      }
      if (!/^[a-z0-9-]+$/.test(val)) {
        return 'Template name must be lowercase, alphanumeric, and can contain hyphens';
      }
      return true;
    },
  });
}

/**
 * Prompt for a platform
 */
export async function promptForPlatform(defaultValue?: string): Promise<string> {
  return await select({
    message: 'Select platform:',
    choices: [
      { name: 'iOS', value: 'ios' },
      { name: 'Android', value: 'android' },
      { name: 'Web', value: 'web' },
    ],
    default: defaultValue || 'ios',
  });
}

/**
 * Prompt for a template version
 */
export async function promptForTemplateVersion(
  messageOrDefaultValue?: string,
  defaultValue?: string
): Promise<string> {
  // Support both old signature (defaultValue only) and new signature (message, defaultValue)
  const isMessage = messageOrDefaultValue && messageOrDefaultValue.includes(':');
  const message = isMessage
    ? messageOrDefaultValue
    : 'Enter template version (semver, e.g., 1.0.0):';
  const defaultVal = isMessage ? defaultValue : messageOrDefaultValue;

  return await input({
    message,
    default: defaultVal || '1.0.0',
    validate: (val: string) => {
      if (!/^\d+\.\d+\.\d+$/.test(val)) {
        return 'Version must be semver format (e.g., 1.0.0)';
      }
      return true;
    },
  });
}

/**
 * Prompt for a parent template (for layered templates)
 */
export async function promptForBasedOnTemplate(): Promise<string> {
  return await selectTemplate({ message: 'Select parent template:' });
}
