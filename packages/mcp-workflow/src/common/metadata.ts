/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';

/**
 * Workflow state data schema for round-tripping session identity
 * This lightweight object maintains workflow session continuity across stateless MCP tool invocations
 */
export const WORKFLOW_STATE_DATA_SCHEMA = z.object({
  thread_id: z.string().describe('Unique identifier for the workflow session'),
});

export type WorkflowStateData = z.infer<typeof WORKFLOW_STATE_DATA_SCHEMA>;

/**
 * Workflow property names - single source of truth for property naming
 */
export const WORKFLOW_PROPERTY_NAMES = {
  workflowStateData: 'workflowStateData',
  userInput: 'userInput',
} as const;

/**
 * Base input schema for workflow-aware tools
 * All tools participating in workflow orchestration should extend this schema
 */
export const WORKFLOW_TOOL_BASE_INPUT_SCHEMA = z.object({
  [WORKFLOW_PROPERTY_NAMES.workflowStateData]: WORKFLOW_STATE_DATA_SCHEMA.describe(
    'Workflow session state for continuation. Required for all workflow-aware tools, but optional for the orchestrator tool, because it can also start new workflows.'
  ),
});

/**
 * Node guidance data structure used in LangGraph interrupts
 * Contains everything needed for the orchestrator to create a task prompt
 * This replaces MCPToolInvocationData in the new single-orchestrator architecture
 */
export interface NodeGuidanceData {
  /**
   * Unique identifier for this node/task type
   * Used for logging and debugging
   */
  nodeId: string;

  /**
   * The task prompt that instructs the LLM what to do
   * This is the guidance that was previously in the tool
   */
  taskPrompt: string;

  /**
   * Input data/context for the task
   * Derived from workflow state
   */
  taskInput: Record<string, unknown>;

  /**
   * Zod schema defining expected output structure
   * Used to validate LLM response
   */
  resultSchema: z.ZodObject<z.ZodRawShape>;

  /**
   * Optional: Additional metadata for logging/debugging
   */
  metadata?: {
    nodeName: string;
    description: string;
  };
}

/**
 * MCP tool invocation data structure used in LangGraph interrupts
 * Contains all information needed for the orchestrator to create tool invocation instructions
 *
 * @deprecated Use NodeGuidanceData instead. This is kept for backward compatibility during migration.
 * @template TWorkflowInputSchema - The full workflow input schema (includes workflowStateData)
 */
export interface MCPToolInvocationData<TWorkflowInputSchema extends z.ZodObject<z.ZodRawShape>> {
  /** Metadata about the tool to invoke */
  llmMetadata: {
    name: string;
    description: string;
    inputSchema: TWorkflowInputSchema;
  };
  /** Input parameters for the tool invocation - typed to business logic schema only */
  input: Omit<z.infer<TWorkflowInputSchema>, 'workflowStateData'>;
}

/**
 * Standard output schema for all workflow MCP tools
 */
export const MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA = z.object({
  promptForLLM: z
    .string()
    .describe('Complete prompt with instructions and post-processing guidance'),
  resultSchema: z
    .string()
    .describe("The string-serialized JSON schema of the expected result from the LLM's task"),
});

export type MCPWorkflowToolOutput = z.infer<typeof MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA>;

/**
 * Base tool metadata interface - defines the general structure for tool information
 */
export interface ToolMetadata<
  TInputSchema extends z.ZodObject<z.ZodRawShape>,
  TOutputSchema extends z.ZodObject<z.ZodRawShape>,
> {
  /** Unique tool identifier used for MCP registration and workflow orchestration */
  readonly toolId: string;

  /** Extended tool title for detailed display */
  readonly title: string;

  /** Tool description for documentation and LLM context */
  readonly description: string;

  /** Zod input schema for validation */
  readonly inputSchema: TInputSchema;

  /** Zod output schema for validation */
  readonly outputSchema: TOutputSchema;
}

/**
 * Workflow tool metadata interface - defines the structure for workflow tool information
 */
export interface WorkflowToolMetadata<
  TInputSchema extends typeof WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  TResultSchema extends z.ZodObject<z.ZodRawShape>,
  TOutputSchema extends
    typeof MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA = typeof MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
> extends ToolMetadata<TInputSchema, TOutputSchema> {
  /** Holds the shape of the expected result for guidance-based tools */
  readonly resultSchema: TResultSchema;
}
