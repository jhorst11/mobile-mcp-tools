/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import { findTemplate } from './discovery.js';
import type { TemplateVariable } from './schema.js';
import type { GenerateOptions } from './types.js';

/**
 * Validates that all required variables are provided and have correct types
 */
function validateVariables(
  templateVars: TemplateVariable[],
  providedVars: Record<string, string | number | boolean>
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  // Check required variables
  for (const varDef of templateVars) {
    if (varDef.required && !(varDef.name in providedVars)) {
      errors.push(`Required variable '${varDef.name}' is missing`);
      continue;
    }

    const value = providedVars[varDef.name];
    if (value === undefined) continue;

    // Type checking
    const actualType = typeof value;
    if (actualType !== varDef.type) {
      errors.push(
        `Variable '${varDef.name}' has wrong type: expected ${varDef.type}, got ${actualType}`
      );
    }

    // Regex validation
    if (varDef.regex && typeof value === 'string') {
      const regex = new RegExp(varDef.regex);
      if (!regex.test(value)) {
        errors.push(`Variable '${varDef.name}' does not match pattern: ${varDef.regex}`);
      }
    }

    // Enum validation
    if (varDef.enum && typeof value === 'string') {
      if (!varDef.enum.includes(value)) {
        errors.push(
          `Variable '${varDef.name}' must be one of: ${varDef.enum.join(', ')}. Got: ${value}`
        );
      }
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

/**
 * Merges provided variables with template defaults
 */
function mergeVariables(
  templateVars: TemplateVariable[],
  providedVars: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const merged: Record<string, string | number | boolean> = {};

  // Add defaults
  for (const varDef of templateVars) {
    if (varDef.default !== undefined) {
      merged[varDef.name] = varDef.default;
    }
  }

  // Override with provided values
  Object.assign(merged, providedVars);

  return merged;
}

/**
 * Renders a Handlebars template string with variables
 */
function renderTemplate(
  templateString: string,
  variables: Record<string, string | number | boolean>
): string {
  const template = Handlebars.compile(templateString);
  return template(variables);
}

/**
 * Renders a filename or directory name (handles Handlebars in filenames)
 */
function renderPath(
  pathSegment: string,
  variables: Record<string, string | number | boolean>
): string {
  return renderTemplate(pathSegment, variables);
}

/**
 * Recursively copies and renders template files
 */
function processTemplateDirectory(
  sourcePath: string,
  targetPath: string,
  variables: Record<string, string | number | boolean>,
  overwrite: boolean
): void {
  const entries = readdirSync(sourcePath);

  for (const entry of entries) {
    const sourceEntryPath = join(sourcePath, entry);
    const renderedEntryName = renderPath(entry, variables);
    const targetEntryPath = join(targetPath, renderedEntryName);

    const stats = statSync(sourceEntryPath);

    if (stats.isDirectory()) {
      // Create directory (with rendered name) and recurse
      mkdirSync(targetEntryPath, { recursive: true });
      processTemplateDirectory(sourceEntryPath, targetEntryPath, variables, overwrite);
    } else if (stats.isFile()) {
      // Check if file exists and overwrite is false
      if (existsSync(targetEntryPath) && !overwrite) {
        throw new Error(
          `File already exists: ${targetEntryPath}. Use --overwrite to replace existing files.`
        );
      }

      // Read file content
      const content = readFileSync(sourceEntryPath, 'utf-8');

      // Render content with Handlebars
      const renderedContent = renderTemplate(content, variables);

      // Write rendered content
      writeFileSync(targetEntryPath, renderedContent, 'utf-8');
    }
  }
}

/**
 * Generates an app from a template
 *
 * @param options - Generation options including template name, output directory, and variables
 * @throws Error if template not found, variables invalid, or generation fails
 */
export function generateApp(options: GenerateOptions): void {
  const { templateName, outputDirectory, variables: providedVars, overwrite = false } = options;

  // Find template
  const templateInfo = findTemplate(templateName);
  if (!templateInfo) {
    throw new Error(`Template not found: ${templateName}`);
  }

  const template = templateInfo.descriptor;

  // Merge variables with defaults
  const allVariables = mergeVariables(template.variables, providedVars);

  // Validate variables
  const validation = validateVariables(template.variables, allVariables);
  if (!validation.valid) {
    throw new Error(`Variable validation failed:\n  ${validation.errors.join('\n  ')}`);
  }

  // Check if output directory exists
  if (existsSync(outputDirectory) && !overwrite) {
    const entries = readdirSync(outputDirectory);
    if (entries.length > 0) {
      throw new Error(
        `Output directory is not empty: ${outputDirectory}. Use --overwrite to replace existing files.`
      );
    }
  }

  // Create output directory
  mkdirSync(outputDirectory, { recursive: true });

  // Get template directory
  const templateDir = join(templateInfo.templatePath, 'template');

  if (!existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  // Process template directory
  processTemplateDirectory(templateDir, outputDirectory, allVariables, overwrite);
}

/**
 * Exported for testing - validates variables against template definition
 */
export { validateVariables, mergeVariables, renderTemplate, renderPath };
