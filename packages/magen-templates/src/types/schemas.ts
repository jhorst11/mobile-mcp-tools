/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';

export const PlatformSchema = z.enum(['ios', 'android', 'cross-platform']);

export const PlatformInfoSchema = z.object({
  type: PlatformSchema,
  minVersion: z.string(),
  targetVersion: z.string().optional(),
  language: z.string().optional(),
  framework: z.string().optional(),
});

export const UseCaseInfoSchema = z.object({
  primary: z.string(),
  scenarios: z.array(z.string()),
  when: z.string(),
});

export const ExtensionPointSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  aiGuidance: z.string().optional(),
  affectedFiles: z.array(z.string()).optional(),
});

export const FeatureInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  files: z.array(z.string()),
  required: z.boolean(),
});

export const TemplateVariableSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  description: z.string(),
  required: z.boolean(),
  default: z.unknown().optional(),
  validation: z.string().optional(),
  example: z.unknown().optional(),
  sensitive: z.boolean().optional(),
  options: z.array(z.unknown()).optional(),
});

export const FileTransformSchema = z.object({
  pattern: z.string(),
  processor: z.enum(['handlebars', 'copy', 'custom']),
  outputExtension: z.string().optional(),
});

export const FileOperationSchema = z.object({
  action: z.enum(['rename', 'move', 'delete']),
  from: z.string(),
  to: z.string().optional(),
});

export const GenerationConfigSchema = z.object({
  preHook: z.string().optional(),
  postHook: z.string().optional(),
  fileTransforms: z.array(FileTransformSchema),
  fileOperations: z.array(FileOperationSchema).optional(),
});

export const DocumentationLinksSchema = z.object({
  readme: z.string().optional(),
  architecture: z.string().optional(),
  gettingStarted: z.string().optional(),
  externalLinks: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    )
    .optional(),
});

export const TemplateMetadataSchema = z.object({
  $schema: z.string(),
  version: z.string(),
  type: z.literal('application'),
  id: z.string(),
  displayName: z.string(),
  description: z.string(),
  platform: PlatformInfoSchema,
  useCase: UseCaseInfoSchema,
  capabilities: z.array(z.string()),
  /** If true, template is hidden from discovery (e.g., test-only templates) */
  hidden: z.boolean().optional(),
  features: z.array(FeatureInfoSchema).optional(),
  extensionPoints: z.array(ExtensionPointSchema).optional(),
  requirements: z.record(z.unknown()),
  templateVariables: z.array(TemplateVariableSchema),
  generation: GenerationConfigSchema,
  documentation: DocumentationLinksSchema.optional(),
  tags: z.array(z.string()),
});

export type TemplateMetadataValidation = z.infer<typeof TemplateMetadataSchema>;
