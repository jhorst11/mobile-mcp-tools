/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  existsSync,
  rmSync,
} from 'fs';
import { join, relative } from 'path';
import { tmpdir } from 'os';
import Handlebars from 'handlebars';
import { minimatch } from 'minimatch';
import { findTemplate } from './discovery.js';
import { materializeTemplate, detectCycle } from './layering.js';
import type { TemplateVariable, TemplateDescriptor, GenerationConfig } from './schema.js';
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
  try {
    // Compile with strict mode disabled to handle files with {} syntax
    const template = Handlebars.compile(templateString, {
      strict: false,
      noEscape: false,
    });
    return template(variables);
  } catch (error) {
    // If Handlebars fails to compile, return original string
    // This handles files like .pbxproj that have {} but no Handlebars variables
    console.warn(
      `Warning: Failed to compile template, using original content: ${error instanceof Error ? error.message : String(error)}`
    );
    return templateString;
  }
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
 * Determines the processor to use for a file based on generation configuration
 */
function getFileProcessor(
  filePath: string,
  sourceRoot: string,
  config?: GenerationConfig
): 'handlebars' | 'copy' | 'skip' {
  const filename = filePath.split('/').pop() || '';
  const relativePath = relative(sourceRoot, filePath);

  // Check file operations (deletions) first
  if (config?.fileOperations) {
    for (const operation of config.fileOperations) {
      if (operation.action === 'delete') {
        if (minimatch(filename, operation.from) || minimatch(relativePath, operation.from)) {
          return 'skip';
        }
      }
    }
  }

  // Check file transforms
  if (config?.fileTransforms) {
    for (const transform of config.fileTransforms) {
      if (minimatch(relativePath, transform.pattern) || minimatch(filename, transform.pattern)) {
        return transform.processor;
      }
    }
  }

  // Default: if no config or no matching transforms, process with handlebars
  return config?.fileTransforms ? 'copy' : 'handlebars';
}

/**
 * Recursively copies and renders template files
 */
