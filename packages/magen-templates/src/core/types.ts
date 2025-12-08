/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Core type definitions for the Magen Template System
 */

/**
 * Metadata for a template variable
 */
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description: string;
  default?: string | number | boolean;
  regex?: string;
  enum?: string[];
}

/**
 * Template metadata from template.json
 */
export interface TemplateDescriptor {
  name: string;
  platform: string;
  basedOn?: string;
  version: string;
  layer?: {
    patchFile: string;
  };
  variables: TemplateVariable[];
  tags?: string[];
  description?: string;
}

/**
 * Options for generating an app from a template
 */
export interface GenerateOptions {
  templateName: string;
  outputDirectory: string;
  variables: Record<string, string | number | boolean>;
}
