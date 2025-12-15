import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InputExtractionTool, Logger } from '@salesforce/magen-mcp-workflow';
import { SFMOBILE_NATIVE_ADD_FEATURE_INPUT_EXTRACTION_TOOL_ID } from './metadata.js';
import { ADD_FEATURE_ORCHESTRATOR_TOOL } from '../../workflow/sfmobile-native-add-feature/metadata.js';

export const createSFMobileNativeAddFeatureInputExtractionTool = (
  server: McpServer,
  logger?: Logger
): InputExtractionTool =>
  new InputExtractionTool(
    server,
    SFMOBILE_NATIVE_ADD_FEATURE_INPUT_EXTRACTION_TOOL_ID,
    ADD_FEATURE_ORCHESTRATOR_TOOL.toolId,
    logger
  );
