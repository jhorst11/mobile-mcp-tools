#!/usr/bin/env node

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { registerMagiMcpTools } from '@salesforce/workflow-magi';

import packageJson from '../package.json' with { type: 'json' };
const version = packageJson.version;

const server = new McpServer({
  name: 'mcp-magi',
  version,
});

// Define annotations for tools
const readOnlyAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

// Register all Magi PRD workflow tools
registerMagiMcpTools(server, readOnlyAnnotations);

export default server;

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`MCP Magi Server running on stdio, from '${process.cwd()}'`);
}

main().catch(error => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
