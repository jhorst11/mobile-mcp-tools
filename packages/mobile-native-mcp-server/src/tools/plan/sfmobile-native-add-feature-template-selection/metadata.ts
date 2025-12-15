/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PLATFORM_ENUM, TEMPLATE_LIST_SCHEMA } from '../../../common/schemas.js';
import {
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WorkflowToolMetadata,
} from '@salesforce/magen-mcp-workflow';

/**
 * Template Selection Tool Input Schema for Add Feature workflow
 */
export const ADD_FEATURE_TEMPLATE_SELECTION_WORKFLOW_INPUT_SCHEMA =
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
    platform: PLATFORM_ENUM,
    templateOptions: TEMPLATE_LIST_SCHEMA.describe(
      'The feature template options. Each template includes metadata with platform, displayName, and other descriptive information.'
    ),
  });

export type AddFeatureTemplateSelectionWorkflowInput = z.infer<
  typeof ADD_FEATURE_TEMPLATE_SELECTION_WORKFLOW_INPUT_SCHEMA
>;

export const ADD_FEATURE_TEMPLATE_SELECTION_WORKFLOW_RESULT_SCHEMA = z.object({
  selectedTemplate: z
    .string()
    .describe('The feature template path/name selected from the available templates'),
});

/**
 * Add Feature Template Selection Tool Metadata
 */
export const ADD_FEATURE_TEMPLATE_SELECTION_TOOL: WorkflowToolMetadata<
  typeof ADD_FEATURE_TEMPLATE_SELECTION_WORKFLOW_INPUT_SCHEMA,
  typeof ADD_FEATURE_TEMPLATE_SELECTION_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-add-feature-template-selection',
  title: 'Salesforce Mobile Native Add Feature Template Selection',
  description:
    'Guides LLM through feature template selection from available feature template options',
  inputSchema: ADD_FEATURE_TEMPLATE_SELECTION_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: ADD_FEATURE_TEMPLATE_SELECTION_WORKFLOW_RESULT_SCHEMA,
} as const;
