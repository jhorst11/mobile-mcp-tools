/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';
import '../../../common/zod-extensions.js';
import {
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WorkflowToolMetadata,
} from '../../../common/metadata.js';
import { InputGatheringStrategySchema } from '../../../workflow/inputGathering/types.js';

/**
 * Gather Input Tool Input Schema
 */
export const GATHER_INPUT_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  strategy: InputGatheringStrategySchema.describe(
    'The input gathering strategy to use (single, multiple, choice, or confirmation)'
  ),
  purpose: z.string().describe('Why this information is needed - provides context for the prompt'),
  workflowContext: z
    .record(z.unknown())
    .optional()
    .describe('Additional workflow context that may be relevant'),
});

/**
 * Gather Input Tool Result Schema
 */
export const GATHER_INPUT_WORKFLOW_RESULT_SCHEMA = z.object({
  collectedProperties: z
    .record(z.unknown())
    .describe('Properties successfully collected from user input'),
  userProvidedText: z.string().describe('The raw text provided by the user'),
  strategyUsed: z.string().describe('The strategy type that was used'),
});

export type GatherInputWorkflowInput = z.infer<typeof GATHER_INPUT_WORKFLOW_INPUT_SCHEMA>;
export type GatherInputWorkflowResult = z.infer<typeof GATHER_INPUT_WORKFLOW_RESULT_SCHEMA>;

/**
 * Gather Input Tool Metadata
 */
export const GATHER_INPUT_TOOL: WorkflowToolMetadata<
  typeof GATHER_INPUT_WORKFLOW_INPUT_SCHEMA,
  typeof GATHER_INPUT_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-gather-input',
  title: 'Gather User Input with Flexible Strategies',
  description: `Gather user input for mobile native workflow using flexible interaction patterns.

This tool supports multiple gathering strategies:
- Single property: Focus on one complex property with detailed guidance
- Multiple properties: Collect several related properties at once in natural format
- Choice selection: Present predefined options with optional custom input
- Confirmation: Yes/no questions with defaults

The tool provides guidance to the host LLM, which formulates natural questions and handles user interaction. This maintains conversational quality while reducing tool call overhead.`,
  inputSchema: GATHER_INPUT_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: GATHER_INPUT_WORKFLOW_RESULT_SCHEMA,
} as const;
