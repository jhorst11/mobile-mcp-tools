/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../logging/logger.js';
import { GATHER_INPUT_TOOL, GatherInputWorkflowInput } from './metadata.js';
import { AbstractWorkflowTool } from '../../base/abstractWorkflowTool.js';

/**
 * Tool for gathering user input with flexible strategies.
 *
 * This tool provides guidance to the host LLM for collecting user input using different
 * interaction patterns: single property, multiple properties, choice selection, or confirmation.
 *
 * The tool returns instructions/guidance rather than formatted questions, allowing the LLM
 * to formulate natural, contextual questions while reducing tool call overhead through batching.
 */
export class SFMobileNativeGatherInputTool extends AbstractWorkflowTool<typeof GATHER_INPUT_TOOL> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, GATHER_INPUT_TOOL, 'SFMobileNativeGatherInputTool', logger);
  }

  public handleRequest = async (input: GatherInputWorkflowInput) => {
    try {
      const guidance = this.generateGuidanceForStrategy(input);
      return this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    } catch (error) {
      const toolError = error instanceof Error ? error : new Error('Unknown error occurred');
      this.logger.error('Error generating input guidance', toolError);
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error: ${toolError.message}`,
          },
        ],
      };
    }
  };

  /**
   * Generate guidance for the host LLM based on the input gathering strategy
   */
  private generateGuidanceForStrategy(input: GatherInputWorkflowInput): string {
    const { strategy, purpose, workflowContext } = input;

    let guidance = `# ROLE
You are a friendly and helpful conversational assistant helping a user configure their mobile application.

# TASK
`;

    switch (strategy.type) {
      case 'single':
        guidance += this.generateSinglePropertyGuidance(strategy, purpose);
        break;
      case 'multiple':
        guidance += this.generateMultiplePropertiesGuidance(strategy, purpose);
        break;
      case 'choice':
        guidance += this.generateChoiceSelectionGuidance(strategy, purpose);
        break;
      case 'confirmation':
        guidance += this.generateConfirmationGuidance(strategy, purpose);
        break;
    }

    guidance += this.generateCommonGuidance(workflowContext);

    return guidance;
  }

  private generateSinglePropertyGuidance(
    strategy: Extract<GatherInputWorkflowInput['strategy'], { type: 'single' }>,
    purpose: string
  ): string {
    const { property } = strategy;
    return `Ask the user for a single piece of information in a clear, polite way.

# CONTEXT
You need to ask the user for the value of the following property:
- Property Name: ${property.name}
- Friendly Name: ${property.friendlyName}
- Description: ${property.description}
- Purpose: ${purpose}
${property.examples?.length ? `- Examples: ${property.examples.join(', ')}` : ''}

# INSTRUCTIONS
1. Use the "Friendly Name" in your question
2. Your question should be polite and conversational
3. If examples are provided, include one as a helpful hint
4. Wait for the user's response before proceeding
`;
  }

  private generateMultiplePropertiesGuidance(
    strategy: Extract<GatherInputWorkflowInput['strategy'], { type: 'multiple' }>,
    purpose: string
  ): string {
    const { properties, groupLabel } = strategy;
    const propertiesList = properties
      .map(
        (prop, idx) => `
${idx + 1}. ${prop.friendlyName}
   - Description: ${prop.description}
   ${prop.examples?.length ? `- Examples: ${prop.examples.join(', ')}` : ''}`
      )
      .join('\n');

    return `Ask the user for multiple related pieces of information in a single, well-organized prompt.

# CONTEXT
Purpose: ${purpose}
${groupLabel ? `Group: ${groupLabel}` : ''}

You need to collect the following properties:
${propertiesList}

# INSTRUCTIONS
1. Present all properties in a clear, numbered or bulleted list
2. Make it clear the user can provide the information in any natural format
3. Explain you'll extract the relevant information from their response
4. Be encouraging - they don't need to match a specific format
5. Wait for their response with all (or as many as possible) of the values
`;
  }

  private generateChoiceSelectionGuidance(
    strategy: Extract<GatherInputWorkflowInput['strategy'], { type: 'choice' }>,
    purpose: string
  ): string {
    const { property, choices, allowCustom, defaultChoice } = strategy;
    const choicesList = choices
      .map(
        (choice, idx) => `
${idx + 1}. ${choice.label}${choice.label === defaultChoice ? ' (recommended)' : ''}
   ${choice.description ? `- ${choice.description}` : ''}
   - Value: ${JSON.stringify(choice.value)}`
      )
      .join('\n');

    return `Present a set of predefined choices to the user and let them select one.

# CONTEXT
You need to ask the user to select a value for: ${property.friendlyName}
- Description: ${property.description}
- Purpose: ${purpose}

Available choices:
${choicesList}

${allowCustom ? '- User can also provide their own custom value' : ''}
${defaultChoice ? `- Default/recommended choice: ${defaultChoice}` : ''}

# INSTRUCTIONS
1. Present the choices clearly, numbered or as a list
2. Highlight the recommended option if there is one
${allowCustom ? "3. Mention they can provide their own value if the choices don't fit" : ''}
${defaultChoice ? '4. Indicate they can press Enter to accept the default' : ''}
5. Wait for their selection or custom input
`;
  }

  private generateConfirmationGuidance(
    strategy: Extract<GatherInputWorkflowInput['strategy'], { type: 'confirmation' }>,
    purpose: string
  ): string {
    const { question, defaultValue } = strategy;

    return `Ask the user a yes/no question to confirm a decision.

# CONTEXT
Question context: ${purpose}
The specific question: ${question}
${defaultValue !== undefined ? `Default answer: ${defaultValue ? 'Yes' : 'No'}` : ''}

# INSTRUCTIONS
1. Ask the question clearly and conversationally
2. Make it clear this is a yes/no question
${defaultValue !== undefined ? '3. Indicate the default value (they can press Enter to accept it)' : ''}
4. Accept various forms of yes/no (yes, no, y, n, true, false, etc.)
5. Wait for their confirmation
`;
  }

  private generateCommonGuidance(workflowContext?: Record<string, unknown>): string {
    return `

# WORKFLOW CONTEXT
${
  workflowContext
    ? `
Additional context that may be relevant:
${JSON.stringify(workflowContext, null, 2)}
`
    : 'No additional workflow context provided.'
}

# OUTPUT FORMAT
After receiving the user's response:
- Extract the relevant property values from their natural language response
- Return them in the expected schema format with the following fields:
  - collectedProperties: Record of property name to extracted value
  - userProvidedText: The raw text the user provided
  - strategyUsed: The strategy type that was used
- Validate against any provided constraints
- If information is missing or unclear, ask follow-up questions naturally
`;
  }
}
