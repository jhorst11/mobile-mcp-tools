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
 * Options for generating an app from a template
 */
export interface GenerateOptions {
  templateName: string;
  outputDirectory: string;
  variables: Record<string, string | number | boolean>;
}
