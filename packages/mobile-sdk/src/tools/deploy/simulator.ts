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
  SimulatorStartRequest,
  SimulatorStartResponse,
  type SimulatorStartRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { DeviceManager } from '../../utils/deviceManager.js';

export class DeploySimulatorTool implements Tool {
  readonly name = 'Deploy Simulator';
  readonly toolId = 'deploy-simulator';
  readonly description =
    'Starts a specific iOS simulator or Android emulator by name, ensuring it is ready for app deployment.';
  readonly inputSchema = SimulatorStartRequest;
  readonly outputSchema = SimulatorStartResponse;

  private async handleRequest(params: SimulatorStartRequestType) {
    try {
      // Validate platform support
      if (params.platform === 'ios' && process.platform !== 'darwin') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'iOS simulators are only supported on macOS',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Start the device
      const result = await DeviceManager.startDevice(
        params.deviceName,
        params.platform,
        params.osVersion
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                deviceId: result.deviceId,
                deviceName: result.deviceName,
                platform: result.platform,
                status: 'booted',
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
            text: `Error starting simulator: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
