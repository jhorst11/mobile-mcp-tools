/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';

export const SddUpdateFeatureInputSchema = z.object({
  projectPath: z
    .string()
    .describe('Path to the project directory where .magen folder should exist'),
  featureId: z
    .string()
    .describe('ID of the existing feature (e.g., 001-example-feature)')
    .regex(/^[0-9]{3}-[a-z0-9-]+$/, 'Feature ID must be in format NNN-kebab-case (e.g., 001-example-feature)'),
  target: z
    .enum(['prd', 'requirements', 'tasks'])
    .describe('Which artifact to update. PRD-first gating enforced.'),
  changeSummary: z
    .string()
    .optional()
    .describe('Optional short summary of the change to record in the changelog'),
});

export type SddUpdateFeatureInputType = z.infer<typeof SddUpdateFeatureInputSchema>;
