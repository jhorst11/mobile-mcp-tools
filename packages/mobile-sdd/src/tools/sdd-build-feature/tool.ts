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
import { join } from 'path';

export class SddBuildFeatureTool implements Tool {
  public readonly name = 'SDD Build Feature';
  public readonly title = 'Salesforce Mobile SDD Feature Builder Tool';
  public readonly toolId = 'sfmobile-sdd-build-feature';
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
  private createStateJsonTemplate(featureId: string): any {
    const now = new Date().toISOString();
    return {
      version: '1.0.0',
      state: 'initialized',
      featureId: featureId,
      specPath: `.magen/${featureId}/`,
      requirementsPath: `.magen/${featureId}/requirements.md`,
      timestamps: {
        created: now,
        lastUpdated: now,
        requirementsFinalized: '',
        prdFinalized: '',
        tasksFinalized: '',
      },
      requirements: {
        state: 'pending',
        completenessScore: 0,
        openQuestions: [],
        version: '0.0.0',
        versionHistory: [],
      },
      prd: {
        state: 'pending',
        path: '',
        completenessScore: 0,
        openQuestions: [],
        version: '0.0.0',
        versionHistory: [],
      },
      build: {
        state: 'pending',
        tasksGenerated: false,
        tasksPath: '',
        version: '0.0.0',
        versionHistory: [],
      },
      changelog: [
        {
          date: now,
          action: 'initialized',
          description: 'Feature initialized',
        },
      ],
    };
  }

  protected async handleRequest(input: SddBuildFeatureInputType) {
    try {
      const { projectPath, featureId } = input;
      const magenDir = join(projectPath, '.magen');

      // Check if project path exists
      try {
        await fs.access(projectPath);
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Project path "${projectPath}" does not exist or is not accessible.`,
            },
          ],
        };
      }

      // Check if .magen directory exists
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

      // Check if .instructions/START.md exists
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

      // Create feature directory
      const featureDir = join(magenDir, featureId);
      try {
        await fs.access(featureDir);
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Feature directory ${featureDir} already exists. Please use a different feature ID.`,
            },
          ],
        };
      } catch (error) {
        // Directory doesn't exist, we can create it
        try {
          await fs.mkdir(featureDir, { recursive: true });
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Error: Failed to create feature directory: ${(error as Error).message}`,
              },
            ],
          };
        }
      }

      // Create state.json file
      const stateJson = this.createStateJsonTemplate(featureId);
      const stateJsonPath = join(featureDir, 'state.json');
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

      // Create empty files for prd.md, requirements.md, and tasks.md
      const prdPath = join(featureDir, 'prd.md');
      const requirementsPath = join(featureDir, 'requirements.md');
      const tasksPath = join(featureDir, 'tasks.md');
      
      try {
        await fs.writeFile(prdPath, '');
        await fs.writeFile(requirementsPath, '');
        await fs.writeFile(tasksPath, '');
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
            text: `Successfully created feature ${featureId} at ${featureDir}\n\nThe following files have been created:\n- ${stateJsonPath} (with initial state)\n- ${prdPath} (empty file for PRD)\n- ${requirementsPath} (empty file for requirements)\n- ${tasksPath} (empty file for tasks)\n\nFollow the instructions in ${startMdPath} to continue with the SDD process. You should start by drafting the PRD using the instructions in .magen/.instructions/design/build-design.md.`,
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
