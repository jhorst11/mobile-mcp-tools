import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GetInputTool, Logger } from '@salesforce/magen-mcp-workflow';
import { SFMOBILE_NATIVE_ADD_FEATURE_GET_INPUT_TOOL_ID } from './metadata.js';
import { ADD_FEATURE_ORCHESTRATOR_TOOL } from '../../workflow/sfmobile-native-add-feature/metadata.js';

export const createSFMobileNativeAddFeatureGetInputTool = (
  server: McpServer,
  logger?: Logger
): GetInputTool =>
  new GetInputTool(
    server,
    SFMOBILE_NATIVE_ADD_FEATURE_GET_INPUT_TOOL_ID,
    ADD_FEATURE_ORCHESTRATOR_TOOL.toolId,
    logger
  );
