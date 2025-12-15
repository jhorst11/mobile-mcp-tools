/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Common Schema Components
 *
 * Shared field definitions, validators, and schema components used across multiple tools.
 * This eliminates duplication and ensures consistency in field validation.
 */

import { z } from 'zod';

/**
 * Platform enum used across all mobile tools
 */
export const PLATFORM_ENUM = z.enum(['iOS', 'Android']).describe('Target mobile platform');
export type PlatformEnum = z.infer<typeof PLATFORM_ENUM>;

/**
 * Project path field used in multiple tools
 */
export const PROJECT_PATH_FIELD = z.string().describe('Path to the mobile project directory');

/**
 * Project name field used in multiple tools
 */
export const PROJECT_NAME_FIELD = z.string().describe('Name for the mobile app project');

/**
 * Template-related schemas
 * Used for validating template discovery and selection data structures
 * Now based on magen-templates format
 */

// Schema for template variable definition (from magen-templates)
const TemplateVariableSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean']),
  required: z.boolean(),
  description: z.string().optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  regex: z.string().optional(),
  enum: z.array(z.string()).optional(),
});

// Schema for template descriptor (from magen-templates)
const TemplateDescriptorSchema = z
  .object({
    name: z.string(),
    platform: z.enum(['ios', 'android']),
    version: z.string(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
    variables: z.array(TemplateVariableSchema).default([]),
    extends: z
      .object({
        template: z.string(),
        version: z.string().optional(),
        patchFile: z.string().optional(),
      })
      .optional(),
    basedOn: z.string().optional(),
  })
  .passthrough();

// Schema for individual template entry in the list
// This matches what we'll construct from magen-templates discovery API
const TemplateEntrySchema = z.object({
  path: z.string().describe('Template name identifier used for template selection'),
  metadata: TemplateDescriptorSchema,
  descriptor: TemplateDescriptorSchema.optional(), // For compatibility
});

// Schema for the complete template list output structure
export const TEMPLATE_LIST_SCHEMA = z.object({
  templates: z.array(TemplateEntrySchema),
});

// Type inferred from the schema
export type TemplateListOutput = z.infer<typeof TEMPLATE_LIST_SCHEMA>;
