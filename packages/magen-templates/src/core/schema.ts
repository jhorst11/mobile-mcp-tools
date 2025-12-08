/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';

/**
 * Zod schema for template variable metadata
 */
export const TemplateVariableSchema = z.object({
  name: z.string().min(1, 'Variable name is required'),
  type: z.enum(['string', 'number', 'boolean'], {
    errorMap: () => ({ message: 'Variable type must be string, number, or boolean' }),
  }),
  required: z.boolean(),
  description: z.string().min(1, 'Variable description is required').optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  regex: z.string().optional(),
  enum: z.array(z.string()).optional(),
});

/**
 * Zod schema for layer configuration
 */
export const LayerConfigSchema = z.object({
  patchFile: z.string().min(1, 'Patch file path is required'),
});

/**
 * Zod schema for template.json (metadata only, no variables)
 */
export const TemplateDescriptorSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  platform: z.string().min(1, 'Platform is required'),
  basedOn: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semver format (e.g., 0.1.0)'),
  layer: LayerConfigSchema.optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

/**
 * Zod schema for variables.json (variables only)
 */
export const TemplateVariablesSchema = z.object({
  variables: z.array(TemplateVariableSchema),
});

/**
 * Type inference from Zod schemas
 */
export type TemplateVariable = z.infer<typeof TemplateVariableSchema>;
export type LayerConfig = z.infer<typeof LayerConfigSchema>;
export type TemplateDescriptor = z.infer<typeof TemplateDescriptorSchema> & {
  variables: TemplateVariable[]; // Added at runtime from variables.json
};
export type TemplateVariables = z.infer<typeof TemplateVariablesSchema>;

/**
 * Validates a template descriptor against the schema
 *
 * @param data - The raw template data to validate
 * @returns The validated template descriptor (without variables)
 * @throws {z.ZodError} if validation fails
 */
export function validateTemplateDescriptor(data: unknown): Omit<TemplateDescriptor, 'variables'> {
  return TemplateDescriptorSchema.parse(data);
}

/**
 * Validates template variables against the schema
 *
 * @param data - The raw variables data to validate
 * @returns The validated template variables
 * @throws {z.ZodError} if validation fails
 */
export function validateTemplateVariables(data: unknown): TemplateVariables {
  return TemplateVariablesSchema.parse(data);
}

/**
 * Safely validates a template descriptor, returning errors instead of throwing
 *
 * @param data - The raw template data to validate
 * @returns Success result with data or error result with formatted errors
 */
export function safeValidateTemplateDescriptor(
  data: unknown
):
  | { success: true; data: Omit<TemplateDescriptor, 'variables'> }
  | { success: false; errors: string[] } {
  const result = TemplateDescriptorSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as Omit<TemplateDescriptor, 'variables'> };
  }

  const errors = result.error.errors.map(err => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return { success: false, errors };
}

/**
 * Safely validates template variables, returning errors instead of throwing
 *
 * @param data - The raw variables data to validate
 * @returns Success result with data or error result with formatted errors
 */
export function safeValidateTemplateVariables(
  data: unknown
): { success: true; data: TemplateVariables } | { success: false; errors: string[] } {
  const result = TemplateVariablesSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return { success: false, errors };
}
