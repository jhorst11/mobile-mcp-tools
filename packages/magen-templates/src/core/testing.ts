/**
 * Test instance management for Magen Template System.
 *
 * Handles:
 * - Creating test instances from templates
 * - Managing work directories
 * - Regenerating test instances
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { getTemplate } from './discovery.js';
import { generateApp } from './generator.js';
import { validateTemplateDescriptor, type TemplateDescriptor } from './schema.js';

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
  /** Force regeneration even if work directory exists */
  regenerate?: boolean;
}

/**
 * Result of testing a template
 */
export interface TestTemplateResult {
  /** Path to the work directory */
  workDirectory: string;
  /** Variables used for generation */
  variables: Record<string, string | number | boolean>;
  /** Path to template directory */
  templateDirectory: string;
  /** Whether the work directory was newly created (false if reused existing) */
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
  const descriptor = JSON.parse(content);

  // Validate the descriptor
  validateTemplateDescriptor(descriptor);

  return descriptor;
}

/**
 * Test a template by creating a concrete instance in the work directory.
 *
 * This generates a buildable app for validation purposes.
 * If work directory exists and regenerate=false, returns existing directory.
 * If regenerate=true, clears and regenerates the work directory.
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

  // Determine work directory
  const workDirectory = join(templateDirectory, 'work');

  // Check if work directory already exists
  const workDirExists = existsSync(workDirectory);
  let created = false;

  if (workDirExists) {
    const entries = readdirSync(workDirectory);
    const hasFiles = entries.length > 0;

    if (hasFiles && !regenerate) {
      // Return existing work directory
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
        workDirectory,
        variables: mergedVariables,
        templateDirectory,
        created: false,
      };
    }

    // Clear work directory for regeneration
    if (regenerate && hasFiles) {
      rmSync(workDirectory, { recursive: true, force: true });
      mkdirSync(workDirectory, { recursive: true });
      created = true;
    }
  } else {
    // Create work directory
    mkdirSync(workDirectory, { recursive: true });
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
    outputDirectory: workDirectory,
    variables: mergedVariables,
    overwrite: regenerate,
    templateDirectory,
  });

  return {
    workDirectory,
    variables: mergedVariables,
    templateDirectory,
    created,
  };
}

/**
 * Get the path to the work directory for a template
 */
export function getWorkDirectory(templateName: string, templateDirectory?: string): string {
  const templateDir = templateDirectory || join(process.cwd(), 'templates', templateName);
  return join(templateDir, 'work');
}

/**
 * Check if a test instance exists for a template
 */
export function hasTestInstance(templateName: string, templateDirectory?: string): boolean {
  const workDir = getWorkDirectory(templateName, templateDirectory);

  if (!existsSync(workDir)) {
    return false;
  }

  const entries = readdirSync(workDir);
  return entries.length > 0;
}
