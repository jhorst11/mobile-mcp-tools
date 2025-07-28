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
  BuildRunOnSimulatorRequest,
  BuildRunOnSimulatorResponse,
  type BuildRunOnSimulatorRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { BuildManager } from '../../utils/buildManager.js';
import { FileUtils } from '../../utils/fileUtils.js';

export class BuildRunOnSimulatorTool implements Tool {
  readonly name = 'Build and Run on Simulator';
  readonly toolId = 'build-run-on-simulator';
  readonly description =
    'Builds the project and deploys it to a running or new simulator/emulator instance. Provides a one-click build-and-run experience.';
  readonly inputSchema = BuildRunOnSimulatorRequest;
  readonly outputSchema = BuildRunOnSimulatorResponse;

  private async handleRequest(params: BuildRunOnSimulatorRequestType) {
    try {
      // Validate project exists
      if (!(await FileUtils.exists(params.projectPath))) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: `Project directory does not exist: ${params.projectPath}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Detect platform
      const platform = await BuildManager.detectPlatform(params.projectPath);
      if (!platform) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    'Could not detect project platform. Ensure this is a valid Mobile SDK project.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Platform-specific validation
      if (platform === 'ios' && process.platform !== 'darwin') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'iOS development is only supported on macOS',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Build and deploy
      const buildOptions = {
        projectPath: params.projectPath,
        configuration: params.configuration,
        clean: params.clean,
        targetDevice: params.targetDevice,
      };

      const result = await BuildManager.buildAndDeploy(buildOptions);

      // Create a resource URI for the build log if available
      let buildLogUri: string | undefined;
      if (result.buildLogPath) {
        buildLogUri = `file://${result.buildLogPath}`;
      }

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: result.error,
                  buildLogUri,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Success response
      const response = {
        success: true,
        buildLogUri,
        appPath: result.appPath,
        deviceId: result.deviceId,
        deviceName: result.deviceName,
        appBundleId: result.appBundleId,
      };

      // Filter out undefined values
      const cleanResponse = Object.fromEntries(
        Object.entries(response).filter(([, value]) => value !== undefined)
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(cleanResponse, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error building and deploying project: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
