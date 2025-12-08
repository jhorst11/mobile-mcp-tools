/**
 * Test instance management for Magen Template System.
 *
 * Handles:
 * - Creating test instances from templates
 * - Managing test directories (resolved/concrete apps)
 * - Regenerating test instances
 *
 * Note: Test instances go in test/ directory (not work/)
 * - work/ = templated files for creating diffs
 * - test/ = resolved files for validation
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { getTemplate } from './discovery.js';
import { generateApp } from './generator.js';
import {
  validateTemplateDescriptor,
  safeValidateTemplateVariables,
  type TemplateDescriptor,
  type TemplateVariable,
} from './schema.js';

/**
 * Options for testing a template
 */
export interface TestTemplateOptions {
  /** Template name to test */
  templateName: string;
  /** Path to template directory (defaults to templates/<templateName>) */
  templateDirectory?: string;
  /** Override default variables */
  variables?: Record<string, string | number | boolean>;
  /** Force regeneration even if test directory exists */
  regenerate?: boolean;
}

/**
 * Result of testing a template
 */
export interface TestTemplateResult {
  /** Path to the test directory (resolved app) */
  workDirectory: string; // Keep name for backwards compatibility, but it's actually test/
  /** Variables used for generation */
  variables: Record<string, string | number | boolean>;
  /** Path to template directory */
  templateDirectory: string;
  /** Whether the test directory was newly created (false if reused existing) */
  created: boolean;
}

/**
 * Load template descriptor from directory
 */
function loadTemplateDescriptor(templateDirectory: string): TemplateDescriptor {
  const templateJsonPath = join(templateDirectory, 'template.json');

  if (!existsSync(templateJsonPath)) {
    throw new Error(`Template descriptor not found at ${templateJsonPath}`);
  }

  const content = readFileSync(templateJsonPath, 'utf-8');
  const metadataDescriptor = JSON.parse(content);

  // Validate the metadata
  validateTemplateDescriptor(metadataDescriptor);

  // Load variables.json (if present)
  const variablesPath = join(templateDirectory, 'variables.json');
  let variables: TemplateVariable[] = [];

  if (existsSync(variablesPath)) {
    const variablesContent = readFileSync(variablesPath, 'utf-8');
    const variablesData = JSON.parse(variablesContent);
    const variablesResult = safeValidateTemplateVariables(variablesData);

    if (!variablesResult.success) {
      throw new Error(
        `Invalid variables.json at ${variablesPath}:\n  ${variablesResult.errors.join('\n  ')}`
      );
    }
    variables = variablesResult.data.variables;
  }

  // Combine metadata and variables
  const descriptor: TemplateDescriptor = {
    ...metadataDescriptor,
    variables,
  };

  return descriptor;
}

/**
 * Test a template by creating a concrete instance in the test directory.
 *
 * This generates a buildable app for validation purposes in test/.
 * If test directory exists and regenerate=false, returns existing directory.
 * If regenerate=true, clears and regenerates the test directory.
 *
 * Note: test/ contains resolved files, work/ contains templated files for diffs
 */
export function testTemplate(options: TestTemplateOptions): TestTemplateResult {
  const { templateName, variables = {}, regenerate = false } = options;

  // Determine template directory
  const templateDirectory =
    options.templateDirectory || join(process.cwd(), 'templates', templateName);

  // Load template - try from directory first, fall back to global discovery
  let template: TemplateDescriptor;
  try {
    template = loadTemplateDescriptor(templateDirectory);
  } catch (_e) {
    // Fall back to global discovery if template directory doesn't have template.json
    template = getTemplate(templateName);
  }

  // Determine test directory
  const testDirectory = join(templateDirectory, 'test');

  // Check if test directory already exists
  const testDirExists = existsSync(testDirectory);
  let created = false;

  if (testDirExists) {
    const entries = readdirSync(testDirectory);
    const hasFiles = entries.length > 0;

    if (hasFiles && !regenerate) {
      // Return existing test directory
      const mergedVariables: Record<string, string | number | boolean> = {};
      for (const varDef of template.variables) {
        if (varDef.default !== undefined) {
          mergedVariables[varDef.name] = varDef.default;
        }
      }
      for (const [key, value] of Object.entries(variables)) {
        mergedVariables[key] = value;
      }

      return {
        workDirectory: testDirectory,
        variables: mergedVariables,
        templateDirectory,
        created: false,
      };
    }

    // Clear test directory for regeneration
    if (regenerate && hasFiles) {
      rmSync(testDirectory, { recursive: true, force: true });
      mkdirSync(testDirectory, { recursive: true });
      created = true;
    }
  } else {
    // Create test directory
    mkdirSync(testDirectory, { recursive: true });
    created = true;
  }

  // Merge variables with defaults
  const mergedVariables: Record<string, string | number | boolean> = {};

  for (const varDef of template.variables) {
    if (varDef.default !== undefined) {
      mergedVariables[varDef.name] = varDef.default;
    }
  }

  // Override with provided variables
  for (const [key, value] of Object.entries(variables)) {
    mergedVariables[key] = value;
  }

  // Generate the test instance
  generateApp({
    templateName,
    outputDirectory: testDirectory,
    variables: mergedVariables,
    overwrite: regenerate,
    templateDirectory,
  });

  return {
    workDirectory: testDirectory,
    variables: mergedVariables,
    templateDirectory,
    created,
  };
}

/**
 * Get the test directory path for a template
 */
export function getTestDirectory(templateDirectory: string): string {
  return join(templateDirectory, 'test');
}

/**
 * @deprecated Use getTestDirectory instead
 */
export function getWorkDirectory(templateDirectory: string): string {
  return getTestDirectory(templateDirectory);
}

/**
 * Check if a test instance exists for a template
 */
export function hasTestInstance(templateDirectory: string): boolean {
  const testDirectory = getTestDirectory(templateDirectory);
  if (!existsSync(testDirectory)) {
    return false;
  }
  const entries = readdirSync(testDirectory);
  return entries.length > 0;
}
