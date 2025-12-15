/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  AbstractToolNode,
  Logger,
  MCPToolInvocationData,
  ToolExecutor,
  createComponentLogger,
} from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../add-feature-metadata.js';
import { FEATURE_INTEGRATION_TOOL } from '../../tools/plan/sfmobile-native-feature-integration/metadata.js';

/**
 * Integrates the feature into the existing project by invoking the feature integration tool.
 * The tool provides comprehensive guidance to the LLM on how to apply the patch changes.
 */
export class FeatureIntegrationNode extends AbstractToolNode<AddFeatureState> {
  protected readonly logger: Logger;

  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('integrateFeature', toolExecutor, logger);
    this.logger = logger ?? createComponentLogger('FeatureIntegrationNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    if (!state.patchContent || !state.patchAnalysis) {
      return {
        integrationSuccessful: false,
        integrationErrorMessages: [
          'Patch content and analysis are required for feature integration',
        ],
      };
    }

    // Invoke the feature integration tool to guide the LLM through applying the changes
    const toolInvocationData: MCPToolInvocationData<typeof FEATURE_INTEGRATION_TOOL.inputSchema> = {
      llmMetadata: {
        name: FEATURE_INTEGRATION_TOOL.toolId,
        description: FEATURE_INTEGRATION_TOOL.description,
        inputSchema: FEATURE_INTEGRATION_TOOL.inputSchema,
      },
      input: {
        platform: state.platform,
        projectPath: state.projectPath,
        projectName: state.projectName,
        featureDescription: state.featureDescription,
        selectedTemplate: state.selectedFeatureTemplate,
        patchContent: state.patchContent,
        patchAnalysis: state.patchAnalysis,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FEATURE_INTEGRATION_TOOL.resultSchema
    );

    // Check if integration was completed
    if (!validatedResult.integrationComplete) {
      return {
        integrationSuccessful: false,
        integrationErrorMessages: [
          'Feature integration was not completed. The LLM must apply all changes before proceeding.',
        ],
      };
    }

    this.logger.info('Feature integration completed', {
      projectPath: state.projectPath,
      featureTemplate: state.selectedFeatureTemplate,
      filesModified: validatedResult.filesModified?.length || 0,
    });

    return {
      integrationSuccessful: true,
      integrationErrorMessages: [],
    };
  };
}
