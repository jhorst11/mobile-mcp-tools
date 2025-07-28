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
  DeviceListRequest,
  DeviceListResponse,
  type DeviceListRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { DeviceManager } from '../../utils/deviceManager.js';

export class ListDevicesTool implements Tool {
  readonly name = 'List Devices';
  readonly toolId = 'simulator-list-devices';
  readonly description =
    'Lists all available iOS simulators and Android emulators, with their current status and availability.';
  readonly inputSchema = DeviceListRequest;
  readonly outputSchema = DeviceListResponse;

  private async handleRequest(params: DeviceListRequestType) {
    try {
      // Get device list
      const devices = await DeviceManager.listDevices(params.platform, params.availableOnly);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                devices,
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
            text: `Error listing devices: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
