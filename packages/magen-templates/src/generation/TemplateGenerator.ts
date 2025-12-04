/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import Handlebars from 'handlebars';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import type {
  GenerationContext,
  GenerationResult,
  GenerationPreview,
  ValidationResult,
  HookContext,
  HookResult,
} from '../types/index.js';
import { TemplateRegistry } from '../registry/TemplateRegistry.js';

export class TemplateGenerator {
  private registry: TemplateRegistry;

  constructor(registry?: TemplateRegistry) {
    this.registry = registry || new TemplateRegistry();
    this.registerHandlebarsHelpers();
  }

  /**
   * Generate a project from a template
   */
  async generate(context: GenerationContext): Promise<GenerationResult> {
    const errors: Error[] = [];
    const warnings: string[] = [];
    const files: string[] = [];

    try {
      // Validate configuration
      const validation = await this.validateConfig(context);
      if (!validation.valid) {
        return {
          success: false,
          outputPath: context.outputPath,
          files: [],
          errors: validation.errors.map(e => new Error(e.message)),
          warnings: validation.warnings.map(w => w.message),
        };
      }

      // Get template path
      const templatePath = await this.registry.getTemplatePath(context.templateId);
      const templateSourcePath = path.join(templatePath, 'template');

      // Create output directory (skip in dry run)
      if (!context.options?.dryRun) {
        await fs.ensureDir(context.outputPath);
      }

      // Execute pre-hook if present
      if (context.metadata.generation.preHook && !context.options?.skipHooks) {
        const hookResult = await this.executeHook(
          path.join(templatePath, context.metadata.generation.preHook),
          {
            templatePath,
            outputPath: context.outputPath,
            variables: context.variables,
            metadata: context.metadata,
          }
        );

        if (!hookResult.success && hookResult.error) {
          warnings.push(`Pre-hook warning: ${hookResult.error.message}`);
        }
      }

      // Process all files in the template
      const generatedFiles = await this.processTemplateFiles(
        templateSourcePath,
        context.outputPath,
        context.variables,
        context.metadata.generation.fileTransforms,
        context.options?.dryRun || false
      );

      files.push(...generatedFiles);

      // Apply file operations (renames, moves, deletes)
      if (context.metadata.generation.fileOperations) {
        await this.applyFileOperations(
          context.outputPath,
          context.metadata.generation.fileOperations,
          context.variables,
          context.options?.dryRun || false
        );
      }

      // Execute post-hook if present
      let postInstructions: string[] = [];
      if (context.metadata.generation.postHook && !context.options?.skipHooks) {
        const hookResult = await this.executeHook(
          path.join(templatePath, context.metadata.generation.postHook),
          {
            templatePath,
            outputPath: context.outputPath,
            variables: context.variables,
            metadata: context.metadata,
          }
        );

        if (hookResult.success && hookResult.instructions) {
          postInstructions = hookResult.instructions;
        } else if (hookResult.error) {
          warnings.push(`Post-hook warning: ${hookResult.error.message}`);
        }
      }

      return {
        success: true,
        outputPath: context.outputPath,
        files,
        warnings: warnings.length > 0 ? warnings : undefined,
        postGenerationInstructions: postInstructions.length > 0 ? postInstructions : undefined,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        outputPath: context.outputPath,
        files,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }
  }

  /**
   * Preview generation without writing files
   */
  async preview(context: GenerationContext): Promise<GenerationPreview> {
    const templatePath = await this.registry.getTemplatePath(context.templateId);
    const templateSourcePath = path.join(templatePath, 'template');

    const allFiles = await glob('**/*', {
      cwd: templateSourcePath,
      nodir: true,
      dot: true,
    });

    const files = allFiles.map(file => {
      const sourcePath = path.join(templateSourcePath, file);
      let destinationPath = path.join(context.outputPath, file);

      // Substitute variables in file path
      destinationPath = this.substituteVariables(destinationPath, context.variables);

      // Determine if this file will be processed (not just copied)
      // Files are only "processed" if they match a transform (currently only handlebars)
      const matchingTransform = context.metadata.generation.fileTransforms.find(transform =>
        this.matchesPattern(file, transform.pattern)
      );
      const willProcess = !!matchingTransform;

      // If processed, update extension
      if (willProcess && matchingTransform?.outputExtension) {
        const ext = path.extname(destinationPath);
        destinationPath =
          destinationPath.slice(0, -ext.length) + `.${matchingTransform.outputExtension}`;
      }

      return {
        source: sourcePath,
        destination: destinationPath,
        willProcess,
      };
    });

    return {
      files,
      variables: context.variables,
      operations: context.metadata.generation.fileOperations || [],
    };
  }

  /**
   * Validate generation configuration
   */
  async validateConfig(context: GenerationContext): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Check if template exists
    try {
      await this.registry.getTemplatePath(context.templateId);
    } catch {
      errors.push({
        type: 'template-not-found',
        message: `Template ${context.templateId} not found`,
      });
    }

    // Check required variables
    for (const variable of context.metadata.templateVariables) {
      if (variable.required && !(variable.name in context.variables)) {
        errors.push({
          type: 'missing-variable',
          message: `Required variable missing: ${variable.name}`,
          path: variable.name,
        });
      }
    }

    // Validate variable types and formats
    for (const variable of context.metadata.templateVariables) {
      if (variable.name in context.variables) {
        const value = context.variables[variable.name];

        // Type check
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== variable.type && variable.type !== 'object') {
          errors.push({
            type: 'invalid-variable-type',
            message: `Variable ${variable.name} expected type ${variable.type}, got ${actualType}`,
            path: variable.name,
          });
        }

        // Regex validation if provided
        if (variable.validation && typeof value === 'string') {
          const regex = new RegExp(variable.validation);
          if (!regex.test(value)) {
            errors.push({
              type: 'invalid-variable-format',
              message: `Variable ${variable.name} does not match required format: ${variable.validation}`,
              path: variable.name,
            });
          }
        }
      }
    }

