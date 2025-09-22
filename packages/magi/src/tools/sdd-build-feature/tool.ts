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
  SddBuildFeatureInputSchema,
  SddBuildFeatureInputType,
} from '../../schemas/sddBuildFeatureSchema.js';
import { promises as fs } from 'fs';
import {
  getInstructionFilePaths,
  validateProjectPath,
  validateMagenDirectory,
  createFeatureDirectory,
  loadStateJsonTemplate,
  getMagenDir,
} from '../../utils/index.js';

export class SddBuildFeatureTool implements Tool {
  public readonly name = 'SDD Build Feature';
  public readonly title = 'Salesforce Mobile SDD Feature Builder Tool';
  public readonly toolId = 'magi-build-feature';
  public readonly description =
    'Guides the LLM through creating a new feature requirement using SDD methodology';
  public readonly inputSchema = SddBuildFeatureInputSchema;

  /**
   * Public method to build a feature using SDD methodology
   * @param input The build feature input parameters
   * @returns Result of the feature building guidance
   */
  public async buildFeature(input: SddBuildFeatureInputType) {
    return this.handleRequest(input);
  }

  /**
   * Creates a state.json template for a feature
   * @param featureId The feature ID
   * @returns A state.json template object
   */
  private async createStateJsonTemplate(featureId: string): Promise<Record<string, unknown>> {
    const templateResult = await loadStateJsonTemplate();
    if (templateResult.isError) {
      throw new Error('Failed to load state.json template');
    }

    const now = new Date().toISOString();
    const template = (templateResult as { data: Record<string, unknown> }).data;

    // Update feature-specific fields
    template.featureId = featureId;
    const timestamps = template.timestamps as Record<string, string>;
    timestamps.created = now;
    timestamps.lastUpdated = now;
    template.changelog = [
      {
        date: now,
        action: 'initialized',
        description: 'Feature initialized',
      },
    ];

    return template;
  }

  protected async handleRequest(input: SddBuildFeatureInputType) {
    try {
      const { projectPath, featureId } = input;

      // Validate project path
      const projectValidation = await validateProjectPath(projectPath);
      if (projectValidation.isError) {
        return projectValidation;
      }

      // Validate magi-sdd directory
      const magenValidation = await validateMagenDirectory(projectPath);
      if (magenValidation.isError) {
        return magenValidation;
      }

      const magenDir = getMagenDir(projectPath);
      const instructionPaths = getInstructionFilePaths(magenDir);

      // Create feature directory
      const featureResult = await createFeatureDirectory(magenDir, featureId);
      if (featureResult.isError) {
        return featureResult;
      }

      // Type guard to ensure we have success result with data
      if (!('data' in featureResult) || !featureResult.data) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'Error: Failed to get feature directory data.',
            },
          ],
        };
      }

      const { stateJsonPath, prdPath, tddPath, tasksPath } = featureResult.data;

      // Create state.json file
      const stateJson = await this.createStateJsonTemplate(featureId);
      try {
        await fs.writeFile(stateJsonPath, JSON.stringify(stateJson, null, 2));
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Failed to create state.json file: ${(error as Error).message}`,
            },
          ],
        };
      }

      try {
        // Create empty feature files
        await fs.writeFile(
          prdPath,
          `Placeholder file for PRD. You MUST follow instructions at ${instructionPaths.prd.build} to complete`
        );
        await fs.writeFile(
          tddPath,
          `Placeholder file for TDD. You MUST follow instructions at ${instructionPaths.tdd.build} to complete`
        );
        await fs.writeFile(
          tasksPath,
          `Placeholder file for Tasks. You MUST follow instructions at ${instructionPaths.tasks.build} to complete`
        );
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Failed to create feature files: ${(error as Error).message}`,
            },
          ],
        };
      }

      // All steps completed successfully
      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully created feature ${featureId}. Read the instructions in ${instructionPaths.prd.build} and follow them and work with the user to build out the PRD.`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error building SDD feature: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  public register(server: McpServer, annotations: ToolAnnotations): void {
    // Add title annotation from the tool
    const enhancedAnnotations = {
      ...annotations,
      title: this.title,
    };

    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      enhancedAnnotations,
      this.handleRequest.bind(this)
    );
  }
}
