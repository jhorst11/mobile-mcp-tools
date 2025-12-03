/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// Export types
export type * from './types/index.js';

// Export main classes
export { TemplateRegistry } from './registry/TemplateRegistry.js';
export { TemplateGenerator } from './generation/TemplateGenerator.js';
export { TemplateValidator } from './validation/TemplateValidator.js';

// Export schemas
export * from './types/schemas.js';
