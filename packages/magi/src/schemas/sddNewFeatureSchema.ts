/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';

export const SddNewFeatureInputSchema = z.object({
  projectPath: z
    .string()
    .describe('Path to the project directory where the feature will be created'),
  featureId: z
    .string()
    .optional()
    .describe(
      'Optional feature ID (e.g., 001-feature-name). If not provided, a new ID will be generated.'
    ),
});

export type SddNewFeatureInputType = z.infer<typeof SddNewFeatureInputSchema>;
