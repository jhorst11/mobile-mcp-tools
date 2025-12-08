/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Magen Template System - Main Library Export
 *
 * A layered, platform-agnostic app templating engine inspired by Docker's image layering.
 */

export * from './core/types.js';
export * from './core/git.js';
export * from './core/schema.js';
export {
  listTemplates,
  getTemplate,
  findTemplate,
  discoverTemplates,
  getTemplateRoots,
} from './core/discovery.js';
export type { TemplateInfo, TemplateRoot } from './core/discovery.js';
export { generateApp } from './core/generator.js';
export { finalizeTemplate } from './core/finalize.js';
export type { FinalizeOptions, FinalizeResult } from './core/finalize.js';
export {
  parseAnnotations,
  extractDefaultValue,
  rewriteLineWithHandlebars,
  validateAnnotations,
} from './core/annotations.js';
export type {
  VariableAnnotation,
  RegexAnnotation,
  EnumAnnotation,
  FilenameAnnotation,
  FileAnnotations,
  ExtractionResult,
} from './core/annotations.js';
