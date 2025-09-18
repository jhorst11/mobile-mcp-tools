/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';

export const SddBuildFeatureInputSchema = z.object({
  projectPath: z
    .string()
    .describe('Path to the project directory where magen-sdd folder should exist'),
  featureId: z
    .string()
    .describe('ID of the feature to create (e.g., 001-example-feature)')
    .regex(
      /^\d{3}-[a-z0-9-]+$/,
      'Feature ID must be in format NNN-kebab-case (e.g., 001-example-feature)'
    ),
});

export type SddBuildFeatureInputType = z.infer<typeof SddBuildFeatureInputSchema>;
