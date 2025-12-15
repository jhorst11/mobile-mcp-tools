/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import {
  ToolMetadata,
  WORKFLOW_PROPERTY_NAMES,
  WORKFLOW_STATE_DATA_SCHEMA,
} from '@salesforce/magen-mcp-workflow';

/**
 * Add Feature Orchestrator input schema
 */
export const ADD_FEATURE_ORCHESTRATOR_INPUT_SCHEMA = z.object({
  userInput: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'User input - can be any data structure from initial request or previously executed MCP tool'
    ),
  [WORKFLOW_PROPERTY_NAMES.workflowStateData]: WORKFLOW_STATE_DATA_SCHEMA.default({
    thread_id: '',
  }).describe('Opaque workflow state data. Do not populate unless explicitly instructed to do so.'),
});

export type AddFeatureOrchestratorInput = z.infer<typeof ADD_FEATURE_ORCHESTRATOR_INPUT_SCHEMA>;

/**
 * Add Feature Orchestrator output schema
 */
export const ADD_FEATURE_ORCHESTRATOR_OUTPUT_SCHEMA = z.object({
  orchestrationInstructionsPrompt: z
    .string()
    .describe('The prompt describing the next workflow action for the LLM to execute.'),
});

export type AddFeatureOrchestratorOutput = z.infer<typeof ADD_FEATURE_ORCHESTRATOR_OUTPUT_SCHEMA>;

/**
 * Add Feature Orchestrator Tool Metadata
 */
export const ADD_FEATURE_ORCHESTRATOR_TOOL: ToolMetadata<
  typeof ADD_FEATURE_ORCHESTRATOR_INPUT_SCHEMA,
  typeof ADD_FEATURE_ORCHESTRATOR_OUTPUT_SCHEMA
> = {
  toolId: 'sfmobile-native-add-feature',
  title: 'Salesforce Mobile Native Add Feature',
  description:
    'Orchestrates the workflow for ADDING FEATURES to EXISTING Salesforce native mobile apps using feature templates. ' +
    'Use this tool when the user wants to add a feature to an existing iOS or Android project. ' +
    'DO NOT use this tool for creating new apps - use sfmobile-native-project-manager instead. ' +
    'Once you call this tool, continue calling THIS SAME TOOL (sfmobile-native-add-feature) with the workflowStateData from each response until the workflow completes. ' +
    'IMPORTANT: Keep calling sfmobile-native-add-feature for all subsequent steps in this workflow, not sfmobile-native-project-manager.',
  inputSchema: ADD_FEATURE_ORCHESTRATOR_INPUT_SCHEMA,
  outputSchema: ADD_FEATURE_ORCHESTRATOR_OUTPUT_SCHEMA,
} as const;
