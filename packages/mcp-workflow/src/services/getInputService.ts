/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { NodeExecutor, ToolExecutor } from '../nodes/toolExecutor.js';
import { AbstractService } from './abstractService.js';
import {
  createGetInputMetadata,
  GET_INPUT_WORKFLOW_INPUT_SCHEMA,
  GET_INPUT_WORKFLOW_RESULT_SCHEMA,
} from '../tools/utilities/index.js';
import { Logger } from '../logging/logger.js';
import { MCPToolInvocationData, NodeGuidanceData } from '../common/metadata.js';

export interface GetInputProperty {
  /** Property name to be collected */
  readonly propertyName: string;

  /** Human-readable name for display */
  readonly friendlyName: string;

  /** Detailed description for LLM-based extraction */
  readonly description: string;

  /** Optional reason why the property is unfulfilled */
  readonly reason?: string;
}

/**
 * Provider interface for user input service.
 * This interface allows for dependency injection and testing.
 */
export interface GetInputServiceProvider {
  /**
   * Solicits user input with a given question.
   *
   * @param question - The question to ask the user
   * @returns The user's response (can be any type)
   */
  getInput(unfulfilledProperties: GetInputProperty[]): unknown;
}

/**
 * Service for getting user input for a given question.
 *
 * This service extends AbstractService to leverage common tool execution
 * patterns including standardized logging and result validation.
 *
 * Now uses the new guidance-based architecture instead of separate tool invocation.
 */
export class GetInputService extends AbstractService implements GetInputServiceProvider {
  /**
   * Creates a new GetInputService.
   *
   * @param nodeExecutor - Node executor for invoking with guidance (injectable for testing)
   * @param logger - Logger instance (injectable for testing)
   */
  constructor(
    private readonly toolId: string,
    nodeExecutor?: NodeExecutor,
    logger?: Logger
  ) {
    super('GetInputService', nodeExecutor, logger);
  }

  getInput(unfulfilledProperties: GetInputProperty[]): unknown {
    this.logger.debug('Starting input request with properties', {
      unfulfilledProperties,
    });

    // Create guidance data (new architecture)
    const guidanceData: NodeGuidanceData = {
      nodeId: 'getUserInput',
      taskPrompt: this.generateInputPrompt(unfulfilledProperties),
      taskInput: {
        propertiesRequiringInput: unfulfilledProperties,
      },
      resultSchema: z.object({
        userUtterance: z.unknown().describe('The user response containing the requested input'),
      }),
      metadata: {
        nodeName: 'getUserInput',
        description: 'Collect required input from the user',
      },
    };

    // Execute with guidance and validation
    const validatedResult = this.executeNodeWithLogging(
      guidanceData,
      GET_INPUT_WORKFLOW_RESULT_SCHEMA
    );

    return validatedResult.userUtterance;
  }

  /**
   * Generate the task prompt for input collection
   * This is the guidance that was previously in the GetInputTool
   */
  private generateInputPrompt(unfulfilledProperties: GetInputProperty[]): string {
    const propertiesDescription = this.formatPropertiesDescription(unfulfilledProperties);

    return `
# ROLE
You are an input gathering assistant responsible for collecting required information
from the user.

# TASK
Request the following information from the user and wait for their response:

${propertiesDescription}

# INSTRUCTIONS
1. Present a clear, friendly prompt listing each required property
2. Explain what information is needed using the property descriptions
3. **CRITICAL**: WAIT for the user to provide their response
4. After receiving the user's response, format it according to the schema
5. Return the formatted result to the orchestrator

# IMPORTANT
You CANNOT proceed until the user provides their input. This is a blocking operation.
`;
  }

  private formatPropertiesDescription(properties: GetInputProperty[]): string {
    return properties
      .map(
        (prop, index) => `
${index + 1}. **${prop.friendlyName}**
   - Description: ${prop.description}
   ${prop.reason ? `- Note: ${prop.reason}` : ''}`
      )
      .join('\n');
  }
}

/**
 * @deprecated Use GetInputService with NodeExecutor. This is kept for backward compatibility.
 */
export class LegacyGetInputService extends AbstractService implements GetInputServiceProvider {
  constructor(
    private readonly toolId: string,
    toolExecutor?: ToolExecutor,
    logger?: Logger
  ) {
    super('LegacyGetInputService', toolExecutor, logger);
  }

  getInput(unfulfilledProperties: GetInputProperty[]): unknown {
    this.logger.debug('Starting input request with properties (legacy)', {
      unfulfilledProperties,
    });

    const metadata = createGetInputMetadata(this.toolId);
    const toolInvocationData: MCPToolInvocationData<typeof GET_INPUT_WORKFLOW_INPUT_SCHEMA> = {
      llmMetadata: {
        name: metadata.toolId,
        description: metadata.description,
        inputSchema: metadata.inputSchema,
      },
      input: {
        propertiesRequiringInput: unfulfilledProperties,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      GET_INPUT_WORKFLOW_RESULT_SCHEMA
    );

    return validatedResult.userUtterance;
  }
}
