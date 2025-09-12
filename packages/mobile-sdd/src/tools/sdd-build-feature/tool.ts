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
      specPath: `.magen/specs/${featureId}/`,
      requirementsPath: `.magen/specs/${featureId}/requirements.md`,
      timestamps: {
        created: now,
        lastUpdated: now,
        requirementsFinalized: '',
        prdFinalized: '',
      },
      requirements: {
        state: 'pending',
        completenessScore: 0,
        openQuestions: [],
      },
      prd: {
        state: 'pending',
        path: '',
        completenessScore: 0,
      },
      build: {
        state: 'pending',
        tasksGenerated: false,
        tasksPath: '',
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
      const { projectPath } = input;
      const magenDir = join(projectPath, '.magen');
      const specsDir = join(magenDir, 'specs');

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

      // Check if START.md exists
      const startMdPath = join(magenDir, 'START.md');
      try {
        await fs.access(startMdPath);
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: The START.md file does not exist in the .magen directory. The SDD environment may be corrupted. Please run the sdd-init tool again.`,
            },
          ],
        };
      }

      // Create specs directory if it doesn't exist
      try {
        await fs.mkdir(specsDir, { recursive: true });
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Failed to create specs directory: ${(error as Error).message}`,
            },
          ],
        };
      }

      // All checks passed, provide guidance for building a new feature
      return {
        content: [
          {
            type: 'text' as const,
            text: `The project has been properly initialized with SDD. Follow the instructions in ${startMdPath} to guide the feature creation process.\n\nTo create a new feature:\n\n1. Generate a feature ID (e.g., 001-example-feature)\n2. Create a directory at .magen/specs/<feature-id>/\n3. Create a state.json file in that directory with the feature's state\n4. Follow the requirements building process as outlined in the instructions\n\nEach feature will have its own state.json file that tracks its progress through the SDD workflow.`,
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
