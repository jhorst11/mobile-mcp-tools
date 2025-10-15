#!/usr/bin/env node

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SFMobileNativeUserInputTriageTool } from './tools/plan/sfmobile-native-user-input-triage/tool.js';
import { SFMobileNativeTemplateDiscoveryTool } from './tools/plan/sfmobile-native-template-discovery/tool.js';
import { UtilsXcodeAddFilesTool } from './tools/utils/utils-xcode-add-files/tool.js';
import { SFMobileNativeDeploymentTool } from './tools/run/sfmobile-native-deployment/tool.js';
import { SFMobileNativeBuildTool } from './tools/plan/sfmobile-native-build/tool.js';
import { SFMobileNativeProjectGenerationTool } from './tools/plan/sfmobile-native-project-generation/tool.js';
import { MobileNativeOrchestrator } from './tools/workflow/sfmobile-native-project-manager/tool.js';

import packageJson from '../package.json' with { type: 'json' };
const version = packageJson.version;
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

const server = new McpServer(
  {
    name: 'sfdc-mobile-native-mcp-server',
    version,
  },
  { capabilities: { logging: {} } }
);

// Define annotations for different tool types
const readOnlyAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const orchestratorAnnotations: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

// Initialize tools
const orchestrator = new MobileNativeOrchestrator(server);
const userInputTriageTool = new SFMobileNativeUserInputTriageTool(server);
const templateDiscoveryTool = new SFMobileNativeTemplateDiscoveryTool(server);
const projectGenerationTool = new SFMobileNativeProjectGenerationTool(server);
const buildTool = new SFMobileNativeBuildTool(server);
const deploymentTool = new SFMobileNativeDeploymentTool(server);
const xcodeAddFilesTool = new UtilsXcodeAddFilesTool(server);

// Register orchestrator with specific annotations
orchestrator.register(orchestratorAnnotations);

// Register all other tools with read-only annotations
userInputTriageTool.register(readOnlyAnnotations);
templateDiscoveryTool.register(readOnlyAnnotations);
projectGenerationTool.register(readOnlyAnnotations);
buildTool.register(readOnlyAnnotations);
deploymentTool.register(readOnlyAnnotations);
xcodeAddFilesTool.register(readOnlyAnnotations);

server.tool(
  'send-progress-notification',
  'Starts a long task and updates progress every 5 seconds',
  {},
  async (req, { sendNotification, _meta }) => {
    const progressToken = _meta?.progressToken;

    await sendNotification({
      method: 'notifications/message',
      params: {
        level: 'info',
        data: 'starting long running task',
      },
    });
    for (let i = 1; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      // while this is a valid notification and the one we SHOULD be using, it does not seem to be handled by the MCP inspector.
      // I found that sending a normal message notification as a heart beat keeps the tool alive
      await sendNotification({
        method: 'notifications/progress',
        params: {
          progressToken: progressToken ?? '123',
          message: 'Solving world hunger...',
          progress: i,
          total: 10,
        },
      });
    }
    return {
      content: [{ type: 'text', text: 'Task completed' }],
    };
  }
);

export default server;

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Salesforce Mobile Native MCP Server running on stdio, from '${process.cwd()}'`);
}

main().catch(error => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
