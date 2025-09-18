/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { Tool } from '../tool.js';
import { SddInitInputSchema, SddInitInputType } from '../../schemas/sddInitSchema.js';
import { promises as fs } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getInstructionFilePaths,
  getResourcesPath,
  copyRecursive,
  validateProjectPath,
  getMagenDir,
  getInstructionsDir,
  loadStateJsonTemplate,
} from '../../utils/index.js';

export class SddInitTool implements Tool {
  public readonly name = 'SDD Init';
  public readonly title = 'Salesforce Mobile SDD Initialization Tool';
  public readonly toolId = 'sfmobile-sdd-init';
  public readonly description =
    'Initializes a project with Salesforce Mobile SDD instructions by copying them to a magen-sdd directory, or adds a new feature if already initialized';
  public readonly inputSchema = SddInitInputSchema;

  private readonly resourcesPath = getResourcesPath();

  /**
   * Public method to initialize SDD in a project
   * @param input The initialization input parameters
   * @returns Result of the initialization
   */
  public async initialize(input: SddInitInputType) {
    return this.handleRequest(input);
  }

  /**
   * Creates a state.json template for a feature
   * @returns A state.json template object
   */
  private async createStateJsonTemplate(): Promise<any> {
    const templateResult = await loadStateJsonTemplate();
    if (templateResult.isError) {
      throw new Error('Failed to load state.json template');
    }

    const now = new Date().toISOString();
    const template = (templateResult as { data: Record<string, unknown> }).data;

    // Update timestamps and changelog
    const timestamps = template.timestamps as Record<string, string>;
    timestamps.created = now;
    timestamps.lastUpdated = now;
    template.changelog = [
      {
        date: now,
        action: 'initialized',
        description: 'SDD environment initialized',
      },
    ];

    return template;
  }

  /**
   * Creates the specs directory structure
   * @param projectPath The project root path
   */
  private async createDirectoryStructure(projectPath: string): Promise<void> {
    // Create .instructions directory
    const instructionsDir = getInstructionsDir(projectPath);
    await fs.mkdir(instructionsDir, { recursive: true });
    // We no longer create the specs directory as features will be directly under magen-sdd
    // with the format 001-<feature-name>
  }

  protected async handleRequest(input: SddInitInputType) {
    try {
      const { projectPath } = input;

      // Validate project path
      const projectValidation = await validateProjectPath(projectPath);
      if (projectValidation.isError) {
        return projectValidation;
      }

      const targetDir = getMagenDir(projectPath);

      // Check if magen-sdd directory already exists
      const magenExists = await fs
        .access(targetDir)
        .then(() => true)
        .catch(() => false);

      if (magenExists) {
        // magen-sdd directory exists, check if .instructions/START.md exists to confirm it's a valid SDD project
        const instructionPaths = getInstructionFilePaths(targetDir);
        const startExists = await fs
          .access(instructionPaths.start)
          .then(() => true)
          .catch(() => false);

        if (startExists) {
          // Valid SDD project, provide guidance for creating a new feature
          return {
            content: [
              {
                type: 'text' as const,
                text: `The project has already been initialized with SDD. Follow the instructions in \`${instructionPaths.start}\` to guide the feature creation process.\n\nTo create a new feature, you'll need to:\n1. Generate a feature ID (e.g., 001-example-feature)\n2. Create a directory at magen-sdd/001-<feature-name>/\n3. Initialize a state.json file in that directory\n4. Create prd.md, requirements.md, and tasks.md files in that directory`,
              },
            ],
          };
        } else {
          // START.md doesn't exist, the magen-sdd directory might be corrupted or incomplete
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Warning: The magen-sdd directory exists but appears to be incomplete or corrupted. Would you like to reinitialize it? (This will overwrite any existing files)`,
              },
            ],
          };
        }
      }

      // Create magen-sdd directory if it doesn't exist
      try {
        await fs.mkdir(targetDir, { recursive: true });
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Failed to create magen-sdd directory: ${(error as Error).message}`,
            },
          ],
        };
      }

      // Create directory structure (magen-sdd/specs and magen-sdd/.instructions)
      await this.createDirectoryStructure(projectPath);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully initialized Salesforce Mobile SDD instructions in ${targetDir}.\n\nRead the instructions in ${getInstructionFilePaths(targetDir).start} to understand how to build a feature. 
            Ask the user if they would like to create a new feature. You can invoke the sfmobile-sdd-new-feature tool for them or they can invoke the /ssd-new-feature prompt themselves.`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error initializing SDD instructions: ${(error as Error).message}`,
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
