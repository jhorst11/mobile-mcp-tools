/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';

export const SddNextFeatureIdInputSchema = z.object({
  projectPath: z
    .string()
    .describe('Path to the project directory where magi-sdd folder should exist'),
  featureName: z
    .string()
    .describe(
      'Kebab-case feature name to prepend with next numerical value (e.g., add-login-screen)'
    )
    .regex(/^[a-z0-9-]+$/, 'Feature name must be in kebab-case format (e.g., add-login-screen)'),
});

export type SddNextFeatureIdInputType = z.infer<typeof SddNextFeatureIdInputSchema>;
