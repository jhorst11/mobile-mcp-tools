/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Programmatic API for Magen Templates
 *
 * This module provides a clean, programmatic interface to all template operations,
 * allowing library consumers to use Magen without the CLI.
 */

import { findTemplate, listTemplates, discoverTemplates } from '../core/discovery.js';
import { generateApp, validateVariables } from '../core/generator.js';
import { createLayer, materializeTemplate } from '../core/layering.js';
import { testTemplate } from '../core/testing.js';
import type { TemplateDescriptor, TemplateVariable } from '../core/schema.js';

// Re-export core types for API consumers
export type { TemplateDescriptor, TemplateVariable };

/**
 * Result of a template search operation
 */
export interface TemplateSearchResult {
  templates: TemplateDescriptor[];
  total: number;
  query?: string;
}

/**
 * Detailed template information
 */
export interface TemplateInfo {
  descriptor: TemplateDescriptor;
  path: string;
  inheritanceChain: string[];
  totalVariables: number;
  requiredVariables: string[];
  optionalVariables: string[];
  hasParent: boolean;
  isLayered: boolean;
}

/**
 * Error with suggestions for similar items
 */
export interface ErrorWithSuggestions extends Error {
  suggestions?: string[];
  code?: string;
}

/**
 * Validation result for variables
 */
export interface ApiVariableValidationResult {
  valid: boolean;
  errors: string[];
  missingRequired: string[];
  invalidValues: string[];
}

/**
 * Options for generating an app
 */
export interface ApiGenerateOptions {
  templateName: string;
  outputDirectory: string;
  variables: Record<string, string | number | boolean>;
  overwrite?: boolean;
  templateDirectory?: string;
}

/**
 * Result of app generation
 */
export interface GenerateResult {
  success: boolean;
  outputDirectory: string;
  templateUsed: string;
  variablesUsed: Record<string, string | number | boolean>;
  filesCreated: number;
}

/**
 * Find templates by various criteria
 */
export function searchTemplates(options: {
  query?: string;
  platform?: string;
  tags?: string[];
  name?: string;
}): TemplateSearchResult {
  let templates = listTemplates({ platform: options.platform });

  // Filter by name if specified
  if (options.name) {
    const nameLower = options.name.toLowerCase();
    templates = templates.filter(t => t.name.toLowerCase().includes(nameLower));
  }

  // Filter by tags if specified (AND logic)
  if (options.tags && options.tags.length > 0) {
    templates = templates.filter(template => {
      if (!template.tags || template.tags.length === 0) {
        return false;
      }
      return options.tags!.every(filterTag => template.tags!.includes(filterTag));
    });
  }

  // Full-text search if query specified
  if (options.query) {
    const queryLower = options.query.toLowerCase();
    templates = templates.filter(t => {
      const nameMatch = t.name.toLowerCase().includes(queryLower);
      const descMatch = t.description?.toLowerCase().includes(queryLower);
      const tagMatch = t.tags?.some(tag => tag.toLowerCase().includes(queryLower));
      return nameMatch || descMatch || tagMatch;
    });
  }

  return {
    templates,
    total: templates.length,
    query: options.query,
  };
}

/**
 * Get detailed information about a template
 */
export function getTemplateInfo(nameOrNameVersion: string): TemplateInfo | null {
  const templateInfo = findTemplate(nameOrNameVersion);
  if (!templateInfo) {
    return null;
  }

  const descriptor = templateInfo.descriptor;

  // Build inheritance chain
  const chain: string[] = [`${descriptor.name}@${descriptor.version}`];
  let current = descriptor;
  const allTemplates = discoverTemplates();

  while (current.extends?.template) {
    const parentName = `${current.extends.template}@${current.extends.version || '1.0.0'}`;
    chain.push(parentName);

    const parent = allTemplates.find(
      t =>
        t.descriptor.name === current.extends!.template &&
        t.descriptor.version === (current.extends!.version || '1.0.0')
    );
    if (!parent) break;
    current = parent.descriptor;
  }

  // Categorize variables
  const requiredVariables: string[] = [];
  const optionalVariables: string[] = [];

  descriptor.variables.forEach(v => {
    if (v.required) {
      requiredVariables.push(v.name);
    } else {
      optionalVariables.push(v.name);
    }
  });

  return {
    descriptor,
    path: templateInfo.templatePath,
    inheritanceChain: chain,
    totalVariables: descriptor.variables.length,
    requiredVariables,
    optionalVariables,
    hasParent: !!descriptor.extends,
    isLayered: !!descriptor.extends,
  };
}

