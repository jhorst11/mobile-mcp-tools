/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import dedent from 'dedent';
import {
  AbstractGuidanceNode,
  Logger,
  NodeExecutor,
  NodeGuidanceData,
  createComponentLogger,
} from '@salesforce/magen-mcp-workflow';
import { State, TemplatePropertiesMetadata } from '../metadata.js';

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

    if (!state.templateDetails || Object.keys(state.templateDetails).length === 0) {
      return {
        workflowFatalErrorMessages: ['No template details available for selection'],
      };
    }

    // Create guidance data (new architecture - no tool invocation)
    const guidanceData: NodeGuidanceData = {
      nodeId: 'templateSelection',
      taskPrompt: this.generateTemplateSelectionGuidance(state.platform, state.templateDetails),
      taskInput: {
        platform: state.platform,
        templateDetails: state.templateDetails,
      },
      resultSchema: z.object({
        selectedTemplate: z.string().describe('The name/path of the selected template'),
      }),
      metadata: {
        nodeName: this.name,
        description: 'Select the most appropriate template for the mobile app',
      },
    };

    const validatedResult = this.executeWithGuidance(guidanceData);

    if (!validatedResult.selectedTemplate) {
      return {
        workflowFatalErrorMessages: ['Template selection did not return a selectedTemplate'],
      };
    }

    // Extract template properties metadata from the selected template's details
    const templatePropertiesMetadata = this.extractTemplatePropertiesMetadata(
      validatedResult.selectedTemplate,
      state.templateDetails
    );

    return {
      selectedTemplate: validatedResult.selectedTemplate,
      templatePropertiesMetadata,
    };
  };

  /**
   * Generate the task prompt for template selection
   * This is the guidance that was previously in the MCP tool
   */
  private generateTemplateSelectionGuidance(
    platform: string,
    templateDetails: Record<string, unknown>
  ): string {
    const templateDetailsJson = JSON.stringify(templateDetails, null, 2);

    return dedent`
      # Template Selection Guidance for ${platform}

      ## Task: Select the Best Template

      The following detailed template information has been fetched for the candidates:

      \`\`\`json
      ${templateDetailsJson}
      \`\`\`

      Review the detailed information for each template candidate and choose the template that best matches:
      - **Platform compatibility**: ${platform}
      - **Feature requirements**: General mobile app needs
      - **Use case alignment**: Record management, data display, CRUD operations
      - **Complexity level**: Appropriate for the user's requirements

      Use the template path/name (the key in the templateDetails object) as the selectedTemplate value.
    `;
  }

  private extractTemplatePropertiesMetadata(
    selectedTemplate: string,
    templateDetails: Record<string, unknown>
  ): TemplatePropertiesMetadata | undefined {
    try {
      const templateDetail = templateDetails[selectedTemplate];
      if (!templateDetail || typeof templateDetail !== 'object') {
        this.logger.warn(`Template detail not found or invalid for ${selectedTemplate}`);
        return undefined;
      }

      // Navigate to properties.templatePrerequisites.templateProperties
      const detail = templateDetail as Record<string, unknown>;
      const properties = detail.properties as Record<string, unknown> | undefined;
      if (!properties) {
        this.logger.debug(`No properties found for template ${selectedTemplate}`);
        return undefined;
      }

      const templatePrerequisites = properties.templatePrerequisites as
        | Record<string, unknown>
        | undefined;
      if (!templatePrerequisites) {
        this.logger.debug(`No templatePrerequisites found for template ${selectedTemplate}`);
        return undefined;
      }

      const templateProperties = templatePrerequisites.templateProperties as
        | Record<string, unknown>
        | undefined;
      if (!templateProperties || Object.keys(templateProperties).length === 0) {
        this.logger.debug(`No templateProperties found for template ${selectedTemplate}`);
        return undefined;
      }

      // Convert template properties to TemplatePropertiesMetadata format
      const metadata: TemplatePropertiesMetadata = {};

      for (const [propertyName, propertyValue] of Object.entries(templateProperties)) {
        // Property can be a simple value or an object with value, required, description
        if (
          typeof propertyValue === 'object' &&
          propertyValue !== null &&
          !Array.isArray(propertyValue)
        ) {
          const propObj = propertyValue as Record<string, unknown>;
          metadata[propertyName] = {
            value: propObj.value !== undefined ? String(propObj.value) : undefined,
            required: typeof propObj.required === 'boolean' ? propObj.required : false,
            description: typeof propObj.description === 'string' ? propObj.description : '',
          };
        } else {
          // Simple value - treat as optional with empty description
          metadata[propertyName] = {
            value: propertyValue !== undefined ? String(propertyValue) : undefined,
            required: false,
            description: '',
          };
        }
      }

      this.logger.info(
        `Extracted ${Object.keys(metadata).length} template properties for ${selectedTemplate}`
      );
      return Object.keys(metadata).length > 0 ? metadata : undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        `Failed to extract template properties metadata`,
        error instanceof Error ? error : new Error(errorMessage)
      );
      return undefined;
    }
  }
}
