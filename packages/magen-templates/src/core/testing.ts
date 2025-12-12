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
import { watch } from 'chokidar';
import { getTemplate } from './discovery.js';
import { generateApp } from './generator.js';
import { createLayer } from './layering.js';
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
  /** Watch for changes and auto-regenerate */
  watch?: boolean;
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
  // For layered templates, check work/ directory first
  // For base templates, check root directory
  let variablesPath = join(templateDirectory, 'work', 'variables.json');
  if (!existsSync(variablesPath)) {
    variablesPath = join(templateDirectory, 'variables.json');
  }

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
  const { templateName, variables = {}, regenerate = false, watch: watchMode = false } = options;

  // If watch mode is enabled, start watching and return initial result
  if (watchMode) {
    const cleanup = watchTemplate(options);

    // Set up signal handlers to cleanup on exit
    const handleExit = () => {
      cleanup();
      process.exit(0);
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    // Keep process alive
    // The function will effectively never return in watch mode
    return new Promise(() => {}) as never;
  }

  // Determine template directory
  const templateDirectory =
    options.templateDirectory || join(process.cwd(), 'templates', templateName);

  // Load template - try from directory first, fall back to global discovery
  let template: TemplateDescriptor;
  try {
    template = loadTemplateDescriptor(templateDirectory);
  } catch {
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

      // Validate that all required variables are provided (even for existing test)
      const missingRequired: string[] = [];
      for (const varDef of template.variables) {
        if (varDef.required && mergedVariables[varDef.name] === undefined) {
          missingRequired.push(varDef.name);
        }
      }

      if (missingRequired.length > 0) {
        throw new Error(
          `Missing required variables: ${missingRequired.join(', ')}\n` +
            `Please provide them using:\n` +
            `  - Interactive mode: magen-template template test ${templateName} --interactive\n` +
            `  - Command line: magen-template template test ${templateName} --var ${missingRequired[0]}=<value>`
        );
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

  // Validate that all required variables are provided
  const missingRequired: string[] = [];
  for (const varDef of template.variables) {
    if (varDef.required && mergedVariables[varDef.name] === undefined) {
      missingRequired.push(varDef.name);
    }
  }

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required variables: ${missingRequired.join(', ')}\n` +
        `Please provide them using:\n` +
        `  - Interactive mode: magen-template template test ${templateName} --interactive\n` +
        `  - Command line: magen-template template test ${templateName} --var ${missingRequired[0]}=<value>`
    );
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

/**
 * Options for watching a template
 */
export interface WatchTemplateOptions extends TestTemplateOptions {
  /** Callback when test directory is regenerated */
  onChange?: (result: TestTemplateResult) => void;
}

/**
 * Watch a template's work directory and regenerate test directory on changes
 * Returns a cleanup function to stop watching
 */
export function watchTemplate(options: WatchTemplateOptions): () => void {
  const { templateName, onChange } = options;

  // Determine template directory
  const templateDirectory =
    options.templateDirectory || join(process.cwd(), 'templates', templateName);

  // Load template to determine if it's layered
  let template: TemplateDescriptor;
  try {
    template = loadTemplateDescriptor(templateDirectory);
  } catch {
    template = getTemplate(templateName);
  }

  // For layered templates, watch work/ directory
  // For base templates, watch template/ directory
  const watchDir = template.basedOn
    ? join(templateDirectory, 'work')
    : join(templateDirectory, 'template');

  if (!existsSync(watchDir)) {
    throw new Error(`Watch directory not found: ${watchDir}`);
  }

  console.log(`\n👀 Watching ${watchDir} for changes...`);
  console.log('Press Ctrl+C to stop watching\n');

  // Initial build
  const initialResult = testTemplate({
    ...options,
    regenerate: true,
  });

  console.log(`✓ Initial test instance created: ${initialResult.workDirectory}\n`);

  // Debounce regeneration to avoid multiple rebuilds
  let debounceTimer: NodeJS.Timeout | null = null;
  const debounceMs = 300;

  const handleChange = (path: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      const relativePath = path.replace(watchDir, '').replace(/^\//, '');
      console.log(`\n📝 Change detected: ${relativePath}`);

      // For layered templates, regenerate layer.patch from work/ directory
      if (template.basedOn) {
        console.log('🔄 Updating layer.patch...');
        try {
          createLayer({
            templateName,
            templateDirectory:
              options.templateDirectory || join(process.cwd(), 'templates', templateName),
            parentTemplateName: template.basedOn,
          });
          console.log('✓ layer.patch updated');
        } catch (error) {
          console.warn(
            `⚠ Warning: Could not update layer.patch: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      console.log('🔄 Regenerating test instance...');

      try {
        const result = testTemplate({
          ...options,
          regenerate: true,
        });

        console.log(`✓ Test instance regenerated: ${result.workDirectory}\n`);

        if (onChange) {
          onChange(result);
        }
      } catch (error) {
        console.error(`✗ Error regenerating test instance:`);
        console.error(error instanceof Error ? error.message : String(error));
        console.log(''); // Empty line for readability
      }
    }, debounceMs);
  };

  // Watch for changes
  const watcher = watch(watchDir, {
    ignored: /(^|[/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
  });

  watcher
    .on('add', handleChange)
    .on('change', handleChange)
    .on('unlink', handleChange)
    .on('error', error => console.error(`Watcher error: ${error}`));

  // Return cleanup function
  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    watcher.close();
    console.log('\n👋 Stopped watching\n');
  };
}
