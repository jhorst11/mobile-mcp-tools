/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import { Logger } from '@salesforce/magen-mcp-workflow';
import {
  ADD_FEATURE_TEMPLATE_SELECTION_TOOL,
  AddFeatureTemplateSelectionWorkflowInput,
} from './metadata.js';
import { AbstractNativeAddFeatureTool } from '../../base/abstractNativeAddFeatureTool.js';

export class SFMobileNativeAddFeatureTemplateSelectionTool extends AbstractNativeAddFeatureTool<
  typeof ADD_FEATURE_TEMPLATE_SELECTION_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, ADD_FEATURE_TEMPLATE_SELECTION_TOOL, 'AddFeatureTemplateSelectionTool', logger);
  }

  public handleRequest = async (input: AddFeatureTemplateSelectionWorkflowInput) => {
    try {
      const guidance = this.generateTemplateSelectionGuidance(input);

      return this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          },
        ],
      };
    }
  };

  private generateTemplateSelectionGuidance(
    input: AddFeatureTemplateSelectionWorkflowInput
  ): string {
    const templateOptionsJson = JSON.stringify(input.templateOptions, null, 2);

    return dedent`
      # Feature Template Selection Guidance for ${input.platform}

      ## Task: Select the Best Feature Template

      The following feature template options are available:

      \`\`\`json
      ${templateOptionsJson}
      \`\`\`

      Review the available feature templates and choose the template that best matches:
      - **Platform compatibility**: ${input.platform}
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