function processTemplateDirectory(
  sourcePath: string,
  targetPath: string,
  variables: Record<string, string | number | boolean>,
  overwrite: boolean,
  generationConfig?: GenerationConfig,
  sourceRoot?: string
): void {
  const root = sourceRoot || sourcePath;
  const entries = readdirSync(sourcePath);

  for (const entry of entries) {
    const sourceEntryPath = join(sourcePath, entry);
    const renderedEntryName = renderPath(entry, variables);
    const targetEntryPath = join(targetPath, renderedEntryName);

    const stats = statSync(sourceEntryPath);

    if (stats.isDirectory()) {
      // Create directory (with rendered name) and recurse
      mkdirSync(targetEntryPath, { recursive: true });
      processTemplateDirectory(
        sourceEntryPath,
        targetEntryPath,
        variables,
        overwrite,
        generationConfig,
        root
      );
    } else if (stats.isFile()) {
      // Determine processor for this file
      const processor = getFileProcessor(sourceEntryPath, root, generationConfig);

      // Skip files marked for deletion
      if (processor === 'skip') {
        continue;
      }

      // Check if file exists and overwrite is false
      if (existsSync(targetEntryPath) && !overwrite) {
        throw new Error(
          `File already exists: ${targetEntryPath}. Use --overwrite to replace existing files.`
        );
      }

      // Read file content
      const content = readFileSync(sourceEntryPath, 'utf-8');

      // Process based on processor type
      let renderedContent: string;
      if (processor === 'handlebars') {
        renderedContent = renderTemplate(content, variables);
      } else {
        // processor === 'copy'
        renderedContent = content;
      }

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
  const {
    templateName,
    outputDirectory,
    variables: providedVars,
    overwrite = false,
    templateDirectory,
  } = options;

  // Find the template - use provided directory or global discovery
  let templateInfo: { templatePath: string; descriptor: TemplateDescriptor };

  if (templateDirectory) {
    // Load from custom directory
    const templateJsonPath = join(templateDirectory, 'template.json');
    if (!existsSync(templateJsonPath)) {
      throw new Error(`Template not found at ${templateDirectory}`);
    }
    const rawDescriptor = JSON.parse(readFileSync(templateJsonPath, 'utf-8'));

    // Normalize template descriptor (convert extends to basedOn for internal consistency)
    const metadataDescriptor = rawDescriptor.extends
      ? {
          ...rawDescriptor,
          basedOn: rawDescriptor.extends.version
            ? `${rawDescriptor.extends.template}@${rawDescriptor.extends.version}`
            : rawDescriptor.extends.template,
        }
      : rawDescriptor.basedOn
        ? {
            ...rawDescriptor,
            extends: {
              template: rawDescriptor.basedOn.split('@')[0],
              version: rawDescriptor.basedOn.includes('@')
                ? rawDescriptor.basedOn.split('@')[1]
                : '1.0.0',
              patchFile: rawDescriptor.layer?.patchFile || 'layer.patch',
            },
            basedOn: rawDescriptor.basedOn,
          }
        : rawDescriptor;

    // Also load variables.json if it exists
    // For layered templates, check work/ directory first
    // For base templates, check root directory
    let variablesPath = join(templateDirectory, 'work', 'variables.json');
    if (!existsSync(variablesPath)) {
      variablesPath = join(templateDirectory, 'variables.json');
    }

    let variables: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean';
      required: boolean;
      description?: string;
      default?: string | number | boolean;
      regex?: string;
      enum?: string[];
    }> = [];

    if (existsSync(variablesPath)) {
      const variablesData = JSON.parse(readFileSync(variablesPath, 'utf-8'));
      variables = variablesData.variables || [];
    }

    const descriptor = {
      ...metadataDescriptor,
      variables,
    };

    templateInfo = {
      templatePath: templateDirectory,
      descriptor,
    };
  } else {
    // Use global discovery
    const found = findTemplate(templateName);
    if (!found) {
      throw new Error(`Template not found: ${templateName}`);
    }
    templateInfo = found;
  }

  const template = templateInfo.descriptor;

  // Check for cycles in template chain
  if (template.basedOn && detectCycle(templateName)) {
    throw new Error(`Cycle detected in template chain for '${templateName}'`);
  }

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

  // Handle layered templates
  if (template.basedOn) {
    // Materialize template with all layers to a temp directory
    const tempDir = join(tmpdir(), `magen-gen-${Date.now()}`);

    try {
      mkdirSync(tempDir, { recursive: true });

      // Materialize the full template chain
      materializeTemplate({
        template,
        targetDirectory: tempDir,
        templateDirectory: templateInfo.templatePath,
      });

      // Reload variables from materialized template
      // The patch may have updated variables.json, so we need to re-read it
      const materializedVariablesPath = join(tempDir, 'variables.json');
      if (existsSync(materializedVariablesPath)) {
        const variablesData = JSON.parse(readFileSync(materializedVariablesPath, 'utf-8'));
        template.variables = variablesData.variables || [];

        // Re-merge and re-validate with updated variables
        const updatedAllVariables = mergeVariables(template.variables, providedVars);
        const updatedValidation = validateVariables(template.variables, updatedAllVariables);
        if (!updatedValidation.valid) {
          throw new Error(
            `Variable validation failed:\n  ${updatedValidation.errors.join('\n  ')}`
          );
        }

        // Use updated variables for rendering
        processTemplateDirectory(
          tempDir,
          outputDirectory,
          updatedAllVariables,
          overwrite,
          template.generation
        );
      } else {
        // No variables.json in materialized template, use original variables
        processTemplateDirectory(
          tempDir,
          outputDirectory,
          allVariables,
          overwrite,
          template.generation
        );
      }
    } finally {
      // Clean up temp directory
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  } else {
    // Flat template - process directly
    const templateDir = join(templateInfo.templatePath, 'template');

    if (!existsSync(templateDir)) {
      throw new Error(`Template directory not found: ${templateDir}`);
    }

    // Process template directory
    processTemplateDirectory(
      templateDir,
      outputDirectory,
      allVariables,
      overwrite,
      template.generation
    );
  }
}

/**
 * Exported for testing - validates variables against template definition
 */
export { validateVariables, mergeVariables, renderTemplate, renderPath };
