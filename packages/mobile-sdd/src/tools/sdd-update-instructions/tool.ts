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
  SddUpdateInstructionsInputSchema,
  SddUpdateInstructionsInputType,
} from '../../schemas/sddUpdateInstructionsSchema.js';
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
} from '../../utils/index.js';

export class SddUpdateInstructionsTool implements Tool {
  public readonly name = 'SDD Update Instructions';
  public readonly title = 'Salesforce Mobile SDD Instructions Updater Tool';
  public readonly toolId = 'sfmobile-sdd-update-instructions';
  public readonly description =
    'Updates the instruction files in a .magen directory from the latest version included with the tool.';
  public readonly inputSchema = SddUpdateInstructionsInputSchema;

  private readonly resourcesPath = getResourcesPath();

  protected async handleRequest(input: SddUpdateInstructionsInputType) {
    try {
      const { projectPath } = input;

      // Validate project path
      const projectValidation = await validateProjectPath(projectPath);
      if (projectValidation.isError) {
        return projectValidation;
      }

      const targetDir = getMagenDir(projectPath);
      const instructionsDir = getInstructionsDir(projectPath);

      // Check if .magen/.instructions directory exists to confirm it's a valid SDD project
      const instructionPaths = getInstructionFilePaths(targetDir);
      const startExists = await fs
        .access(instructionPaths.start)
        .then(() => true)
        .catch(() => false);

      if (!startExists) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: This does not appear to be a valid SDD project. The directory '${instructionsDir}' or its contents are missing. Please run the 'sfmobile-sdd-init' tool first.`,
            },
          ],
        };
      }

      // Remove the old instructions directory to ensure stale files are deleted.
      await fs.rm(instructionsDir, { recursive: true, force: true });
      await fs.mkdir(instructionsDir, { recursive: true });

      // Recursively copy all files and directories to .instructions, overwriting existing files
      const copiedFiles = await copyRecursive(this.resourcesPath, instructionsDir);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully updated Salesforce Mobile SDD instructions in ${instructionsDir}.\n\nUpdated ${copiedFiles.length} files.`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error updating SDD instructions: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  public register(server: McpServer, annotations: ToolAnnotations): void {
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
