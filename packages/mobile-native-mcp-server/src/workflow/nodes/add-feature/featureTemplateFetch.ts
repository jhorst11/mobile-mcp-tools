/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../../add-feature-metadata.js';
import { TEMPLATE_LIST_SCHEMA, TemplateListOutput } from '../../../common/schemas.js';
import { listTemplates, type TemplateDescriptor } from '@salesforce/magen-templates';

/**
 * Fetches available feature templates that match the project's platform
 * Feature templates are templates that extend other templates (layered templates)
 * and can be used to add features to existing projects
 */
export class FeatureTemplateFetchNode extends BaseNode<AddFeatureState> {
  protected readonly logger: Logger;

  constructor(logger?: Logger) {
    super('fetchFeatureTemplates');
    this.logger = logger ?? createComponentLogger('FeatureTemplateFetchNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    // Check if we already have feature template options (e.g., when resuming from interrupt)
    if (state.featureTemplateOptions) {
      this.logger.debug('Feature template options already exist in state, skipping fetch');
      return {}; // Return empty update to avoid overwriting existing state
    }

    try {
      const platformLower = state.platform.toLowerCase() as 'ios' | 'android';

      this.logger.debug(`Fetching feature template options for platform: ${state.platform}`, {
        platform: state.platform,
      });

      // List all templates for the platform
      const allTemplates = listTemplates({ platform: platformLower });

      // Filter to only feature templates (templates that extend other templates)
      // Feature templates have an 'extends' property and a layer.patch file
      const featureTemplates = allTemplates.filter(template => {
        // Check if template extends another template
        return template.extends?.template !== undefined;
      });

      this.logger.debug(`Found ${featureTemplates.length} feature templates`, {
        templateNames: featureTemplates.map(t => t.name),
      });

      // Transform to our internal format
      const featureTemplateOptions = this.transformToTemplateListOutput(featureTemplates);

      this.logger.info(
        `Fetched ${featureTemplateOptions.templates.length} feature template options`
      );

      return {
        featureTemplateOptions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      const errorObj = error instanceof Error ? error : new Error(errorMessage);
      this.logger.error(`Failed to fetch feature template options`, errorObj);
      return {
        workflowFatalErrorMessages: [`Failed to fetch feature template options: ${errorMessage}`],
      };
    }
  };

  /**
   * Transforms magen-templates TemplateDescriptor[] to our internal TemplateListOutput format
   */
  private transformToTemplateListOutput(templates: TemplateDescriptor[]): TemplateListOutput {
    const templateEntries = templates.map(descriptor => ({
      // Use the template name@version as the path identifier
      path: `${descriptor.name}@${descriptor.version}`,
      metadata: descriptor,
      descriptor, // Include for compatibility
    }));

    const result = {
      templates: templateEntries,
    };

    // Validate the output format
    try {
      return TEMPLATE_LIST_SCHEMA.parse(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      throw new Error(`Failed to validate template list output: ${errorMessage}`);
    }
  }
}
