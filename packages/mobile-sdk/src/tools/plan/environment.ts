/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { satisfies } from 'semver';
import { Tool } from '../tool.js';
import { EmptySchema, EnvironmentCheckResponse } from '../../schemas/mobileSdkSchema.js';
import { CommandRunner } from '../../utils/commandRunner.js';

interface PrerequisiteCheck {
  tool: string;
  command: string;
  versionFlag?: string;
  minVersion?: string;
  required: boolean;
  platform?: 'darwin' | 'win32' | 'linux';
}

export class PlanEnvironmentTool implements Tool {
  readonly name = 'Plan Environment';
  readonly toolId = 'plan-environment';
  readonly description =
    'Verifies that all required local development tools are installed and meet minimum version requirements for Salesforce Mobile SDK development.';
  readonly inputSchema = EmptySchema;
  readonly outputSchema = EnvironmentCheckResponse;

  private readonly prerequisites: PrerequisiteCheck[] = [
    {
      tool: 'Node.js',
      command: 'node',
      versionFlag: '--version',
      minVersion: '18.0.0',
      required: true,
    },
    {
      tool: 'npm',
      command: 'npm',
      versionFlag: '--version',
      minVersion: '8.0.0',
      required: true,
    },
    {
      tool: 'Git',
      command: 'git',
      versionFlag: '--version',
      minVersion: '2.20.0',
      required: true,
    },
    {
      tool: 'Salesforce CLI',
      command: 'sf',
      versionFlag: '--version',
      minVersion: '2.0.0',
      required: true,
    },
    {
      tool: 'Xcode Command Line Tools',
      command: 'xcode-select',
      versionFlag: '--version',
      required: true,
      platform: 'darwin',
    },
    {
      tool: 'Java JDK',
      command: 'java',
      versionFlag: '--version',
      minVersion: '11.0.0',
      required: true,
    },
    {
      tool: 'Android SDK (adb)',
      command: 'adb',
      versionFlag: 'version',
      required: false,
    },
    {
      tool: 'forceios CLI',
      command: 'forceios',
      versionFlag: '--version',
      required: false,
      platform: 'darwin',
    },
    {
      tool: 'forcedroid CLI',
      command: 'forcedroid',
      versionFlag: '--version',
      required: false,
    },
    {
      tool: 'forcereact CLI',
      command: 'forcereact',
      versionFlag: '--version',
      required: false,
    },
  ];

  private async checkPrerequisite(prereq: PrerequisiteCheck) {
    // Skip platform-specific tools if not on the right platform
    if (prereq.platform && process.platform !== prereq.platform) {
      return {
        tool: prereq.tool,
        status: 'found' as const,
        message: `Skipped (not required on ${process.platform})`,
      };
    }

    // Check if command exists
    const exists = await CommandRunner.exists(prereq.command);
    if (!exists) {
      return {
        tool: prereq.tool,
        status: 'missing' as const,
        message: `${prereq.tool} is not installed or not in PATH`,
      };
    }

    // Get version if specified
    if (prereq.versionFlag && prereq.minVersion) {
      const versionOutput = await CommandRunner.getVersion(prereq.command, prereq.versionFlag);
      if (!versionOutput) {
        return {
          tool: prereq.tool,
          status: 'found' as const,
          message: `${prereq.tool} is installed but version could not be determined`,
        };
      }

      // Extract version number from output
      const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : versionOutput.trim();

      try {
        if (satisfies(version, `>=${prereq.minVersion}`)) {
          return {
            tool: prereq.tool,
            status: 'found' as const,
            version,
            required: prereq.minVersion,
            message: `${prereq.tool} v${version} meets requirements (>= ${prereq.minVersion})`,
          };
        } else {
          return {
            tool: prereq.tool,
            status: 'outdated' as const,
            version,
            required: prereq.minVersion,
            message: `${prereq.tool} v${version} is outdated (requires >= ${prereq.minVersion})`,
          };
        }
      } catch {
        // If semver parsing fails, just report found
        return {
          tool: prereq.tool,
          status: 'found' as const,
          version,
          message: `${prereq.tool} is installed (version: ${version})`,
        };
      }
    }

    return {
      tool: prereq.tool,
      status: 'found' as const,
      message: `${prereq.tool} is installed`,
    };
  }

  private async handleRequest() {
    try {
      const results = await Promise.all(
        this.prerequisites.map(prereq => this.checkPrerequisite(prereq))
      );

      const hasErrors = results.some(
        result => result.status === 'missing' || result.status === 'outdated'
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: !hasErrors,
                details: results,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error checking prerequisites: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  public register(server: McpServer, annotations: ToolAnnotations): void {
    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      annotations,
      this.handleRequest.bind(this)
    );
  }
}
