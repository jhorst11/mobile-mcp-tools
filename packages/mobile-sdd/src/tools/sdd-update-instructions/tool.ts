/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { Tool } from '../tool.js';
import { SddUpdateInstructionsInputSchema, SddUpdateInstructionsInputType } from '../../schemas/sddUpdateInstructionsSchema.js';
import { promises as fs } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export class SddUpdateInstructionsTool implements Tool {
  public readonly name = 'SDD Update Instructions';
  public readonly title = 'Salesforce Mobile SDD Instructions Updater Tool';
  public readonly toolId = 'sfmobile-sdd-update-instructions';
  public readonly description =
    'Updates the instruction files in a .magen directory from the latest version included with the tool.';
  public readonly inputSchema = SddUpdateInstructionsInputSchema;

  private readonly resourcesPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'resources',
    'instructions'
  );

  /**
   * Recursively copies a directory
   * @param sourcePath Source directory path
   * @param targetPath Target directory path
   * @returns Array of copied file paths (relative to source)
   */
  private async copyRecursive(
    sourcePath: string,
    targetPath: string,
    basePath: string = ''
  ): Promise<string[]> {
    const copiedFiles: string[] = [];
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(sourcePath, entry.name);
      const destPath = join(targetPath, entry.name);
      const relativePath = basePath ? join(basePath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        const nestedFiles = await this.copyRecursive(srcPath, destPath, relativePath);
        copiedFiles.push(...nestedFiles);
      } else {
        const content = await fs.readFile(srcPath);
        await fs.writeFile(destPath, content);
        copiedFiles.push(relativePath);
      }
    }

    return copiedFiles;
  }

  protected async handleRequest(input: SddUpdateInstructionsInputType) {
    try {
      const { projectPath } = input;
      const targetDir = join(projectPath, '.magen');
      const instructionsDir = join(targetDir, '.instructions');

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

      // Check if .magen/.instructions directory exists to confirm it's a valid SDD project
      try {
        await fs.access(join(instructionsDir, 'START.md'));
      } catch (error) {
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
      const copiedFiles = await this.copyRecursive(this.resourcesPath, instructionsDir);

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
