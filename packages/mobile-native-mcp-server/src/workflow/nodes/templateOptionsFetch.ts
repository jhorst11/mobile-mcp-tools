/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import { TEMPLATE_LIST_SCHEMA, TemplateListOutput } from '../../common/schemas.js';
import { listTemplates, type TemplateDescriptor } from '@salesforce/magen-templates';

export class TemplateOptionsFetchNode extends BaseNode<State> {
  protected readonly logger: Logger;

  constructor(logger?: Logger) {
    super('fetchTemplateOptions');
    this.logger = logger ?? createComponentLogger('TemplateOptionsFetchNode');
  }

  execute = (state: State): Partial<State> => {
    // Check if we already have template options (e.g., when resuming from interrupt)
    // This prevents re-executing expensive operations when LangGraph re-runs the node after resume
    if (state.templateOptions) {
      this.logger.debug('Template options already exist in state, skipping fetch');
      return {}; // Return empty update to avoid overwriting existing state
    }

    try {
      // Use magen-templates API to discover templates
      // The magen-templates package handles its own template discovery from package templates/
      const platformLower = state.platform.toLowerCase() as 'ios' | 'android';

      this.logger.debug(`Fetching template options for platform: ${state.platform}`, {
        platform: state.platform,
      });

      // List templates filtered by platform
      const templates = listTemplates({ platform: platformLower });

      this.logger.debug(`Found ${templates.length} templates`, {
        templateNames: templates.map(t => t.name),
      });

      // Transform magen-templates format to our internal format
      const templateOptions = this.transformToTemplateListOutput(templates);

      this.logger.info(
        `Fetched template options for ${templateOptions.templates.length} templates`
      );
      return {
        templateOptions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      const errorObj = error instanceof Error ? error : new Error(errorMessage);
      this.logger.error(`Failed to fetch template options`, errorObj);
      return {
        workflowFatalErrorMessages: [`Failed to fetch template options: ${errorMessage}`],
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
