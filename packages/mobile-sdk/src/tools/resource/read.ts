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
  ResourceReadRequest,
  ResourceReadResponse,
  type ResourceReadRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { ResourceManager } from '../../utils/resourceManager.js';

export class ResourceReadTool implements Tool {
  readonly name = 'Resource Read';
  readonly toolId = 'resource-read';
  readonly description =
    'Reads the contents of a resource (such as build logs, configuration files, or project artifacts) from a file URI.';
  readonly inputSchema = ResourceReadRequest;
  readonly outputSchema = ResourceReadResponse;

  private async handleRequest(params: ResourceReadRequestType) {
    try {
      // Read the resource
      const resource = await ResourceManager.readResource(params.uri, params.offset, params.length);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                content: resource.content,
                mimeType: resource.mimeType,
                size: resource.size,
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
            text: `Error reading resource: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
