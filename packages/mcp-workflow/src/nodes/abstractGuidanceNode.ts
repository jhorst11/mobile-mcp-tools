/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { StateType, StateDefinition } from '@langchain/langgraph';
import { BaseNode } from './abstractBaseNode.js';
import { NodeGuidanceData } from '../common/metadata.js';
import { Logger, createComponentLogger } from '../logging/logger.js';
import { NodeExecutor, LangGraphNodeExecutor } from './toolExecutor.js';
import { executeNodeWithLogging } from '../utils/toolExecutionUtils.js';

/**
 * Abstract base class for nodes that provide guidance to the orchestrator
 * Replaces AbstractToolNode - no longer invokes separate tools
 *
 * This is the foundation of the new single-orchestrator architecture where
 * nodes generate guidance prompts directly instead of invoking separate MCP tools.
 *
 * @template TState - The state type for the workflow (defaults to StateType<StateDefinition>)
 *
 * @example
 * ```typescript
 * class TemplateSelectionNode extends AbstractGuidanceNode<State> {
 *   execute = (state: State): Partial<State> => {
 *     const guidanceData: NodeGuidanceData = {
 *       nodeId: 'templateSelection',
 *       taskPrompt: this.createTemplateSelectionPrompt(),
 *       taskInput: { platform: state.platform, templateDetails: state.templateDetails },
 *       resultSchema: z.object({ selectedTemplate: z.string() }),
 *     };
 *     const result = this.executeWithGuidance(guidanceData);
 *     return { selectedTemplate: result.selectedTemplate };
 *   };
 *
 *   private createTemplateSelectionPrompt(): string {
 *     return `Select the most appropriate template...`;
 *   }
 * }
 * ```
 */
export abstract class AbstractGuidanceNode<
  TState extends StateType<StateDefinition>,
> extends BaseNode<TState> {
  protected readonly logger: Logger;
  protected readonly componentName: string;
  protected readonly nodeExecutor: NodeExecutor;

  constructor(name: string, nodeExecutor?: NodeExecutor, logger?: Logger) {
    super(name);
    this.componentName = `WorkflowNode:${this.constructor.name}`;
    this.logger = logger ?? createComponentLogger(this.componentName);
    this.nodeExecutor = nodeExecutor ?? new LangGraphNodeExecutor();
  }

  /**
   * Protected method to execute node with guidance, logging, and validation.
   *
   * By default, results are validated using the provided Zod schema's parse method.
   * Pass a custom validator function to implement additional validation logic.
   *
   * This method uses the common executeNodeWithLogging function to ensure
   * consistent behavior across all node executions in the codebase.
   *
   * @param guidanceData The node guidance data containing task prompt, input, and result schema
   * @param validator Optional custom validator function
   * @returns The validated result from the node execution
   */
  protected executeWithGuidance<TResultSchema extends z.ZodObject<z.ZodRawShape>>(
    guidanceData: NodeGuidanceData,
    validator?: (result: unknown, schema: TResultSchema) => z.infer<TResultSchema>
  ): z.infer<TResultSchema> {
    return executeNodeWithLogging(this.nodeExecutor, this.logger, guidanceData, validator);
  }
}
