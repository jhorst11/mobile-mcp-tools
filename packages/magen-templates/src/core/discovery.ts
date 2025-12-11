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
  version: string;
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
 * Supports versioned directory structure: templates/{name}/{version}/template.json
 *
 * @param options - Optional filtering options
 * @returns Array of template information objects
 */
export function discoverTemplates(options?: { platform?: string }): TemplateInfo[] {
  const roots = getTemplateRoots();
  const templates = new Map<string, TemplateInfo>(); // Key: name@version

  for (const root of roots) {
    try {
      const templateNames = readdirSync(root.path);

      for (const templateName of templateNames) {
        const templateBasePath = join(root.path, templateName);

        // Skip if not a directory
        if (!statSync(templateBasePath).isDirectory()) {
          continue;
        }

        // Check for version directories
        const versionEntries = readdirSync(templateBasePath);

        for (const versionDir of versionEntries) {
          const versionPath = join(templateBasePath, versionDir);
          const templateJsonPath = join(versionPath, 'template.json');

          // Skip if not a directory or no template.json
          if (!statSync(versionPath).isDirectory() || !existsSync(templateJsonPath)) {
            continue;
          }

          // Verify versionDir is a valid semver
          if (!/^\d+\.\d+\.\d+$/.test(versionDir)) {
            console.warn(
              `Warning: Invalid version directory at ${versionPath}: ` +
                `Version must be semver format (e.g., 1.0.0)`
            );
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
                `Warning: Invalid template at ${versionPath}:\n  ${validationResult.errors.join('\n  ')}`
              );
              continue;
            }

            // Normalize extends format
            const normalizedData = { ...validationResult.data };

            // If using extends format, populate basedOn with version for compatibility
            if (normalizedData.extends) {
              const parentVersion = normalizedData.extends.version || 'latest';
              normalizedData.basedOn =
                parentVersion === 'latest'
                  ? normalizedData.extends.template
                  : `${normalizedData.extends.template}@${parentVersion}`;
            }

            // Load variables.json (if present)
            // For layered templates, check work/ directory first
            // For base templates, check root directory
            let variablesPath = join(versionPath, 'work', 'variables.json');
            if (!existsSync(variablesPath)) {
              variablesPath = join(versionPath, 'variables.json');
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
              ...normalizedData,
              variables,
            };

            // Apply platform filter if specified
            if (options?.platform && descriptor.platform !== options.platform) {
              continue;
            }

            // Create unique key: name@version
            const templateKey = `${descriptor.name}@${versionDir}`;

            // Only add if not already present (higher priority roots processed first)
            if (!templates.has(templateKey)) {
              templates.set(templateKey, {
                descriptor,
                templatePath: versionPath,
                rootType: root.type,
                version: versionDir,
              });
            }
          } catch (error) {
            // Skip corrupt template files but don't crash
            console.warn(
              `Warning: Could not read template at ${versionPath}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
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
 * Finds a specific template by name and optional version
 *
 * @param name - Template name to find (can include @version, e.g., "ios-base@1.0.0")
 * @param version - Optional specific version to find. If not specified, returns latest version.
 * @returns Template information or null if not found
 */
export function findTemplate(name: string, version?: string): TemplateInfo | null {
  const templates = discoverTemplates();

  // Check if version is included in name (e.g., "ios-base@1.0.0")
  const atIndex = name.indexOf('@');
  if (atIndex !== -1) {
    version = name.substring(atIndex + 1);
    name = name.substring(0, atIndex);
  }

  // Filter templates by name
  const matchingTemplates = templates.filter(t => t.descriptor.name === name);

  if (matchingTemplates.length === 0) {
    return null;
  }

  // If version specified, find exact match
  if (version) {
    return matchingTemplates.find(t => t.version === version) || null;
  }

  // Otherwise, return latest version (highest semver)
  return matchingTemplates.sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.version.split('.').map(Number);
    const [bMajor, bMinor, bPatch] = b.version.split('.').map(Number);

    if (aMajor !== bMajor) return bMajor - aMajor;
    if (aMinor !== bMinor) return bMinor - aMinor;
    return bPatch - aPatch;
  })[0];
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
 * Gets a specific template by name and optional version
 *
 * @param name - Template name (can include @version)
 * @param version - Optional specific version
 * @returns Template descriptor
 * @throws Error if template not found
 */
export function getTemplate(name: string, version?: string): TemplateDescriptor {
  const template = findTemplate(name, version);
  if (!template) {
    const versionStr = version ? `@${version}` : '';
    throw new Error(`Template not found: ${name}${versionStr}`);
  }
  return template.descriptor;
}
