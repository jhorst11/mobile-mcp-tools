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
import { State } from '../metadata.js';

export class TemplateCandidateSelectionNode extends AbstractGuidanceNode<State> {
  protected readonly logger: Logger;

  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('selectTemplateCandidates', nodeExecutor, logger);
    this.logger = logger ?? createComponentLogger('TemplateCandidateSelectionNode');
  }

  execute = (state: State): Partial<State> => {
    // Check if we already have template candidates (e.g., when resuming from interrupt)
    // This prevents re-executing when LangGraph re-runs the node after resume
    if (state.templateCandidates && state.templateCandidates.length > 0) {
      this.logger.debug('Template candidates already exist in state, skipping candidate selection');
      return {}; // Return empty update to avoid overwriting existing state
    }

    // Validate that template options are available in state
    if (!state.templateOptions) {
      return {
        workflowFatalErrorMessages: [
          'Template options not found in state. TemplateOptionsFetchNode must run before TemplateCandidateSelectionNode.',
        ],
      };
    }

    // Create guidance data (new architecture - no tool invocation)
    const guidanceData: NodeGuidanceData = {
      nodeId: 'templateCandidateSelection',
      taskPrompt: this.generateTemplateDiscoveryGuidance(state.platform, state.templateOptions),
      taskInput: {
        platform: state.platform,
        templateOptions: state.templateOptions,
      },
      resultSchema: z.object({
        templateCandidates: z.array(z.string()).describe('Array of template paths/names'),
      }),
      metadata: {
        nodeName: this.name,
        description: 'Identify promising template candidates',
      },
    };

    const validatedResult = this.executeWithGuidance(guidanceData);

    if (!validatedResult.templateCandidates || validatedResult.templateCandidates.length === 0) {
      return {
        workflowFatalErrorMessages: [
          'Template candidate selection did not return any template candidates',
        ],
      };
    }

    return {
      templateCandidates: validatedResult.templateCandidates,
    };
  };

  /**
   * Generate the task prompt for template discovery
   * This is the guidance that was previously in the MCP tool
   */
  private generateTemplateDiscoveryGuidance(platform: string, templateOptions: unknown): string {
    const templateOptionsJson = JSON.stringify(templateOptions, null, 2);

    return dedent`
      # Template Discovery Guidance for ${platform}

      ## Task: Identify Promising Template Candidates

      The following template options have been discovered for ${platform}:

      \`\`\`json
      ${templateOptionsJson}
      \`\`\`

      Inspect the JSON above to identify templates that best match the user's requirements. Each template includes:
      - path: the relative path to the template from the templates source
      - description: the description of the template
      - features: the features of the template
      - useCase: the use case of the template
      - complexity: the complexity of the template
      - customizationPoints: the customization points of the template

      Filter the templates to the most promising candidates (typically 1-3 templates). Prioritize templates that match multiple keywords and have comprehensive documentation.

      Return a list of template paths/names as candidates. Use the template's \`path\` field from the JSON above as the candidate value.

      Return your result in this format:

      \`\`\`json
      {
        "templateCandidates": ["<TEMPLATE_PATH_1>", "<TEMPLATE_PATH_2>", ...]
      }
      \`\`\`

      You MUST return at least one candidate. Return multiple candidates if several templates seem equally promising.
    `;
  }
}
