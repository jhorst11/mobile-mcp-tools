/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PLATFORM_ENUM } from '../../../common/schemas.js';
import {
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WorkflowToolMetadata,
} from '@salesforce/magen-mcp-workflow';

/**
 * Feature Integration Tool Input Schema
 */
export const FEATURE_INTEGRATION_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  platform: PLATFORM_ENUM,
  projectPath: z.string().describe('Absolute path to the project directory'),
  projectName: z.string().describe('Name of the project'),
  featureDescription: z.string().describe('Description of the feature being added'),
  selectedTemplate: z.string().describe('The selected feature template identifier'),
  patchContent: z.string().describe('The complete content of the layer.patch file'),
  patchAnalysis: z.string().describe('Analysis of what the patch changes'),
});

export type FeatureIntegrationWorkflowInput = z.infer<
  typeof FEATURE_INTEGRATION_WORKFLOW_INPUT_SCHEMA
>;

export const FEATURE_INTEGRATION_WORKFLOW_RESULT_SCHEMA = z.object({
  integrationComplete: z.boolean().describe('Whether the feature integration is complete'),
  filesModified: z
    .array(z.string())
    .optional()
    .describe('List of files that were modified during integration'),
  notes: z.string().optional().describe('Any notes or observations from the integration'),
});

/**
 * Feature Integration Tool Metadata
 */
export const FEATURE_INTEGRATION_TOOL: WorkflowToolMetadata<
  typeof FEATURE_INTEGRATION_WORKFLOW_INPUT_SCHEMA,
  typeof FEATURE_INTEGRATION_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-feature-integration',
  title: 'Salesforce Mobile Native Feature Integration',
  description:
    'Guides LLM through integrating a feature into an existing project based on patch analysis',
  inputSchema: FEATURE_INTEGRATION_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: FEATURE_INTEGRATION_WORKFLOW_RESULT_SCHEMA,
} as const;
