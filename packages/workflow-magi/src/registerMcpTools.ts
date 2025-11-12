/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { PRDGenerationOrchestrator } from './tools/prd/magi-prd-orchestrator/tool.js';
import { MagiFeatureBriefGenerationTool } from './tools/prd/magi-prd-feature-brief/tool.js';
import { MagiFeatureBriefUpdateTool } from './tools/prd/magi-prd-feature-brief-update/tool.js';
import { MagiFeatureBriefReviewTool } from './tools/prd/magi-prd-feature-brief-review/tool.js';
import { MagiFeatureBriefFinalizationTool } from './tools/prd/magi-prd-feature-brief-finalization/tool.js';
import { MagiInitialRequirementsTool } from './tools/prd/magi-prd-initial-requirements/tool.js';
import { MagiGapRequirementsTool } from './tools/prd/magi-prd-gap-requirements/tool.js';
import { MagiRequirementsReviewTool } from './tools/prd/magi-prd-requirements-review/tool.js';
import { MagiRequirementsUpdateTool } from './tools/prd/magi-prd-requirements-update/tool.js';
import { MagiGapAnalysisTool } from './tools/prd/magi-prd-gap-analysis/tool.js';
import { MagiPRDGenerationTool } from './tools/prd/magi-prd-generation/tool.js';
import { MagiPRDReviewTool } from './tools/prd/magi-prd-review/tool.js';
import { MagiPRDUpdateTool } from './tools/prd/magi-prd-update/tool.js';
import { MagiPRDFinalizationTool } from './tools/prd/magi-prd-finalization/tool.js';
import { PRDFailureTool } from './tools/prd/magi-prd-failure/tool.js';

/**
 * Default read-only annotations for Magi PRD workflow tools
 */
const defaultReadOnlyAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/**
 * Registers all Magi PRD workflow tools with the MCP server.
 *
 * @param server The MCP server instance to register tools with
 * @param annotations Optional tool annotations. Defaults to read-only annotations.
 * @returns The PRD orchestrator instance (should be registered separately with orchestrator annotations)
 *
 * @example
 * ```typescript
 * const server = new McpServer({ name: 'my-server', version: '1.0.0' });
 * const prdOrchestrator = registerMagiMcpTools(server);
 *
 * // Register orchestrator with different annotations
 * const orchestratorAnnotations: ToolAnnotations = {
 *   readOnlyHint: false,
 *   destructiveHint: false,
 *   idempotentHint: false,
 *   openWorldHint: true,
 * };
 * prdOrchestrator.register(orchestratorAnnotations);
 * ```
 */
export function registerMagiMcpTools(
  server: McpServer,
  annotations: ToolAnnotations = defaultReadOnlyAnnotations
) {
  // Instantiate all tools
  const featureBriefTool = new MagiFeatureBriefGenerationTool(server);
  const featureBriefUpdateTool = new MagiFeatureBriefUpdateTool(server);
  const featureBriefReviewTool = new MagiFeatureBriefReviewTool(server);
  const featureBriefFinalizationTool = new MagiFeatureBriefFinalizationTool(server);
  const initialRequirementsTool = new MagiInitialRequirementsTool(server);
  const gapRequirementsTool = new MagiGapRequirementsTool(server);
  const requirementsReviewTool = new MagiRequirementsReviewTool(server);
  const requirementsUpdateTool = new MagiRequirementsUpdateTool(server);
  const gapAnalysisTool = new MagiGapAnalysisTool(server);
  const prdGenerationTool = new MagiPRDGenerationTool(server);
  const prdReviewTool = new MagiPRDReviewTool(server);
  const prdUpdateTool = new MagiPRDUpdateTool(server);
  const prdFinalizationTool = new MagiPRDFinalizationTool(server);
  const prdFailureTool = new PRDFailureTool(server);
  const orchestrator = new PRDGenerationOrchestrator(server);

  // Register all tools with the provided annotations
  featureBriefTool.register(annotations);
  featureBriefUpdateTool.register(annotations);
  featureBriefReviewTool.register(annotations);
  featureBriefFinalizationTool.register(annotations);
  initialRequirementsTool.register(annotations);
  gapRequirementsTool.register(annotations);
  requirementsReviewTool.register(annotations);
  requirementsUpdateTool.register(annotations);
  gapAnalysisTool.register(annotations);
  prdGenerationTool.register(annotations);
  prdReviewTool.register(annotations);
  prdUpdateTool.register(annotations);
  prdFinalizationTool.register(annotations);
  prdFailureTool.register(annotations);
  orchestrator.register({
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  });
}