/**
 * Find similar template names (for suggestions)
 */
export function findSimilarTemplates(name: string, limit = 5): string[] {
  const allTemplates = listTemplates();
  const nameLower = name.toLowerCase();

  // Calculate similarity scores
  const scored = allTemplates.map(t => ({
    name: t.name,
    score: calculateSimilarity(nameLower, t.name.toLowerCase()),
  }));

  // Sort by score and take top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter(s => s.score > 0.3) // Only suggest if reasonably similar
    .map(s => s.name);
}

/**
 * Simple similarity calculation (Levenshtein-inspired)
 */
function calculateSimilarity(s1: string, s2: string): number {
  // Check for substring match first
  if (s2.includes(s1)) return 0.9;
  if (s1.includes(s2)) return 0.8;

  // Check for common prefix
  let commonPrefix = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) {
      commonPrefix++;
    } else {
      break;
    }
  }

  if (commonPrefix > 0) {
    return commonPrefix / Math.max(s1.length, s2.length);
  }

  // Calculate Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

/**
 * Validate variables for a template (high-level API)
 */
export function apiValidateTemplateVariables(
  templateName: string,
  variables: Record<string, string | number | boolean>
): ApiVariableValidationResult {
  const templateInfo = findTemplate(templateName);
  if (!templateInfo) {
    return {
      valid: false,
      errors: [`Template not found: ${templateName}`],
      missingRequired: [],
      invalidValues: [],
    };
  }

  // First, apply defaults for missing variables
  const varsWithDefaults = { ...variables };
  templateInfo.descriptor.variables.forEach(v => {
    if (varsWithDefaults[v.name] === undefined && v.default !== undefined) {
      varsWithDefaults[v.name] = v.default;
    }
  });

  const validation = validateVariables(templateInfo.descriptor.variables, varsWithDefaults);

  if (validation.valid) {
    return {
      valid: true,
      errors: [],
      missingRequired: [],
      invalidValues: [],
    };
  }

  // Parse error messages to categorize
  const missingRequired: string[] = [];
  const invalidValues: string[] = [];

  validation.errors.forEach(err => {
    if (err.includes('Required variable') && err.includes('missing')) {
      const match = err.match(/Required variable '([^']+)'/);
      if (match) {
        missingRequired.push(match[1]);
      }
    } else if (err.includes('must be') || err.includes('Invalid')) {
      const match = err.match(/'([^']+)'/);
      if (match) {
        invalidValues.push(match[1]);
      }
    }
  });

  return {
    valid: false,
    errors: validation.errors,
    missingRequired,
    invalidValues,
  };
}

/**
 * Generate an app from a template
 */
export function generate(options: ApiGenerateOptions): GenerateResult {
  generateApp({
    templateName: options.templateName,
    outputDirectory: options.outputDirectory,
    variables: options.variables,
    overwrite: options.overwrite,
    templateDirectory: options.templateDirectory,
  });

  return {
    success: true,
    outputDirectory: options.outputDirectory,
    templateUsed: options.templateName,
    variablesUsed: options.variables,
    filesCreated: -1, // TODO: Track this in generateApp
  };
}

/**
 * Create an error with suggestions
 */
export function createTemplateNotFoundError(name: string): ErrorWithSuggestions {
  const suggestions = findSimilarTemplates(name);
  const error = new Error(`Template not found: '${name}'`) as ErrorWithSuggestions;
  error.code = 'TEMPLATE_NOT_FOUND';
  error.suggestions = suggestions;
  return error;
}

/**
 * Create an error for missing variables
 */
export function createMissingVariablesError(
  templateName: string,
  missingVars: string[]
): ErrorWithSuggestions {
  const error = new Error(
    `Missing required variables for ${templateName}: ${missingVars.join(', ')}`
  ) as ErrorWithSuggestions;
  error.code = 'MISSING_VARIABLES';
  error.suggestions = [`Run 'magen-template info ${templateName}' to see all required variables`];
  return error;
}

// Re-export core functions for convenience
export {
  findTemplate,
  listTemplates,
  discoverTemplates,
  generateApp,
  createLayer,
  materializeTemplate,
  testTemplate,
};
