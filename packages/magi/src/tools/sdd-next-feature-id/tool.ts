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
  SddNextFeatureIdInputSchema,
  SddNextFeatureIdInputType,
} from '../../schemas/sddNextFeatureIdSchema.js';
import { promises as fs } from 'fs';
import {
  validateProjectPath,
  validateMagenDirectory,
  getMagenDir,
  pathExists,
} from '../../utils/index.js';

export class SddNextFeatureIdTool implements Tool {
  public readonly name = 'SDD Next Feature ID';
  public readonly title = 'Salesforce Mobile SDD Next Feature ID Generator Tool';
  public readonly toolId = 'sdd-next-feature-id';
  public readonly description =
    'Generates the next feature ID by inspecting existing features in magi-sdd directory and prepending the provided kebab-case feature name with the next numerical value';
  public readonly inputSchema = SddNextFeatureIdInputSchema;

  /**
   * Public method to get the next feature ID
   * @param input The next feature ID input parameters
   * @returns Result containing the next feature ID
   */
  public async getNextFeatureId(input: SddNextFeatureIdInputType) {
    return this.handleRequest(input);
  }

  /**
   * Scans the magi-sdd directory for existing features and determines the next ID number
   * @param magenDir The magi-sdd directory path
   * @returns The next available feature number (e.g., "005")
   */
  private async getNextFeatureNumber(magenDir: string): Promise<string> {
    try {
      const entries = await fs.readdir(magenDir, { withFileTypes: true });

      // Filter for directories that match the feature ID pattern (NNN-*)
      const featureDirectories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .filter(name => /^\d{3}-/.test(name))
        .map(name => parseInt(name.substring(0, 3), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => a - b);

      // Find the next available number
      let nextNumber = 1;
      for (const num of featureDirectories) {
        if (num === nextNumber) {
          nextNumber++;
        } else {
          break;
        }
      }

      // Format as three-digit string with leading zeros
      return nextNumber.toString().padStart(3, '0');
    } catch (error) {
      // If there's an error reading the directory or no features exist, start with 001
      return '001';
    }
  }

  protected async handleRequest(input: SddNextFeatureIdInputType) {
    try {
      const { projectPath, featureName } = input;

      // Validate project path
      const projectValidation = await validateProjectPath(projectPath);
      if (projectValidation.isError) {
        return projectValidation;
      }

      // Validate magi-sdd directory exists
      const magenValidation = await validateMagenDirectory(projectPath);
      if (magenValidation.isError) {
        return magenValidation;
      }

      const magenDir = getMagenDir(projectPath);

      // Check if magi-sdd directory exists
      const magenExists = await pathExists(magenDir);
      if (!magenExists) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'Error: magi-sdd directory does not exist. Please run sdd-init first.',
            },
          ],
        };
      }

      // Get the next feature number
      const nextNumber = await this.getNextFeatureNumber(magenDir);
      const nextFeatureId = `${nextNumber}-${featureName}`;

      return {
        content: [
          {
            type: 'text' as const,
            text: `Next feature ID: ${nextFeatureId}`,
          },
        ],
        data: {
          featureId: nextFeatureId,
          featureName,
          featureNumber: nextNumber,
        },
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error generating next feature ID: ${(error as Error).message}`,
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