    // Check output path
    if (await fs.pathExists(context.outputPath)) {
      if (!context.options?.overwrite) {
        errors.push({
          type: 'output-exists',
          message: `Output path already exists: ${context.outputPath}`,
          path: context.outputPath,
        });
      } else {
        warnings.push({
          type: 'overwrite-warning',
          message: `Output path will be overwritten: ${context.outputPath}`,
          path: context.outputPath,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Private helper methods

  private async processTemplateFiles(
    sourcePath: string,
    outputPath: string,
    variables: Record<string, unknown>,
    transforms: GenerationContext['metadata']['generation']['fileTransforms'],
    dryRun: boolean
  ): Promise<string[]> {
    const processedFiles: string[] = [];
    const allFiles = await glob('**/*', {
      cwd: sourcePath,
      nodir: true,
      dot: true,
    });

    for (const file of allFiles) {
      const sourceFile = path.join(sourcePath, file);
      let destinationFile = path.join(outputPath, file);

      // Substitute variables in path
      destinationFile = this.substituteVariables(destinationFile, variables);

      // Find matching transform - default behavior is to copy
      const transform = transforms.find(t => this.matchesPattern(file, t.pattern));

      if (transform) {
        // Process with specified processor (currently only handlebars)
        await this.processFile(sourceFile, destinationFile, variables, transform, dryRun);

        // Update destination with output extension if specified
        if (transform.outputExtension) {
          const ext = path.extname(destinationFile);
          destinationFile = destinationFile.slice(0, -ext.length) + `.${transform.outputExtension}`;
        }
      } else {
        // Default: Copy as-is
        if (!dryRun) {
          await fs.ensureDir(path.dirname(destinationFile));
          await fs.copy(sourceFile, destinationFile);
        }
      }

      processedFiles.push(path.relative(outputPath, destinationFile));
    }

    return processedFiles;
  }

  private async processFile(
    sourceFile: string,
    destinationFile: string,
    variables: Record<string, unknown>,
    transform: GenerationContext['metadata']['generation']['fileTransforms'][0],
    dryRun: boolean
  ): Promise<void> {
    // Currently only handlebars processor is supported
    if (transform.processor === 'handlebars') {
      const content = await fs.readFile(sourceFile, 'utf-8');
      const template = Handlebars.compile(content);
      const output = template(variables);

      if (!dryRun) {
        // Remove .hbs extension if present
        if (destinationFile.endsWith('.hbs')) {
          destinationFile = destinationFile.slice(0, -4);
        }
        await fs.ensureDir(path.dirname(destinationFile));
        await fs.writeFile(destinationFile, output, 'utf-8');
      }
    }
  }

  private async applyFileOperations(
    outputPath: string,
    operations: GenerationContext['metadata']['generation']['fileOperations'],
    variables: Record<string, unknown>,
    dryRun: boolean
  ): Promise<void> {
    if (!operations) return;

    for (const operation of operations) {
      const from = path.join(outputPath, this.substituteVariables(operation.from, variables));

      if (operation.action === 'rename' && operation.to) {
        const to = path.join(outputPath, this.substituteVariables(operation.to, variables));
        if (!dryRun && (await fs.pathExists(from))) {
          await fs.move(from, to);
        }
      } else if (operation.action === 'move' && operation.to) {
        const to = this.substituteVariables(operation.to, variables);
        if (!dryRun && (await fs.pathExists(from))) {
          await fs.move(from, to);
        }
      } else if (operation.action === 'delete') {
        if (!dryRun && (await fs.pathExists(from))) {
          await fs.remove(from);
        }
      }
    }
  }

  private async executeHook(hookPath: string, context: HookContext): Promise<HookResult> {
    try {
      if (!(await fs.pathExists(hookPath))) {
        return { success: true };
      }

      // Dynamic import of the hook module
      const hookModule = await import(hookPath);
      const hookFn = hookModule.default || hookModule;

      if (typeof hookFn === 'function') {
        const result = await hookFn(context);
        return result || { success: true };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  private substituteVariables(str: string, variables: Record<string, unknown>): string {
    let result = str;
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(pattern, String(value));
    }
    return result;
  }

  private matchesPattern(file: string, pattern: string): boolean {
    // Use minimatch for proper glob pattern matching including brace expansion
    return minimatch(file, pattern, { dot: true });
  }

  private registerHandlebarsHelpers(): void {
    // Register common helpers
    Handlebars.registerHelper('uppercase', (str: string) => str.toUpperCase());
    Handlebars.registerHelper('lowercase', (str: string) => str.toLowerCase());
    Handlebars.registerHelper(
      'capitalize',
      (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
    );

    // PascalCase helper
    Handlebars.registerHelper('pascalCase', (str: string) =>
      str
        .split(/[-_.\s]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
    );

    // camelCase helper
    Handlebars.registerHelper('camelCase', (str: string) => {
      const pascal = str
        .split(/[-_.\s]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
      return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    });
  }
}
