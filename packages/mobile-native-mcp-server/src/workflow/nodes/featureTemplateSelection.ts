/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  AbstractGuidanceNode,
  Logger,
  NodeExecutor,
  NodeGuidanceData,
  createComponentLogger,
} from '@salesforce/magen-mcp-workflow';
import { ADD_FEATURE_TEMPLATE_SELECTION_TOOL } from '../../tools/plan/sfmobile-native-add-feature-template-selection/metadata.js';
import { AddFeatureState } from '../add-feature-metadata.js';
import dedent from 'dedent';

/**
 * Selects the most appropriate feature template based on the user's feature description.
 * Provides guidance directly to the LLM for template selection.
 */
export class FeatureTemplateSelectionNode extends AbstractGuidanceNode<AddFeatureState> {
  protected readonly logger: Logger;

  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('selectFeatureTemplate', nodeExecutor, logger);
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

    const guidanceData: NodeGuidanceData = {
      nodeId: 'selectFeatureTemplate',
      taskPrompt: this.generateTemplateSelectionGuidance(state),
      taskInput: {
        platform: state.platform,
        templateOptions: state.featureTemplateOptions,
      },
      resultSchema: ADD_FEATURE_TEMPLATE_SELECTION_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: ADD_FEATURE_TEMPLATE_SELECTION_TOOL.description,
      },
    };

    const validatedResult =
      this.executeWithGuidance<typeof ADD_FEATURE_TEMPLATE_SELECTION_TOOL.resultSchema>(
        guidanceData
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

  private generateTemplateSelectionGuidance(state: AddFeatureState): string {
    const templateOptionsJson = JSON.stringify(state.featureTemplateOptions, null, 2);

    return dedent`
      # Feature Template Selection Guidance for ${state.platform}

      ## Task: Select the Best Feature Template

      The following feature template options are available:

      \`\`\`json
      ${templateOptionsJson}
      \`\`\`

      Review the available feature templates and choose the template that best matches:
      - **Platform compatibility**: ${state.platform}
      - **Feature requirements**: Based on the user's feature description
      - **Feature capabilities**: What the feature adds to an existing app
      - **Complexity level**: Appropriate for the integration requirements

      Each template includes:
      - **path**: The template identifier to use as the selectedTemplate value
      - **metadata**: Contains descriptive information about the feature template
      - **extends**: Information about what base template this feature builds upon

      **Important**: These are feature templates (layered templates), not full app templates.
      They represent incremental features that can be added to existing applications.
    `;
  }
}
