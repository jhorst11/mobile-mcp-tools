/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseNode, Logger, createComponentLogger } from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../../add-feature-metadata.js';
import { TemplatePropertiesMetadata } from '../../metadata.js';
import { findTemplate } from '@salesforce/magen-templates';

/**
 * Extracts template properties metadata from the selected feature template.
 * This node reads the template's variables.json to determine what properties
 * need to be collected from the user.
 */
export class FeatureTemplatePropertiesExtractionNode extends BaseNode<AddFeatureState> {
  protected readonly logger: Logger;

  constructor(logger?: Logger) {
    super('extractFeatureTemplateProperties');
    this.logger = logger ?? createComponentLogger('FeatureTemplatePropertiesExtractionNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    if (!state.selectedFeatureTemplate) {
      this.logger.warn('No feature template selected, skipping template properties extraction');
      return {};
    }

    try {
      const templatePropertiesMetadata = this.extractTemplatePropertiesMetadata(
        state.selectedFeatureTemplate,
        state.featureTemplateOptions
      );

      if (templatePropertiesMetadata) {
        this.logger.info(
          `Extracted ${Object.keys(templatePropertiesMetadata).length} template variables for ${state.selectedFeatureTemplate}`
        );
      } else {
        this.logger.debug(`No template variables found for ${state.selectedFeatureTemplate}`);
      }

      return {
        templatePropertiesMetadata: templatePropertiesMetadata || {},
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error('Failed to extract template properties metadata', error as Error);
      return {
        workflowFatalErrorMessages: [
          `Failed to extract template properties metadata: ${errorMessage}`,
        ],
      };
    }
  };

  private extractTemplatePropertiesMetadata(
    selectedTemplate: string,
    templateOptions: AddFeatureState['featureTemplateOptions']
  ): TemplatePropertiesMetadata | undefined {
    try {
      // Find the selected template in the templates array
      const template = templateOptions?.templates.find(t => t.path === selectedTemplate);
      if (!template) {
        // Try to find template using magen-templates findTemplate
        const templateInfo = findTemplate(selectedTemplate);
        if (!templateInfo) {
          this.logger.warn(`Template not found: ${selectedTemplate}`);
          return undefined;
        }

        // Access the template descriptor
        const descriptor = templateInfo.descriptor;
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
        const propertiesMetadata: TemplatePropertiesMetadata = {};

        for (const variable of variables) {
          propertiesMetadata[variable.name] = {
            value: variable.default !== undefined ? String(variable.default) : undefined,
            required: variable.required,
            description: variable.description || '',
          };
        }

        return Object.keys(propertiesMetadata).length > 0 ? propertiesMetadata : undefined;
      }

      // Access the template descriptor (from templateOptions format)
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
      const propertiesMetadata: TemplatePropertiesMetadata = {};

      for (const variable of variables) {
        propertiesMetadata[variable.name] = {
          value: variable.default !== undefined ? String(variable.default) : undefined,
          required: variable.required,
          description: variable.description || '',
        };
      }

      return Object.keys(propertiesMetadata).length > 0 ? propertiesMetadata : undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error('Error extracting template properties metadata', error as Error);
      throw new Error(`Failed to extract template properties metadata: ${errorMessage}`);
    }
  }
}
