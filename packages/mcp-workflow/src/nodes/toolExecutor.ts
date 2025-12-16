/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { interrupt } from '@langchain/langgraph';
import { NodeGuidanceData } from '../common/metadata.js';

/**
 * Interface for node execution mechanism.
 * Abstracts the LangGraph interrupt mechanism to enable dependency injection and testing.
 */
export interface NodeExecutor {
  /**
   * Executes a node by invoking the underlying mechanism (e.g., LangGraph interrupt).
   *
   * @param guidanceData The guidance data to pass to the execution mechanism
   * @returns The result from the node execution (as unknown, to be validated by caller)
   */
  execute(guidanceData: NodeGuidanceData): unknown;
}

/**
 * Production implementation of NodeExecutor that uses LangGraph's interrupt mechanism.
 * This is the default implementation used in production workflows.
 */
/* c8 ignore start */
export class LangGraphNodeExecutor implements NodeExecutor {
  execute(guidanceData: NodeGuidanceData): unknown {
    return interrupt(guidanceData);
  }
}
/* c8 ignore stop */

/**
 * Interface for tool execution mechanism.
 * Abstracts the LangGraph interrupt mechanism to enable dependency injection and testing.
 * Used by services that invoke actual MCP tools (e.g., get-input, input-extraction).
 */
export interface ToolExecutor {
  /**
   * Executes a tool by invoking the underlying mechanism (e.g., LangGraph interrupt).
   *
   * @param toolInvocationData The tool invocation data to pass to the execution mechanism
   * @returns The result from the tool execution (as unknown, to be validated by caller)
   */
  execute(toolInvocationData: unknown): unknown;
}

/**
 * Production implementation of ToolExecutor that uses LangGraph's interrupt mechanism.
 * This is the default implementation used in production services.
 */
/* c8 ignore start */
export class LangGraphToolExecutor implements ToolExecutor {
  execute(toolInvocationData: unknown): unknown {
    return interrupt(toolInvocationData);
  }
}
/* c8 ignore stop */
