#!/usr/bin/env node

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

// Phase 1 Tools
import { CheckPrerequisitesTool } from './tools/environment/checkPrerequisites.js';
import { SalesforceLoginTool } from './tools/salesforce/login.js';
import { ProvisionConnectedAppTool } from './tools/salesforce/provisionConnectedApp.js';
import { ProjectScaffoldTool } from './tools/project/scaffold.js';
import { ProjectConfigurationTool } from './tools/project/configureConnection.js';

// Phase 2 Tools
import { SimulatorStartTool } from './tools/simulator/start.js';
import { ListDevicesTool } from './tools/simulator/listDevices.js';
import { BuildRunOnSimulatorTool } from './tools/build/runOnSimulator.js';
import { ResourceReadTool } from './tools/resource/read.js';

const server = new McpServer({
  name: 'sfdc-mobile-sdk-mcp-server',
  version,
});

// Define annotations - Tools modify the system and perform builds
const annotations: ToolAnnotations = {
  readOnlyHint: false, // These tools modify the system (create projects, files, build apps, etc.)
  destructiveHint: false, // They don't delete existing data
  idempotentHint: false, // Some operations like builds and deployments are not idempotent
  openWorldHint: false, // Well-defined, specific functionality
};

// Initialize Phase 1 & 2 tools
const tools = [
  // Phase 1: Foundation - Environment, Authentication, and Project Scaffolding
  new CheckPrerequisitesTool(),
  // new SalesforceLoginTool(),
  new ProvisionConnectedAppTool(),
  new ProjectScaffoldTool(),
  new ProjectConfigurationTool(),

  // Phase 2: Build & Deploy Pipeline - Integrating Platform-Native Toolchains
  new SimulatorStartTool(),
  new ListDevicesTool(),
  new BuildRunOnSimulatorTool(),
  new ResourceReadTool(),
];

// Register all tools with the server
tools.forEach(tool => {
  console.error(`Registering tool: ${tool.name} (${tool.toolId})`);
  tool.register(server, annotations);
});

// Export the server for testing
export default server;

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Salesforce Mobile SDK MCP Server (Phase 1 & 2) running on stdio`);
  console.error(`Available tools: ${tools.map(t => t.toolId).join(', ')}`);
  console.error(`Working directory: ${process.cwd()}`);
}

// Only run main() if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error in main():', error);
    process.exit(1);
  });
}
