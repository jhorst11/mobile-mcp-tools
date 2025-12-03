/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import Handlebars from 'handlebars';
import type { ValidationResult, TemplateMetadata } from '../types/index.js';
import { TemplateMetadataSchema } from '../types/schemas.js';

export class TemplateValidator {
  /**
   * Validate a template directory
   */
  async validate(templatePath: string): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];
    const suggestions: string[] = [];

    // 1. Check if template directory exists
    if (!(await fs.pathExists(templatePath))) {
      return {
        valid: false,
        errors: [
          {
            type: 'directory-not-found',
            message: `Template directory not found: ${templatePath}`,
            path: templatePath,
          },
        ],
        warnings: [],
      };
    }

    // 2. Check for template.json
    const metadataPath = path.join(templatePath, 'template.json');
    if (!(await fs.pathExists(metadataPath))) {
      errors.push({
        type: 'metadata-missing',
        message: 'template.json file is required',
        path: metadataPath,
      });
      return { valid: false, errors, warnings };
    }

    // 3. Validate metadata schema
    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);

      const result = TemplateMetadataSchema.safeParse(metadata);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            type: 'schema-validation',
            message: issue.message,
            path: issue.path.join('.'),
            details: issue,
          });
        }
      } else {
        // Metadata is valid, perform additional checks
        await this.validateTemplateStructure(
          templatePath,
          result.data,
          errors,
          warnings,
          suggestions
        );
      }
    } catch (error) {
      errors.push({
        type: 'metadata-parse-error',
        message: error instanceof Error ? error.message : 'Failed to parse template.json',
        path: metadataPath,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Validate template structure and consistency
   */
  private async validateTemplateStructure(
    templatePath: string,
    metadata: unknown,
    errors: ValidationResult['errors'],
    warnings: ValidationResult['warnings'],
    suggestions: string[]
  ): Promise<void> {
    const meta = metadata as TemplateMetadata; // Type assertion after schema validation

    // Check for template directory
    const templateDir = path.join(templatePath, 'template');
    if (!(await fs.pathExists(templateDir))) {
      errors.push({
        type: 'template-directory-missing',
        message: 'template/ directory is required',
        path: templateDir,
      });
      return;
    }

    // Check file transforms
    for (const transform of meta.generation.fileTransforms) {
      // Validate that pattern matches actual files
      const pattern = transform.pattern.replace(/\*\*/g, '**/*');
      try {
        const { glob } = await import('glob');
        const files = await glob(pattern, { cwd: templateDir });
        if (files.length === 0) {
          warnings.push({
            type: 'unused-transform',
            message: `File transform pattern "${transform.pattern}" doesn't match any files`,
            path: `generation.fileTransforms`,
          });
        }

        // Validate Handlebars templates
        if (transform.processor === 'handlebars') {
          for (const file of files) {
            await this.validateHandlebarsTemplate(
              path.join(templateDir, file),
              meta.templateVariables,
              errors,
              warnings
            );
          }
        }
      } catch {
        errors.push({
          type: 'glob-pattern-error',
          message: `Invalid glob pattern: ${transform.pattern}`,
          path: 'generation.fileTransforms',
        });
      }
    }

    // Check hooks if specified
    if (meta.generation.preHook) {
      const hookPath = path.join(templatePath, meta.generation.preHook);
      if (!(await fs.pathExists(hookPath))) {
        errors.push({
          type: 'hook-not-found',
          message: `Pre-hook script not found: ${meta.generation.preHook}`,
          path: hookPath,
        });
      } else {
        await this.validateHookScript(hookPath, errors, warnings);
      }
    }

    if (meta.generation.postHook) {
      const hookPath = path.join(templatePath, meta.generation.postHook);
      if (!(await fs.pathExists(hookPath))) {
        errors.push({
          type: 'hook-not-found',
          message: `Post-hook script not found: ${meta.generation.postHook}`,
          path: hookPath,
        });
      } else {
        await this.validateHookScript(hookPath, errors, warnings);
      }
    }

    // Check extension points reference valid files
    if (meta.extensionPoints) {
      for (const point of meta.extensionPoints) {
        if (point.affectedFiles) {
          for (const file of point.affectedFiles) {
            const filePath = path.join(templateDir, 'template', file);
            // Remove template variable syntax for checking
            const cleanPath = filePath.replace(/\{\{[^}]+\}\}/g, '*');
            const exists = await fs.pathExists(cleanPath.replace('*', 'template'));
            if (!exists) {
              warnings.push({
                type: 'affected-file-not-found',
                message: `Extension point "${point.id}" references non-existent file: ${file}`,
                path: `extensionPoints.${point.id}`,
              });
            }
          }
        }
      }
    }

    // Check documentation files
    if (meta.documentation) {
      const docFiles = [
        meta.documentation.readme,
        meta.documentation.architecture,
        meta.documentation.gettingStarted,
      ].filter((f): f is string => Boolean(f));

      for (const docFile of docFiles) {
        const docPath = path.join(templatePath, docFile);
        if (!(await fs.pathExists(docPath))) {
          warnings.push({
            type: 'documentation-missing',
            message: `Documentation file not found: ${docFile}`,
            path: docPath,
          });
        }
      }
    } else {
      suggestions.push('Consider adding documentation files (README.md, ARCHITECTURE.md)');
    }

    // Suggest extension points if none defined
    if (!meta.extensionPoints || meta.extensionPoints.length === 0) {
      suggestions.push(
        'Consider adding extension points to guide AI agents in customizing the template'
      );
    }
  }

  /**
   * Validate Handlebars template syntax and variable usage
   */
  private async validateHandlebarsTemplate(
    templateFile: string,
    declaredVariables: Array<{ name: string }>,
    errors: ValidationResult['errors'],
    warnings: ValidationResult['warnings']
  ): Promise<void> {
    try {
      const content = await fs.readFile(templateFile, 'utf-8');

      // Try to compile the template
      try {
        Handlebars.compile(content);
      } catch (error) {
        errors.push({
          type: 'handlebars-syntax-error',
          message: `Handlebars syntax error in ${path.basename(templateFile)}`,
          path: templateFile,
          details: error,
        });
        return;
      }

      // Extract variable references from template
      const varPattern = /\{\{([^}]+)\}\}/g;
      const matches = content.matchAll(varPattern);
      const usedVariables = new Set<string>();

      for (const match of matches) {
        const expr = match[1].trim();
        // Extract variable name (handle helpers, paths, etc.)
        const varName = expr.split(/[\s.#/]/)[0];
        if (varName && !['if', 'unless', 'each', 'with'].includes(varName)) {
          usedVariables.add(varName);
        }
      }

      // Check for undefined variables
      const declaredNames = new Set(declaredVariables.map(v => v.name));
      for (const usedVar of usedVariables) {
        if (!declaredNames.has(usedVar)) {
          warnings.push({
            type: 'undefined-variable',
            message: `Template uses undeclared variable: {{${usedVar}}}`,
            path: templateFile,
          });
        }
      }
    } catch {
      errors.push({
        type: 'file-read-error',
        message: `Failed to read template file: ${templateFile}`,
        path: templateFile,
      });
    }
  }

  /**
   * Validate hook script
   */
  private async validateHookScript(
    hookPath: string,
    errors: ValidationResult['errors'],
    warnings: ValidationResult['warnings']
  ): Promise<void> {
    try {
      const content = await fs.readFile(hookPath, 'utf-8');

      // Basic validation: check if it exports a function
      if (!content.includes('module.exports') && !content.includes('export')) {
        warnings.push({
          type: 'hook-export-missing',
          message: `Hook script should export a function: ${path.basename(hookPath)}`,
          path: hookPath,
        });
      }

      // Check for common issues
      if (content.includes('process.exit')) {
        warnings.push({
          type: 'hook-process-exit',
          message: `Hook should return result instead of calling process.exit()`,
          path: hookPath,
        });
      }
    } catch {
      errors.push({
        type: 'hook-read-error',
        message: `Failed to read hook script: ${hookPath}`,
        path: hookPath,
      });
    }
  }
}
