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
    .describe('Path to the project directory where .magen folder should exist'),
});

export type SddBuildFeatureInputType = z.infer<typeof SddBuildFeatureInputSchema>;
