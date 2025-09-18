/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';

export const SddInitInputSchema = z.object({
  projectPath: z
    .string()
    .describe('Path to the project directory where magen-sdd folder will be created'),
});

export type SddInitInputType = z.infer<typeof SddInitInputSchema>;
