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
import { ADD_FEATURE_TEMPLATE_SELECTION_TOOL } from '../../tools/plan/sfmobile-native-add-feature-template-selection/metadata.js';
import { AddFeatureState } from '../add-feature-metadata.js';

/**
 * Selects the most appropriate feature template based on the user's feature description.
 * Uses the add-feature-specific template selection tool that points to the correct orchestrator.
 */
export class FeatureTemplateSelectionNode extends AbstractToolNode<AddFeatureState> {
  protected readonly logger: Logger;

  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('selectFeatureTemplate', toolExecutor, logger);
    this.logger = logger ?? createComponentLogger('FeatureTemplateSelectionNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    // Check if we already have a selected feature template
    if (state.selectedFeatureTemplate) {
      this.logger.debug('Feature template already selected, skipping selection');
      return {};
    }

    if (!state.featureTemplateOptions) {
      return {
        workflowFatalErrorMessages: ['No feature template options available for selection'],
      };
    }

    if (state.featureTemplateOptions.templates.length === 0) {
      return {
        workflowFatalErrorMessages: [
          `No feature templates found for platform ${state.platform}. ` +
            'Feature templates are layered templates that extend base templates. ' +
            'The feature you described may need to be implemented manually.',
        ],
      };
    }

    // Invoke the add-feature-specific template selection tool
    const toolInvocationData: MCPToolInvocationData<
      typeof ADD_FEATURE_TEMPLATE_SELECTION_TOOL.inputSchema
    > = {
      llmMetadata: {
        name: ADD_FEATURE_TEMPLATE_SELECTION_TOOL.toolId,
        description: ADD_FEATURE_TEMPLATE_SELECTION_TOOL.description,
        inputSchema: ADD_FEATURE_TEMPLATE_SELECTION_TOOL.inputSchema,
      },
      input: {
        platform: state.platform,
        templateOptions: state.featureTemplateOptions,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      ADD_FEATURE_TEMPLATE_SELECTION_TOOL.resultSchema
    );

    if (!validatedResult.selectedTemplate) {
      return {
        workflowFatalErrorMessages: [
          'Feature template selection did not return a selectedTemplate',
        ],
      };
    }

    return {
      selectedFeatureTemplate: validatedResult.selectedTemplate,
    };
  };
}
