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
export { checkGitAvailability, ensureGitAvailable, createPatch, applyPatch } from './core/git.js';
export type { GitAvailabilityResult } from './core/git.js';
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
export {
  testTemplate,
  watchTemplate,
  getTestDirectory,
  getWorkDirectory, // deprecated, use getTestDirectory
  hasTestInstance,
} from './core/testing.js';
export type {
  TestTemplateOptions,
  TestTemplateResult,
  WatchTemplateOptions,
} from './core/testing.js';
export { createLayer, materializeTemplate, detectCycle } from './core/layering.js';
export type { CreateLayerOptions, CreateLayerResult, MaterializeOptions } from './core/layering.js';
