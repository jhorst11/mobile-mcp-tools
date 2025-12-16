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
import { TEMPLATE_SELECTION_TOOL } from '../../tools/plan/sfmobile-native-template-selection/metadata.js';
import { State, TemplatePropertiesMetadata } from '../metadata.js';
import dedent from 'dedent';

export class TemplateSelectionNode extends AbstractGuidanceNode<State> {
  protected readonly logger: Logger;

  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('selectTemplate', nodeExecutor, logger);
    this.logger = logger ?? createComponentLogger('TemplateSelectionNode');
  }

  execute = (state: State): Partial<State> => {
    // Check if we already have a selected template (e.g., when resuming from interrupt)
    // This prevents re-executing when LangGraph re-runs the node after resume
    if (state.selectedTemplate) {
      this.logger.debug('Template already selected, skipping selection');
      return {}; // Return empty update to avoid overwriting existing state
    }

    if (!state.templateOptions) {
      return {
        workflowFatalErrorMessages: ['No template options available for selection'],
      };
    }

    const guidanceData: NodeGuidanceData = {
      nodeId: 'selectTemplate',
      taskPrompt: this.generateTemplateSelectionGuidance(state),
      taskInput: {
        platform: state.platform,
        templateOptions: state.templateOptions,
      },
      resultSchema: TEMPLATE_SELECTION_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: TEMPLATE_SELECTION_TOOL.description,
      },
    };

    const validatedResult =
      this.executeWithGuidance<typeof TEMPLATE_SELECTION_TOOL.resultSchema>(guidanceData);

    if (!validatedResult.selectedTemplate) {
      return {
        workflowFatalErrorMessages: ['Template selection did not return a selectedTemplate'],
      };
    }

    // Extract template properties metadata from the selected template's options
    const templatePropertiesMetadata = this.extractTemplatePropertiesMetadata(
      validatedResult.selectedTemplate,
      state.templateOptions
    );

    return {
      selectedTemplate: validatedResult.selectedTemplate,
      templatePropertiesMetadata,
    };
  };

  private extractTemplatePropertiesMetadata(
    selectedTemplate: string,
    templateOptions: State['templateOptions']
  ): TemplatePropertiesMetadata | undefined {
    try {
      // Find the selected template in the templates array
      const template = templateOptions.templates.find(t => t.path === selectedTemplate);
      if (!template) {
        this.logger.warn(`Template not found in templateOptions: ${selectedTemplate}`);
        return undefined;
      }

      // Access the template descriptor (from magen-templates format)
      const descriptor = template.metadata;
      if (!descriptor) {
        this.logger.debug(`No descriptor found for template ${selectedTemplate}`);
        return undefined;
      }

      // Access the variables array from the descriptor
      const variables = descriptor.variables;
      if (!variables || !Array.isArray(variables) || variables.length === 0) {
        this.logger.debug(`No variables found for template ${selectedTemplate}`);
        return undefined;
      }

      // Convert all template variables to TemplatePropertiesMetadata format
      // All variables are dynamically handled - no hardcoded filtering
      const propertiesMetadata: TemplatePropertiesMetadata = {};

      for (const variable of variables) {
        propertiesMetadata[variable.name] = {
          value: variable.default !== undefined ? String(variable.default) : undefined,
          required: variable.required,
          description: variable.description || '',
        };
      }

      if (Object.keys(propertiesMetadata).length > 0) {
        this.logger.info(
          `Extracted ${Object.keys(propertiesMetadata).length} template variables for ${selectedTemplate}`
        );
        return propertiesMetadata;
      } else {
        this.logger.debug(`No template variables found for ${selectedTemplate}`);
        return undefined;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        `Failed to extract template properties metadata`,
        error instanceof Error ? error : new Error(errorMessage)
      );
      return undefined;
    }
  }

  private generateTemplateSelectionGuidance(state: State): string {
    const templateOptionsJson = JSON.stringify(state.templateOptions, null, 2);

    return dedent`
      # Template Selection Guidance for ${state.platform}

      ## Task: Select the Best Template

      The following template options are available:

      \`\`\`json
      ${templateOptionsJson}
      \`\`\`

      Review the available templates and choose the template that best matches:
      - **Platform compatibility**: ${state.platform}
      - **Feature requirements**: General mobile app needs
      - **Use case alignment**: Record management, data display, CRUD operations
      - **Complexity level**: Appropriate for the user's requirements

      Each template includes:
      - **path**: The template identifier to use as the selectedTemplate value
      - **metadata**: Contains descriptive information about the template
    `;
  }
}
