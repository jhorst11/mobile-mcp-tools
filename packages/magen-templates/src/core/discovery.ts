/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import {
  safeValidateTemplateDescriptor,
  safeValidateTemplateVariables,
  type TemplateDescriptor,
  type TemplateVariable,
} from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Template root configuration
 */
export interface TemplateRoot {
  path: string;
  priority: number; // Higher priority wins in case of name conflicts
  type: 'package' | 'user' | 'env' | 'project';
}

/**
 * Template discovery result with metadata
 */
export interface TemplateInfo {
  descriptor: TemplateDescriptor;
  templatePath: string;
  rootType: TemplateRoot['type'];
}

/**
 * Gets all template root directories in priority order
 *
 * @returns Array of template roots, sorted by priority (highest first)
 */
export function getTemplateRoots(): TemplateRoot[] {
  const roots: TemplateRoot[] = [];

  // 1. Package templates (highest priority for built-in templates)
  const packageTemplatesPath = join(__dirname, '../../templates');
  if (existsSync(packageTemplatesPath)) {
    roots.push({
      path: packageTemplatesPath,
      priority: 100,
      type: 'package',
    });
  }

  // 2. Environment variable (for custom template locations)
  const envTemplatePath = process.env.MAGEN_TEMPLATES_PATH;
  if (envTemplatePath && existsSync(envTemplatePath)) {
    roots.push({
      path: envTemplatePath,
      priority: 75,
      type: 'env',
    });
  }

  // 3. User-level templates (~/.magen/templates)
  const userTemplatesPath = join(homedir(), '.magen', 'templates');
  if (existsSync(userTemplatesPath)) {
    roots.push({
      path: userTemplatesPath,
      priority: 50,
      type: 'user',
    });
  }

  // 4. Project-local templates (lowest priority, discovered from cwd)
  const projectTemplatesPath = join(process.cwd(), '.magen', 'templates');
  if (existsSync(projectTemplatesPath)) {
    roots.push({
      path: projectTemplatesPath,
      priority: 25,
      type: 'project',
    });
  }

  // Sort by priority (highest first)
  return roots.sort((a, b) => b.priority - a.priority);
}

/**
 * Discovers all templates across all template roots
 *
 * @param options - Optional filtering options
 * @returns Array of template information objects
 */
export function discoverTemplates(options?: { platform?: string }): TemplateInfo[] {
  const roots = getTemplateRoots();
  const templates = new Map<string, TemplateInfo>(); // Use map to handle duplicates by priority

  for (const root of roots) {
    try {
      const entries = readdirSync(root.path);

      for (const entry of entries) {
        const templatePath = join(root.path, entry);
        const templateJsonPath = join(templatePath, 'template.json');

        // Skip if not a directory or no template.json
        if (!statSync(templatePath).isDirectory() || !existsSync(templateJsonPath)) {
          continue;
        }

        try {
          // Load template.json (metadata)
          const rawData = readFileSync(templateJsonPath, 'utf-8');
          const jsonData = JSON.parse(rawData);
          const validationResult = safeValidateTemplateDescriptor(jsonData);

          if (!validationResult.success) {
            // Skip invalid templates but don't crash
            console.warn(
              `Warning: Invalid template at ${templatePath}:\n  ${validationResult.errors.join('\n  ')}`
            );
            continue;
          }

          // Load variables.json (if present)
          // For layered templates, check work/ directory first
          // For base templates, check root directory
          let variablesPath = join(templatePath, 'work', 'variables.json');
          if (!existsSync(variablesPath)) {
            variablesPath = join(templatePath, 'variables.json');
          }

          let variables: TemplateVariable[] = [];

          if (existsSync(variablesPath)) {
            try {
              const variablesRaw = readFileSync(variablesPath, 'utf-8');
              const variablesData = JSON.parse(variablesRaw);
              const variablesResult = safeValidateTemplateVariables(variablesData);

              if (!variablesResult.success) {
                console.warn(
                  `Warning: Invalid variables.json at ${variablesPath}:\n  ${variablesResult.errors.join('\n  ')}`
                );
              } else {
                variables = variablesResult.data.variables;
              }
            } catch (error) {
              console.warn(
                `Warning: Could not read variables.json at ${variablesPath}: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          }

          const descriptor: TemplateDescriptor = {
            ...validationResult.data,
            variables,
          };

          // Apply platform filter if specified
          if (options?.platform && descriptor.platform !== options.platform) {
            continue;
          }

          // Only add if not already present (higher priority roots processed first)
          if (!templates.has(descriptor.name)) {
            templates.set(descriptor.name, {
              descriptor,
              templatePath,
              rootType: root.type,
            });
          }
        } catch (error) {
          // Skip corrupt template files but don't crash
          console.warn(
            `Warning: Could not read template at ${templatePath}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } catch (error) {
      // Skip inaccessible roots but don't crash
      console.warn(
        `Warning: Could not access template root at ${root.path}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return Array.from(templates.values());
}

/**
 * Finds a specific template by name
 *
 * @param name - Template name to find
 * @returns Template information or null if not found
 */
export function findTemplate(name: string): TemplateInfo | null {
  const templates = discoverTemplates();
  return templates.find(t => t.descriptor.name === name) || null;
}

/**
 * Lists all available templates
 *
 * @param options - Optional filtering options
 * @returns Array of template descriptors
 */
export function listTemplates(options?: { platform?: string }): TemplateDescriptor[] {
  const templates = discoverTemplates(options);
  return templates.map(t => t.descriptor);
}

/**
 * Gets a specific template by name
 *
 * @param name - Template name
 * @returns Template descriptor
 * @throws Error if template not found
 */
export function getTemplate(name: string): TemplateDescriptor {
  const template = findTemplate(name);
  if (!template) {
    throw new Error(`Template not found: ${name}`);
  }
  return template.descriptor;
}
