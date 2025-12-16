/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { MCPToolInvocationData, NodeGuidanceData } from '../common/metadata.js';
import { Logger } from '../logging/logger.js';
import { ToolExecutor, NodeExecutor } from '../nodes/toolExecutor.js';

/**
 * Executes a node with logging and validation.
 *
 * This utility provides a standardized pattern for node execution that includes:
 * - Pre-execution logging of guidance data
 * - Node execution via the provided executor
 * - Post-execution logging of results
 * - Result validation using Zod schemas
 * - Optional custom validation logic
 *
 * This function is used by workflow nodes (via AbstractGuidanceNode) to ensure
 * consistent guidance execution patterns across the codebase.
 *
 * @param nodeExecutor - The executor to use for running the node
 * @param logger - Logger instance for recording execution details
 * @param guidanceData - The guidance data including task prompt and input
 * @param validator - Optional custom validator function for additional validation logic
 * @returns The validated result from the node execution
 *
 * @throws {z.ZodError} If the result does not match the schema (when using default validation)
 * @throws {Error} If node execution fails or custom validator throws
 *
 * @example
 * // Basic usage with schema validation
 * const result = executeNodeWithLogging(
 *   nodeExecutor,
 *   logger,
 *   guidanceData
 * );
 *
 * @example
 * // With custom validator
 * const result = executeNodeWithLogging(
 *   nodeExecutor,
 *   logger,
 *   guidanceData,
 *   (result, schema) => {
 *     const validated = schema.parse(result);
 *     // Additional custom validation or transformation
 *     if (validated.someField < 0) {
 *       throw new Error('Value must be positive');
 *     }
 *     return validated;
 *   }
 * );
 */
export function executeNodeWithLogging<TResultSchema extends z.ZodObject<z.ZodRawShape>>(
  nodeExecutor: NodeExecutor,
  logger: Logger,
  guidanceData: NodeGuidanceData,
  validator?: (result: unknown, schema: TResultSchema) => z.infer<TResultSchema>
): z.infer<TResultSchema> {
  logger.debug('Node guidance data (pre-execution)', { guidanceData });

  const result = nodeExecutor.execute(guidanceData);

  logger.debug('Node execution result (post-execution)', { result });

  if (validator) {
    return validator(result, guidanceData.resultSchema as TResultSchema);
  } else {
    const validatedResult = (guidanceData.resultSchema as TResultSchema).parse(result);
    logger.debug('Validated node result', { validatedResult });
    return validatedResult;
  }
}

/**
 * Executes a tool with logging and validation.
 *
 * This utility provides a standardized pattern for tool execution that includes:
 * - Pre-execution logging of tool invocation data
 * - Tool execution via the provided executor
 * - Post-execution logging of results
 * - Result validation using Zod schemas
 * - Optional custom validation logic
 *
 * This function is used by services (via AbstractService) that invoke actual MCP tools
 * (e.g., get-input, input-extraction) to ensure consistent tool execution patterns.
 *
 * @param toolExecutor - The executor to use for running the tool
 * @param logger - Logger instance for recording execution details
 * @param toolInvocationData - The tool invocation data including metadata and input
 * @param resultSchema - Zod schema to validate the result against
 * @param validator - Optional custom validator function for additional validation logic
 * @returns The validated result from the tool execution
 *
 * @throws {z.ZodError} If the result does not match the schema (when using default validation)
 * @throws {Error} If tool execution fails or custom validator throws
 *
 * @example
 * // Basic usage with schema validation
 * const result = executeToolWithLogging(
 *   toolExecutor,
 *   logger,
 *   toolInvocationData,
 *   MyToolResultSchema
 * );
 *
 * @example
 * // With custom validator
 * const result = executeToolWithLogging(
 *   toolExecutor,
 *   logger,
 *   toolInvocationData,
 *   MyToolResultSchema,
 *   (result, schema) => {
 *     const validated = schema.parse(result);
 *     // Additional custom validation or transformation
 *     if (validated.someField < 0) {
 *       throw new Error('Value must be positive');
 *     }
 *     return validated;
 *   }
 * );
 */
export function executeToolWithLogging<TResultSchema extends z.ZodObject<z.ZodRawShape>>(
  toolExecutor: ToolExecutor,
  logger: Logger,
  toolInvocationData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>,
  resultSchema: TResultSchema,
  validator?: (result: unknown, schema: TResultSchema) => z.infer<TResultSchema>
): z.infer<TResultSchema> {
  logger.debug('Tool invocation data (pre-execution)', { toolInvocationData });

  const result = toolExecutor.execute(toolInvocationData);

  logger.debug('Tool execution result (post-execution)', { result });

  if (validator) {
    return validator(result, resultSchema);
  } else {
    const validatedResult = resultSchema.parse(result);
    logger.debug('Validated tool result', { validatedResult });
    return validatedResult;
  }
}
