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
 * Abstract base class for nodes that provide direct guidance to the LLM
 *
 * This replaces AbstractToolNode for nodes that embed guidance directly rather than
 * invoking separate MCP tools. Guidance is provided via NodeGuidanceData and handled
 * directly by the orchestrator.
 *
 * @template TState - The state type for the workflow (defaults to StateType<StateDefinition>)
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
   * Protected method to execute guidance with logging and validation.
   *
   * By default, results are validated using the provided Zod schema's parse method.
   * Pass a custom validator function to implement additional validation logic.
   *
   * This method uses the common toolExecutionUtils.executeNodeWithLogging function
   * to ensure consistent behavior across all guidance executions in the codebase.
   *
   * @param guidanceData The guidance data to pass to the node executor
   * @param validator Optional custom validator function
   * @returns The validated result from the guidance execution
   */
  protected executeWithGuidance<TResultSchema extends z.ZodObject<z.ZodRawShape>>(
    guidanceData: NodeGuidanceData,
    validator?: (result: unknown, schema: TResultSchema) => z.infer<TResultSchema>
  ): z.infer<TResultSchema> {
    return executeNodeWithLogging(
      this.nodeExecutor,
      this.logger,
      guidanceData,
      validator
    );
  }
}


