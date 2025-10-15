/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseNode } from './abstractBaseNode.js';
import { State } from '../metadata.js';
import { ToolExecutor, LangGraphToolExecutor } from './toolExecutor.js';
import { Logger, createComponentLogger } from '../../logging/logger.js';
import {
  InputRequestContext,
  InputResponse,
  InputGatheringStrategy,
  PropertyDefinition,
} from '../inputGathering/types.js';
import { PropertyMetadataCollection, PropertyMetadata } from '../../common/propertyMetadata.js';
import {
  GATHER_INPUT_TOOL,
  GatherInputWorkflowInput,
} from '../../tools/plan/sfmobile-native-gather-input/metadata.js';
import { MCPToolInvocationData } from '../../common/metadata.js';
import z from 'zod';

/**
 * Input Orchestrator Node - Orchestrates flexible user input gathering
 *
 * This node replaces the previous multi-node loop (UserInputExtraction → GenerateQuestion → GetUserInput)
 * with a single, flexible orchestrator that supports multiple interaction strategies.
 *
 * Key features:
 * - Automatic strategy selection based on context
 * - Support for single, multiple, choice, and confirmation strategies
 * - Batch property collection to reduce tool calls
 * - Maintains LLM-mediated question generation for conversational quality
 */
export class InputOrchestratorNode extends BaseNode {
  private readonly toolExecutor: ToolExecutor;
  private readonly logger: Logger;

  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('inputOrchestrator');
    this.toolExecutor = toolExecutor ?? new LangGraphToolExecutor();
    this.logger = logger ?? createComponentLogger('InputOrchestratorNode');
  }

  /**
   * Executes the input gathering orchestration
   */
  execute = (state: State): Partial<State> => {
    this.logger.info('Starting input orchestration');

    // Get or build the input request context
    const requestContext =
      (state.inputGatheringContext as InputRequestContext | undefined) ??
      this.buildDefaultContext(state);

    // Determine strategy if not provided
    const strategy = requestContext.strategy ?? this.selectOptimalStrategy(requestContext);

    this.logger.debug('Using strategy', { strategyType: strategy.type });

    // Execute the input gathering
    const response = this.executeInputGathering(requestContext, strategy, state);

    // Update state with results
    return {
      inputGatheringContext: requestContext,
      inputGatheringResponse: response,
      inputGatheringRound: (state.inputGatheringRound ?? 0) + 1,
      // Merge collected properties into state
      ...response.collectedProperties,
    };
  };

  /**
   * Build default context from workflow state
   * Note: This is a placeholder for when inputGatheringContext is not provided
   */
  private buildDefaultContext(_state: State): InputRequestContext {
    // In production, the context should be provided by the caller
    // This is just a fallback that won't actually gather any properties
    return {
      properties: {},
      purpose: 'Collecting required information for workflow',
      strategy: {
        type: 'multiple',
        propertyNames: [],
      },
      allowPartial: true,
      maxRounds: 5,
    };
  }

  /**
   * Select optimal strategy based on context
   */
  private selectOptimalStrategy(context: InputRequestContext): InputGatheringStrategy {
    const propertyNames = Object.keys(context.properties);
    const propertyCount = propertyNames.length;

    // Single property - focus mode
    if (propertyCount === 1) {
      return {
        type: 'single',
        propertyName: propertyNames[0],
      };
    }

    // Check if any property has predefined choices in its metadata
    for (const [propertyName, metadata] of Object.entries(context.properties)) {
      if (this.hasEnumType(metadata)) {
        const choices = this.extractChoicesFromEnum(metadata);
        if (choices.length > 0) {
          return {
            type: 'choice',
            propertyName,
            choices,
            allowCustom: false,
          };
        }
      }
    }

    // Default: collect multiple properties together
    return {
      type: 'multiple',
      propertyNames,
      groupLabel: context.purpose,
    };
  }

  /**
   * Execute input gathering with the selected strategy
   */
  private executeInputGathering(
    context: InputRequestContext,
    strategy: InputGatheringStrategy,
    state: State
  ): InputResponse {
    // Prepare tool input based on strategy
    const toolInput = this.prepareToolInput(context, strategy, state);

    // Execute the gather input tool
    const toolResult = this.toolExecutor.execute(toolInput);

    // Parse and validate the result
    const response = this.parseToolResult(toolResult, context);

    return response;
  }

  /**
   * Prepare tool input from context and strategy
   */
  private prepareToolInput(
    context: InputRequestContext,
    strategy: InputGatheringStrategy,
    state: State
  ): MCPToolInvocationData<typeof GATHER_INPUT_TOOL.inputSchema> {
    // Convert strategy to tool-compatible format
    const toolStrategy = this.convertStrategyForTool(strategy, context.properties);

    const input: GatherInputWorkflowInput = {
      strategy: toolStrategy,
      purpose: context.purpose,
      workflowContext: context.workflowContext ?? this.extractRelevantContext(state),
      workflowStateData:
        state.workflowStateData && 'thread_id' in state.workflowStateData
          ? (state.workflowStateData as { thread_id: string })
          : { thread_id: 'unknown' },
    };

    return {
      llmMetadata: {
        name: GATHER_INPUT_TOOL.toolId,
        description: GATHER_INPUT_TOOL.description,
        inputSchema: GATHER_INPUT_TOOL.inputSchema,
      },
      input,
    };
  }

  /**
   * Convert internal strategy to tool-compatible format
   */
  private convertStrategyForTool(
    strategy: InputGatheringStrategy,
    properties: PropertyMetadataCollection
  ): GatherInputWorkflowInput['strategy'] {
    switch (strategy.type) {
      case 'single': {
        const property = properties[strategy.propertyName];
        return {
          type: 'single',
          property: this.convertPropertyToDefinition(strategy.propertyName, property),
        };
      }

      case 'multiple': {
        return {
          type: 'multiple',
          properties: strategy.propertyNames.map(name =>
            this.convertPropertyToDefinition(name, properties[name])
          ),
          groupLabel: strategy.groupLabel,
        };
      }

      case 'choice': {
        const property = properties[strategy.propertyName];
        return {
          type: 'choice',
          property: this.convertPropertyToDefinition(strategy.propertyName, property),
          choices: strategy.choices,
          allowCustom: strategy.allowCustom,
          defaultChoice: strategy.defaultChoice,
        };
      }

      case 'confirmation': {
        return {
          type: 'confirmation',
          property: {
            name: strategy.propertyName,
            friendlyName: properties[strategy.propertyName]?.friendlyName ?? strategy.propertyName,
          },
          question: strategy.question,
          defaultValue: strategy.defaultValue,
        };
      }
    }
  }

  /**
   * Convert PropertyMetadata to PropertyDefinition for tool
   */
  private convertPropertyToDefinition(
    name: string,
    metadata: PropertyMetadata
  ): PropertyDefinition {
    return {
      name,
      friendlyName: metadata.friendlyName,
      description: metadata.description,
      examples: this.extractExamplesFromMetadata(metadata),
    };
  }

  /**
   * Parse tool result into InputResponse
   */
  private parseToolResult(toolResult: unknown, context: InputRequestContext): InputResponse {
    try {
      // The tool result should conform to GATHER_INPUT_WORKFLOW_RESULT_SCHEMA
      const parsed = GATHER_INPUT_TOOL.resultSchema.parse(toolResult);

      const collectedPropertyNames = Object.keys(parsed.collectedProperties);
      const requiredPropertyNames = Object.keys(context.properties);
      const missingProperties = requiredPropertyNames.filter(
        name => !collectedPropertyNames.includes(name)
      );

      return {
        collectedProperties: parsed.collectedProperties,
        missingProperties,
        userCancelled: false,
        roundsUsed: 1,
        complete: missingProperties.length === 0,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Failed to parse tool result', err);
      return {
        collectedProperties: {},
        missingProperties: Object.keys(context.properties),
        userCancelled: false,
        roundsUsed: 1,
        complete: false,
      };
    }
  }

  /**
   * Extract relevant context from state for prompts
   */
  private extractRelevantContext(state: State): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    // Include any already-collected workflow properties
    if (state.platform) context.platform = state.platform;
    if (state.projectName) context.projectName = state.projectName;
    if (state.packageName) context.packageName = state.packageName;
    if (state.organization) context.organization = state.organization;

    return context;
  }

  /**
   * Check if a property has enum type
   */
  private hasEnumType(metadata: PropertyMetadata): boolean {
    return metadata.zodType instanceof z.ZodEnum;
  }

  /**
   * Extract choices from enum type
   */
  private extractChoicesFromEnum(
    metadata: PropertyMetadata
  ): Array<{ label: string; value: unknown }> {
    if (metadata.zodType instanceof z.ZodEnum) {
      const values = metadata.zodType.options;
      return values.map((value: string) => ({
        label: value,
        value,
      }));
    }
    return [];
  }

  /**
   * Extract examples from metadata
   */
  private extractExamplesFromMetadata(_metadata: PropertyMetadata): string[] | undefined {
    // In the future, we could add an examples field to PropertyMetadata
    // For now, return undefined
    return undefined;
  }
}
