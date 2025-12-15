/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  OrchestratorTool,
  OrchestratorConfig,
  WorkflowStateManager,
  type Logger,
  type WorkflowEnvironment,
} from '@salesforce/magen-mcp-workflow';
import { addFeatureWorkflow } from '../../../workflow/add-feature-graph.js';
import { ADD_FEATURE_ORCHESTRATOR_TOOL } from './metadata.js';

/**
 * Mobile Native Add Feature Orchestrator Tool
 *
 * Wraps the generic OrchestratorTool from @salesforce/magen-mcp-workflow with
 * add-feature workflow configuration.
 */
export class MobileNativeAddFeatureOrchestrator extends OrchestratorTool {
  constructor(server: McpServer, logger?: Logger, environment: WorkflowEnvironment = 'production') {
    const config: OrchestratorConfig = {
      toolId: ADD_FEATURE_ORCHESTRATOR_TOOL.toolId,
      title: 'Salesforce Mobile Native Add Feature',
      description:
        'Orchestrates the workflow for adding features to existing Salesforce native mobile apps using feature templates.',
      workflow: addFeatureWorkflow,
      stateManager: new WorkflowStateManager({
        environment,
        logger,
      }),
      logger,
    };

    super(server, config);
  }
}
