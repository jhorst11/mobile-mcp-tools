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
export type ComplexityLevel = 'simple' | 'moderate' | 'advanced';
export type FileProcessor = 'handlebars' | 'copy' | 'custom';
export type FileAction = 'rename' | 'move' | 'delete';

export interface PlatformInfo {
  type: Platform;
  minVersion: string;
  targetVersion?: string;
  language?: string;
  framework?: string;
}

export interface UseCaseInfo {
  primary: string;
  scenarios: string[];
  when: string;
}

export interface ComplexityInfo {
  level: ComplexityLevel;
  explanation: string;
  estimatedLearningTime?: string;
  prerequisites?: string[];
}

export interface AIGuidance {
  overview?: string;
  steps: string[];
  exampleFiles?: string[];
  codePattern?: Record<string, string>;
  tips?: string[];
  prerequisites?: string[];
}

export interface ExtensionPoint {
  id: string;
  name: string;
  description: string;
  difficulty: ComplexityLevel;
  aiGuidance: AIGuidance;
  affectedFiles: string[];
  estimatedEffort?: string;
}

export interface FeatureInfo {
  id: string;
  name: string;
  description: string;
  files: string[];
  required: boolean;
}

export interface Requirements {
  system?: Record<string, unknown>;
  salesforce?: Record<string, unknown>;
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
  complexity: ComplexityInfo;
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
  /** If true, template is hidden from discovery (e.g., test-only templates) */
  hidden?: boolean;
  features?: FeatureInfo[];
  extensionPoints?: ExtensionPoint[];
  requirements: Requirements;
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
 * Template requirements for selection
 */
export interface TemplateRequirements {
  platform: Platform;
  requiredCapabilities?: string[];
  complexity?: ComplexityLevel;
  tags?: string[];
}

/**
 * Template match result with score
 */
export interface TemplateMatch {
  template: TemplateInfo;
  score: number;
  reasoning: string[];
}

/**
 * Ranked template with score
 */
export interface RankedTemplate {
  template: TemplateInfo;
  score: number;
  matchedCapabilities: string[];
  missingCapabilities: string[];
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
