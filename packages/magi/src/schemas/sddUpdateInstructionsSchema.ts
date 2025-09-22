/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';

export const SddUpdateInstructionsInputSchema = z.object({
  projectPath: z.string().describe('The path to the project directory.'),
});

export type SddUpdateInstructionsInputType = z.infer<typeof SddUpdateInstructionsInputSchema>;
