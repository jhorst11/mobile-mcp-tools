/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Core type definitions for the magen-templates system
 */

export type Platform = 'ios' | 'android' | 'cross-platform';

/**
 * File processor types:
 * - 'handlebars': Process file content with Handlebars templating
 *
 * Files that don't match any fileTransform pattern are copied as-is by default.
 * For custom processing logic, use preHook/postHook which have full access
 * to the output directory and can process files as needed.
 */
export type FileProcessor = 'handlebars';
export type FileAction = 'rename' | 'move' | 'delete';

export interface PlatformInfo {
  type: Platform;
  minVersion: string;
}

export interface UseCaseInfo {
  primary: string;
  scenarios: string[];
  when: string;
}

export interface ExtensionPoint {
  id: string;
  name: string;
  description: string;
  aiGuidance?: string;
  affectedFiles?: string[];
}

export interface FeatureInfo {
  id: string;
  name: string;
  description: string;
  files: string[];
  required: boolean;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
  validation?: string;
  example?: unknown;
  sensitive?: boolean;
  options?: unknown[];
}

export interface FileTransform {
  pattern: string;
  processor: FileProcessor;
  outputExtension?: string;
}

export interface FileOperation {
  action: FileAction;
  from: string;
  to?: string;
}

export interface GenerationConfig {
  preHook?: string;
  postHook?: string;
  fileTransforms: FileTransform[];
  fileOperations?: FileOperation[];
}

export interface DocumentationLinks {
  readme?: string;
  architecture?: string;
  gettingStarted?: string;
  externalLinks?: Array<{
    title: string;
    url: string;
  }>;
}

/**
 * Lightweight template information for discovery and listing.
 * Used when browsing available templates or filtering by capabilities.
 */
export interface TemplateInfo {
  id: string;
  displayName: string;
  description: string;
  platform: PlatformInfo;
  capabilities: string[];
  tags: string[];
  version: string;
  useCase: UseCaseInfo;
}

/**
 * Complete template metadata specification.
 * Contains everything needed to generate a project from the template.
 */
export interface TemplateMetadata extends TemplateInfo {
  $schema: string;
  type: 'application';
  /** Template ID to inherit from (base template) */
  extends?: string;
  /** If true, template is hidden from discovery (e.g., base templates, test-only templates) */
  hidden?: boolean;
  features?: FeatureInfo[];
  extensionPoints?: ExtensionPoint[];
  templateVariables: TemplateVariable[];
  generation: GenerationConfig;
  documentation?: DocumentationLinks;
}

/**
 * Configuration for generating a project from a template
 */
export interface GenerationContext {
  templateId: string;
  metadata: TemplateMetadata;
  variables: Record<string, unknown>;
  outputPath: string;
  options?: GenerationOptions;
}

export interface GenerationOptions {
  dryRun?: boolean;
  overwrite?: boolean;
  skipHooks?: boolean;
  verbose?: boolean;
}

export interface GenerationResult {
  success: boolean;
  outputPath: string;
  files: string[];
  errors?: Error[];
  warnings?: string[];
  postGenerationInstructions?: string[];
}

export interface GenerationPreview {
  files: Array<{
    source: string;
    destination: string;
    willProcess: boolean;
  }>;
  variables: Record<string, unknown>;
  operations: FileOperation[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: string[];
}

export interface ValidationError {
  type: string;
  message: string;
  path?: string;
  details?: unknown;
}

export interface ValidationWarning {
  type: string;
  message: string;
  path?: string;
}

/**
 * Hook execution context
 */
export interface HookContext {
  templatePath: string;
  outputPath: string;
  variables: Record<string, unknown>;
  metadata: TemplateMetadata;
}

/**
 * Hook execution result
 */
export interface HookResult {
  success: boolean;
  instructions?: string[];
  error?: Error;
}
