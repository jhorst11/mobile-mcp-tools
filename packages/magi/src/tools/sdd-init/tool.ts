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
import {
  getInstructionFilePaths,
  validateProjectPath,
  validateMagenDirectory,
  getMagenDir,
  getInstructionsDir,
  loadStateJsonTemplate,
  copyRecursive,
  getResourcesPath,
  pathExists,
} from '../../utils/index.js';
import { join } from 'path';

export class SddInitTool implements Tool {
  public readonly name = 'SDD Init';
  public readonly title = 'Salesforce Mobile SDD Initialization Tool';
  public readonly toolId = 'magi-init';
  public readonly description =
    'Initializes a project with Salesforce Mobile SDD instructions by copying them to a magi-sdd directory, or adds a new feature if already initialized';
  public readonly inputSchema = SddInitInputSchema;

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
  private async createStateJsonTemplate(): Promise<Record<string, unknown>> {
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
   * Creates the specs directory structure and copies instruction files
   * @param projectPath The project root path
   */
  private async createDirectoryStructure(projectPath: string): Promise<void> {
    // Create .instructions directory
    const instructionsDir = getInstructionsDir(projectPath);
    await fs.mkdir(instructionsDir, { recursive: true });

    // Copy instructions from resources/instructions to .instructions
    const resourcesPath = getResourcesPath();
    const instructionsSourcePath = join(resourcesPath, 'instructions');
    await copyRecursive(instructionsSourcePath, instructionsDir);

    // Copy hooks directory if it exists
    const targetDir = getMagenDir(projectPath);
    const hooksSourcePath = join(resourcesPath, 'hooks');
    const hooksTargetPath = join(targetDir, 'hooks');
    if (await pathExists(hooksSourcePath)) {
      await copyRecursive(hooksSourcePath, hooksTargetPath);
    }

    // We no longer create the specs directory as features will be directly under magi-sdd
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
      const instructionPaths = getInstructionFilePaths(targetDir);

      // Check if magi-sdd directory already exists
      const magenExists = await fs
        .access(targetDir)
        .then(() => true)
        .catch(() => false);

      if (magenExists) {
        // magi-sdd directory exists, validate it's a proper SDD project
        const validation = await validateMagenDirectory(projectPath);

        if (!validation.isError) {
          // Valid SDD project, provide guidance for creating a new feature

          return {
            content: [
              {
                type: 'text' as const,
                text: `The project has already been initialized with SDD. Follow the instructions in \`${instructionPaths.start}\`.`,
              },
            ],
          };
        } else {
          // Invalid SDD project, return the validation error
          return validation;
        }
      }

      // Create magi-sdd directory if it doesn't exist
      try {
        await fs.mkdir(targetDir, { recursive: true });
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Failed to create magi-sdd directory: ${(error as Error).message}`,
            },
          ],
        };
      }

      // Create directory structure (magi-sdd/specs and magi-sdd/.instructions)
      await this.createDirectoryStructure(projectPath);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully initialized Salesforce Mobile SDD instructions in ${targetDir}. Follow ${instructionPaths.start}`,
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
