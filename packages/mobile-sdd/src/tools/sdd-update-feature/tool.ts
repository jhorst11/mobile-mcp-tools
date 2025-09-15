/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { Tool } from '../tool.js';
import {
  SddUpdateFeatureInputSchema,
  SddUpdateFeatureInputType,
} from '../../schemas/sddUpdateFeatureSchema.js';
import { promises as fs } from 'fs';
import { join } from 'path';

export class SddUpdateFeatureTool implements Tool {
  public readonly name = 'SDD Update Feature';
  public readonly title = 'Salesforce Mobile SDD Feature Update Tool';
  public readonly toolId = 'sfmobile-sdd-update-feature';
  public readonly description =
    'Guides the LLM through updating an existing feature artifact (PRD, Requirements, or Tasks) with PRD-first gating and traceability.';
  public readonly inputSchema = SddUpdateFeatureInputSchema;

  /**
   * Public method to guide updating a feature artifact
   */
  public async updateFeature(input: SddUpdateFeatureInputType) {
    return this.handleRequest(input);
  }

  protected async handleRequest(input: SddUpdateFeatureInputType) {
    try {
      const { projectPath, featureId, target, changeSummary } = input;
      const magenDir = join(projectPath, '.magen');

      // Validate project exists
      try {
        await fs.access(projectPath);
      } catch (error) {
        return {
          isError: true,
          content: [
            { type: 'text' as const, text: `Error: Project path "${projectPath}" does not exist or is not accessible.` },
          ],
        };
      }

      // Validate .magen exists
      try {
        await fs.access(magenDir);
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: The .magen directory does not exist in the project path. Please run the sdd-init tool first to initialize the SDD environment.`,
            },
          ],
        };
      }

      // Validate instructions exist
      const startMdPath = join(magenDir, '.instructions', 'START.md');
      try {
        await fs.access(startMdPath);
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: The START.md file does not exist in the .magen/.instructions directory. The SDD environment may be corrupted. Please run the sdd-init tool again.`,
            },
          ],
        };
      }

      // Validate feature directory exists
      const featureDir = join(magenDir, featureId);
      try {
        await fs.access(featureDir);
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Feature directory ${featureDir} does not exist. Please verify the featureId or create the feature first.`,
            },
          ],
        };
      }

      // Read feature state.json early for gating and version display
      const statePath = join(featureDir, 'state.json');
      let state: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        const stateContent = await fs.readFile(statePath, 'utf8');
        state = JSON.parse(stateContent);
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Failed to read or parse ${statePath}. ${(error as Error).message}`,
            },
          ],
        };
      }

      // Resolve artifact path and required instruction doc
      const instructionBase = join(magenDir, '.instructions');
      let artifactPath = '';
      let instructionDocPath = '';
      let currentVersion = '';
      if (target === 'prd') {
        artifactPath = join(featureDir, 'prd.md');
        instructionDocPath = join(instructionBase, 'design', 'update-design.md');
        currentVersion = state?.prd?.version ?? '';
      } else if (target === 'requirements') {
        artifactPath = join(featureDir, 'requirements.md');
        instructionDocPath = join(instructionBase, 'requirements', 'update-requirements.md');
        currentVersion = state?.requirements?.version ?? '';
      } else {
        artifactPath = join(featureDir, 'tasks.md');
        instructionDocPath = join(instructionBase, 'tasks', 'update-tasks.md');
        currentVersion = state?.build?.version ?? '';
      }

      // Validate artifact exists
      try {
        await fs.access(artifactPath);
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: The expected artifact file for target '${target}' does not exist at ${artifactPath}.`,
            },
          ],
        };
      }

      // Validate the specific update instruction doc exists
      try {
        await fs.access(instructionDocPath);
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: The update instructions were not found at ${instructionDocPath}. Please re-run sdd-init to refresh instructions.`,
            },
          ],
        };
      }

      // Enforce PRD-first gating
      if (target === 'requirements') {
        if (!state?.prd || state.prd.state !== 'finalized') {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Gate: Cannot update requirements until PRD is finalized. Current prd.state is '${state?.prd?.state ?? 'unknown'}'. Finalize PRD first using ${join(
                  instructionBase,
                  'design',
                  'finalize-design.md'
                )}.`,
              },
            ],
          };
        }
      }

      if (target === 'tasks') {
        if (!state?.requirements || state.requirements.state !== 'finalized') {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Gate: Cannot update tasks until requirements are finalized. Current requirements.state is '${
                  state?.requirements?.state ?? 'unknown'
                }'. Finalize requirements first using ${join(
                  instructionBase,
                  'requirements',
                  'finalize-requirements.md'
                )}.`,
              },
            ],
          };
        }
      }

      const summaryLine = changeSummary
        ? `\nChange summary: ${changeSummary}\n`
        : '';

      // Provide guidance output
      return {
        content: [
          {
            type: 'text' as const,
            text: `Update SDD Feature — ${featureId}\n\nTarget: ${target}\nArtifact: ${artifactPath}\nInstructions: ${instructionDocPath}${summaryLine}${currentVersion ? `Current version: ${currentVersion}\n` : ''}\nNext steps:\n1) Open the instruction document above and follow it carefully.\n2) Propose a minimal diff for ${target} and confirm impacts to traceability.\n3) Update ${join(
              featureDir,
              'state.json'
            )} timestamps and changelog after applying edits.\n4) If this update changes scope that was previously finalized, move the relevant state to 'in_review' and re-finalize using the finalize doc before proceeding downstream.\n5) On re-finalization, bump the ${target} version appropriately (patch/minor/major) and append an entry to versionHistory with date and reason.`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error updating SDD feature: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  public register(server: McpServer, annotations: ToolAnnotations): void {
    const enhancedAnnotations = { ...annotations, title: this.title };

    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      enhancedAnnotations,
      this.handleRequest.bind(this)
    );
  }
}
