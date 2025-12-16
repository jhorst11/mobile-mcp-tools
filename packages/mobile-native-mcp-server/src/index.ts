#!/usr/bin/env node

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { UtilsXcodeAddFilesTool } from './tools/utils/utils-xcode-add-files/tool.js';

import { SFMobileNativeBuildTool } from './tools/plan/sfmobile-native-build/tool.js';
import { SFMobileNativeBuildRecoveryTool } from './tools/plan/sfmobile-native-build-recovery/tool.js';
import { MobileNativeOrchestrator } from './tools/workflow/sfmobile-native-project-manager/tool.js';
import { MobileNativeAddFeatureOrchestrator } from './tools/workflow/sfmobile-native-add-feature/tool.js';
import { registerMagiMcpTools } from '@salesforce/workflow-magi';

import packageJson from '../package.json' with { type: 'json' };
const version = packageJson.version;
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { MobileAppProjectPrompt } from './prompts/index.js';
import { createSFMobileNativeGetInputTool } from './tools/utils/sfmobile-native-get-input/factory.js';
import { createSFMobileNativeInputExtractionTool } from './tools/utils/sfmobile-native-input-extraction/factory.js';
import { createSFMobileNativeAddFeatureGetInputTool } from './tools/utils/sfmobile-native-add-feature-get-input/factory.js';
import { createSFMobileNativeAddFeatureInputExtractionTool } from './tools/utils/sfmobile-native-add-feature-input-extraction/factory.js';

const server = new McpServer({
  name: 'sfdc-mobile-native-mcp-server',
  version,
});

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
const addFeatureOrchestrator = new MobileNativeAddFeatureOrchestrator(server);
const getInputTool = createSFMobileNativeGetInputTool(server);
const inputExtractionTool = createSFMobileNativeInputExtractionTool(server);
const addFeatureGetInputTool = createSFMobileNativeAddFeatureGetInputTool(server);
const addFeatureInputExtractionTool = createSFMobileNativeAddFeatureInputExtractionTool(server);
const buildTool = new SFMobileNativeBuildTool(server);
const buildRecoveryTool = new SFMobileNativeBuildRecoveryTool(server);
const xcodeAddFilesTool = new UtilsXcodeAddFilesTool(server);

// Register Magi tools
registerMagiMcpTools(server);

// Initialize prompts
const mobileAppProjectPrompt = new MobileAppProjectPrompt(server);

// Register orchestrators with specific annotations
orchestrator.register(orchestratorAnnotations);
addFeatureOrchestrator.register(orchestratorAnnotations);

// Register all other tools with read-only annotations
getInputTool.register(readOnlyAnnotations);
inputExtractionTool.register(readOnlyAnnotations);
addFeatureGetInputTool.register(readOnlyAnnotations);
addFeatureInputExtractionTool.register(readOnlyAnnotations);
buildTool.register(readOnlyAnnotations);
buildRecoveryTool.register(readOnlyAnnotations);
xcodeAddFilesTool.register(readOnlyAnnotations);

// Register prompts
mobileAppProjectPrompt.register();

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
