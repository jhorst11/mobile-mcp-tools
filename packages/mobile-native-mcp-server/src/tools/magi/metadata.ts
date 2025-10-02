/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { ToolMetadata } from '../../common/metadata.js';

/**
 * Magi Tool Input Schema
 */
export const MAGI_INPUT_SCHEMA = z.object({
  projectPath: z.string().describe('Path to the project where magi-sdd directory will be created'),
  featureId: z
    .string()
    .describe(
      'Feature identifier - either a full XXX-feature-name format or just the feature name (will be auto-formatted)'
    ),
  userInput: z
    .string()
    .optional()
    .describe('User input for finalizing documents (only accepted in appropriate states)'),
});

/**
 * Magi Tool Output Schema
 */
export const MAGI_OUTPUT_SCHEMA = z.object({
  success: z.boolean().describe('Whether the operation was successful'),
  featureId: z.string().describe('The feature ID that was processed'),
  projectPath: z.string().describe('The project path where documents were created'),
  magiDirectory: z.string().describe('Path to the created magi-sdd directory'),
  currentState: z.string().describe('Current state of the workflow'),
  nextAction: z.string().describe('Recommended next action'),
  documents: z
    .object({
      prd: z.object({
        status: z.string().describe('PRD document status'),
        path: z.string().describe('Path to the PRD document'),
      }),
      tdd: z.object({
        status: z.string().describe('TDD document status'),
        path: z.string().describe('Path to the TDD document'),
      }),
      tasks: z.object({
        status: z.string().describe('Tasks document status'),
        path: z.string().describe('Path to the tasks document'),
      }),
    })
    .describe('Status of all generated documents'),
});

export type MagiInput = z.infer<typeof MAGI_INPUT_SCHEMA>;
export type MagiOutput = z.infer<typeof MAGI_OUTPUT_SCHEMA>;

/**
 * Magi Tool Metadata
 */
export const MAGI_TOOL: ToolMetadata<typeof MAGI_INPUT_SCHEMA, typeof MAGI_OUTPUT_SCHEMA> = {
  toolId: 'magi',
  title: 'Magi Workflow Tool',
  description:
    'Simplified magi workflow that handles all states in one tool. Feature IDs are automatically formatted as XXX-feature-name (e.g., 001-user-authentication)',
  inputSchema: MAGI_INPUT_SCHEMA,
  outputSchema: MAGI_OUTPUT_SCHEMA,
} as const;
