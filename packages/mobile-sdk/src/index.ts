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

// Plan Tools
import { PlanWorkflowTool } from './tools/plan/workflow.js';
import { PlanEnvironmentTool } from './tools/plan/environment.js';
import { PlanDevicesTool } from './tools/plan/devices.js';
import { PlanDesignTool } from './tools/plan/design.js';

// Create Tools
import { CreateConnectedAppTool } from './tools/create/connectedApp.js';
import { CreateProjectTool } from './tools/create/project.js';
import { CreateConfigurationTool } from './tools/create/configuration.js';
import { CreateAddFilesTool } from './tools/create/addFiles.js';

// Build Tools
import { BuildProjectTool } from './tools/build/project.js';

// Deploy Tools
import { DeploySimulatorTool } from './tools/deploy/simulator.js';
import { DeployAppTool } from './tools/deploy/app.js';

// Debug Tools
import { DebugLogsTool } from './tools/debug/logs.js';

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

// Initialize organized tools
const tools = [
  // Plan Tools - Planning & Discovery
  new PlanWorkflowTool(),
  new PlanEnvironmentTool(),
  new PlanDevicesTool(),
  new PlanDesignTool(),

  // Create Tools - Project & Configuration Creation
  new CreateConnectedAppTool(),
  new CreateProjectTool(),
  new CreateConfigurationTool(),
  new CreateAddFilesTool(),

  // Build Tools - Application Building
  new BuildProjectTool(),

  // Deploy Tools - Deployment & Execution
  new DeploySimulatorTool(),
  new DeployAppTool(),

  // Debug Tools - Troubleshooting & Diagnostics
  new DebugLogsTool(),
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
  console.error(`Salesforce Mobile SDK MCP Server running on stdio`);
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
