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

export class SddInitTool implements Tool {
  public readonly name = 'SDD Init';
  public readonly title = 'Salesforce Mobile SDD Initialization Tool';
  public readonly toolId = 'sfmobile-sdd-init';
  public readonly description =
    'Initializes a project with Salesforce Mobile SDD instructions by copying them to a .magen directory, or adds a new feature if already initialized';
  public readonly inputSchema = SddInitInputSchema;

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
        // Create the directory
        await fs.mkdir(destPath, { recursive: true });
        // Recursively copy contents
        const nestedFiles = await this.copyRecursive(srcPath, destPath, relativePath);
        copiedFiles.push(...nestedFiles);
      } else {
        // Copy the file
        const content = await fs.readFile(srcPath);
        await fs.writeFile(destPath, content);
        copiedFiles.push(relativePath);
      }
    }

    return copiedFiles;
  }

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
  private createStateJsonTemplate(): any {
    const now = new Date().toISOString();
    return {
      version: '1.0.0',
      state: 'initialized',
      featureId: '',
      specPath: '',
      requirementsPath: '',
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
          description: 'SDD environment initialized',
        },
      ],
    };
  }

  /**
   * Creates the specs directory structure
   * @param targetDir The .magen directory path
   */
  private async createDirectoryStructure(targetDir: string): Promise<void> {
    // Create .instructions directory
    const instructionsDir = join(targetDir, '.instructions');
    await fs.mkdir(instructionsDir, { recursive: true });
    
    // We no longer create the specs directory as features will be directly under .magen
    // with the format 001-<feature-name>
  }

  protected async handleRequest(input: SddInitInputType) {
    try {
      const { projectPath } = input;
      const targetDir = join(projectPath, '.magen');

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

      // Check if .magen directory already exists
      let magenExists = false;
      try {
        await fs.access(targetDir);
        magenExists = true;
      } catch (error) {
        // .magen doesn't exist, we'll create it
      }

      if (magenExists) {
        // .magen directory exists, check if .instructions/START.md exists to confirm it's a valid SDD project
        const startMdPath = join(targetDir, '.instructions', 'START.md');
        try {
          await fs.access(startMdPath);

          // Valid SDD project, provide guidance for creating a new feature
          return {
            content: [
              {
                type: 'text' as const,
                text: `The project has already been initialized with SDD. Follow the instructions in \`${startMdPath}\` to guide the feature creation process.\n\nTo create a new feature, you'll need to:\n1. Generate a feature ID (e.g., 001-example-feature)\n2. Create a directory at .magen/001-<feature-name>/\n3. Initialize a state.json file in that directory\n4. Create prd.md, requirements.md, and tasks.md files in that directory`,
              },
            ],
          };
        } catch (error) {
          // START.md doesn't exist, the .magen directory might be corrupted or incomplete
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Warning: The .magen directory exists but appears to be incomplete or corrupted. Would you like to reinitialize it? (This will overwrite any existing files)`,
              },
            ],
          };
        }
      }

      // Create .magen directory if it doesn't exist
      try {
        await fs.mkdir(targetDir, { recursive: true });
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Failed to create .magen directory: ${(error as Error).message}`,
            },
          ],
        };
      }

      // Create directory structure (.magen/specs and .magen/.instructions)
      await this.createDirectoryStructure(targetDir);

      // Recursively copy all files and directories to .instructions
      const instructionsDir = join(targetDir, '.instructions');
      const copiedFiles = await this.copyRecursive(this.resourcesPath, instructionsDir);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully initialized Salesforce Mobile SDD instructions in ${targetDir}.\n\nCopied ${copiedFiles.length} files:\n${copiedFiles
              .slice(0, 10)
              .map(file => `- ${file}`)
              .join(
                '\n'
              )}${copiedFiles.length > 10 ? `\n...and ${copiedFiles.length - 10} more files` : ''}\n\nTo create a new feature, follow the instructions in ${join(targetDir, '.instructions', 'START.md')}`,
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
