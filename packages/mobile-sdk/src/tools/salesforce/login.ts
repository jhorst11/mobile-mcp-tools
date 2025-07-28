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
  SalesforceLoginRequest,
  SalesforceLoginResponse,
  type SalesforceLoginRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { CommandRunner } from '../../utils/commandRunner.js';

export class SalesforceLoginTool implements Tool {
  readonly name = 'Salesforce Login';
  readonly toolId = 'salesforce-login';
  readonly description =
    'Initiates a web-based OAuth flow to authenticate with a Salesforce org and stores the session for subsequent tool calls.';
  readonly inputSchema = SalesforceLoginRequest;
  readonly outputSchema = SalesforceLoginResponse;

  private async handleRequest(params: SalesforceLoginRequestType) {
    try {
      // Build the sf org login web command
      const args = ['org', 'login', 'web'];

      if (params.instanceUrl) {
        args.push('--instance-url', params.instanceUrl);
      }

      if (params.alias) {
        args.push('--alias', params.alias);
      }

      // Execute the login command
      const result = await CommandRunner.run('sf', args);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: `Login failed: ${result.stderr || result.stdout}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Parse the output to extract org information
      // The sf CLI typically outputs JSON when successful
      try {
        // Try to get org info after login
        const orgInfoResult = await CommandRunner.run('sf', ['org', 'display', '--json']);

        if (orgInfoResult.success) {
          const orgInfo = JSON.parse(orgInfoResult.stdout);

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: true,
                    username: orgInfo.result?.username,
                    orgId: orgInfo.result?.id,
                    alias: orgInfo.result?.alias || params.alias,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      } catch {
        // If we can't parse the org info, still report success if login worked
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                alias: params.alias,
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
            text: `Error during Salesforce login: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
