/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PRDGenerationOrchestrator } from './tools/prd/magi-prd-orchestrator/tool.js';

/**
 * Registers all Magi PRD workflow tools with the MCP server.
 *
 * @param server The MCP server instance to register tools with
 */
export function registerMagiMcpTools(server: McpServer) {
  // Instantiate the orchestrator - the single tool for the entire workflow
  const orchestrator = new PRDGenerationOrchestrator(server);

  // Register the orchestrator with appropriate annotations
  orchestrator.register({
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  });
}
