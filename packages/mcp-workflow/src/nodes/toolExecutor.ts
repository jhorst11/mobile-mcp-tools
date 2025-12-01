/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { interrupt } from '@langchain/langgraph';
import { MCPToolInvocationData, NodeGuidanceData } from '../common/metadata.js';

/**
 * Interface for node execution mechanism.
 * Abstracts the LangGraph interrupt mechanism to enable dependency injection and testing.
 * Supports both the new NodeGuidanceData (preferred) and legacy MCPToolInvocationData.
 */
export interface NodeExecutor {
  /**
   * Executes a node by invoking the underlying mechanism (e.g., LangGraph interrupt).
   * Now passes guidance data instead of tool invocation data.
   *
   * @param guidanceData The node guidance data to pass to the execution mechanism
   * @returns The result from the node execution (as unknown, to be validated by caller)
   */
  execute(
    guidanceData: NodeGuidanceData | MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>
  ): unknown;
}

/**
 * Production implementation of NodeExecutor that uses LangGraph's interrupt mechanism.
 * This is the default implementation used in production workflows.
 */
/* c8 ignore start */
export class LangGraphNodeExecutor implements NodeExecutor {
  execute(
    guidanceData: NodeGuidanceData | MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>
  ): unknown {
    return interrupt(guidanceData);
  }
}
/* c8 ignore stop */

/**
 * @deprecated Use NodeExecutor instead. This is kept for backward compatibility during migration.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ToolExecutor extends NodeExecutor {}

/**
 * @deprecated Use LangGraphNodeExecutor instead. This is kept for backward compatibility during migration.
 */
/* c8 ignore start */
export class LangGraphToolExecutor extends LangGraphNodeExecutor implements ToolExecutor {}
/* c8 ignore stop */
