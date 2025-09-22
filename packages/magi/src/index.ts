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
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

import { SddInitTool } from './tools/sdd-init/tool.js';
import { SddBuildFeatureTool } from './tools/sdd-build-feature/tool.js';
import { SddUpdateInstructionsTool } from './tools/sdd-update-instructions/tool.js';
import { SddNextStepTool } from './tools/sdd-next-step/tool.js';
import { SddNewFeaturePrompt } from './prompts/sdd-new-feature/prompt.js';
import { SddInitPrompt } from './prompts/sdd-init/prompt.js';
import { SddUpdateInstructionsPrompt } from './prompts/sdd-update-instructions/prompt.js';

const server = new McpServer({
  name: 'magi',
  description: 'Magi Spec Driven Development MCP Server',
  version,
});

// Define annotations
const annotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const tools = [
  new SddInitTool(),
  new SddBuildFeatureTool(),
  new SddUpdateInstructionsTool(),
  new SddNextStepTool(),
];

// Register all tools
tools.forEach(tool => tool.register(server, annotations));

const prompts = [SddInitPrompt, SddNewFeaturePrompt, SddUpdateInstructionsPrompt];

// Register all prompts
prompts.forEach(prompt => prompt.register(server));

export default server;

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Salesforce Mobile SDD MCP Server running on stdio, from '${process.cwd()}'`);
}

main().catch(error => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
