/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import path from 'path';

export interface TemplateContext {
  projectPath: string;
  featureId: string;
  magiDirectory: string;
  prdPath: string;
  tddPath: string;
  tasksPath: string;
}

/**
 * Processes template strings by replacing placeholders with actual values
 * @param template The template string with placeholders
 * @param context The context object containing values to substitute
 * @returns The processed string with placeholders replaced
 */
export function processTemplate(template: string, context: TemplateContext): string {
  let processed = template;

  // Calculate relative paths from project root
  const relativeMagiDir = path.relative(context.projectPath, context.magiDirectory);
  const relativePrdPath = path.relative(context.projectPath, context.prdPath);
  const relativeTddPath = path.relative(context.projectPath, context.tddPath);
  const relativeTasksPath = path.relative(context.projectPath, context.tasksPath);

  // Replace common placeholders with relative paths
  const replacements: Record<string, string> = {
    '<project_path>': '.', // Current directory (project root)
    '<feature_id>': context.featureId,
    '<magi_directory>': relativeMagiDir,
    '<prd_path>': relativePrdPath,
    '<tdd_path>': relativeTddPath,
    '<tasks_path>': relativeTasksPath,
    '<feature_name>': context.featureId.replace(/^\d{3}-/, ''), // Remove numeric prefix
  };

  // Replace all placeholders
  for (const [placeholder, value] of Object.entries(replacements)) {
    processed = processed.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      value
    );
  }

  return processed;
}

/**
 * Creates a template context from the magi state context
 * @param context The magi state context
 * @returns A template context for processing templates
 */
export function createTemplateContext(context: {
  projectPath: string;
  featureId: string;
  magiDirectory: string;
  prdPath: string;
  tddPath: string;
  tasksPath: string;
}): TemplateContext {
  return {
    projectPath: context.projectPath,
    featureId: context.featureId,
    magiDirectory: context.magiDirectory,
    prdPath: context.prdPath,
    tddPath: context.tddPath,
    tasksPath: context.tasksPath,
  };
}
