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
  ConnectedAppGuidanceRequest,
  ConnectedAppGuidanceResponse,
  type ConnectedAppGuidanceRequestType,
} from '../../schemas/mobileSdkSchema.js';

export class ProvisionConnectedAppTool implements Tool {
  readonly name = 'Connected App Guidance';
  readonly toolId = 'salesforce-provision-connected-app';
  readonly description =
    'Provides step-by-step guidance for manually creating a Connected App in Salesforce and accepts the Consumer Key for project configuration.';
  readonly inputSchema = ConnectedAppGuidanceRequest;
  readonly outputSchema = ConnectedAppGuidanceResponse;

  private generateGuidance(): string {
    return `# Creating a Connected App for Salesforce Mobile SDK

## Step-by-Step Instructions

1. **Log into your Salesforce org** and navigate to Setup
2. **Go to App Manager**: Setup → Apps → App Manager
3. **Create New Connected App**: Click "New Connected App"
4. **Fill in Basic Information**:
   - Connected App Name: Choose a descriptive name (e.g., "My Mobile App")
   - API Name: Will auto-populate based on the name
   - Contact Email: Your email address

5. **Configure OAuth Settings**:
   - Check "Enable OAuth Settings"
   - Callback URL: Enter \`sfdc://success\`
   - Selected OAuth Scopes: Add these scopes:
     - Access and manage your data (api)
     - Provide access to your data via the Web (web)
     - Access your basic information (id)
     - Perform requests on your behalf at any time (refresh_token, offline_access)

6. **Save the Connected App**

7. **Get the Consumer Key**:
   - After saving, click "Continue"
   - Copy the "Consumer Key" (Client ID) - this is what you'll provide to this tool

## Login URL Configuration
When providing credentials to this tool, also specify your org's login URL:
- **Production/Developer orgs**: https://login.salesforce.com (default)
- **Sandbox orgs**: https://test.salesforce.com
- **Custom domains**: https://mycompany.my.salesforce.com
- **Scratch orgs**: Check your scratch org info for the specific URL

## Configuring Login Servers in Your Mobile App
After validation, you'll need to configure your mobile app to use the custom login server:

### iOS Configuration
Configure the login host in your iOS app using one of these methods:
- **info.plist**: Set \`SFDCOAuthLoginHost\` property (without "https://" prefix)
- **User configuration**: Through the Add Connection screen in your app
- **MDM enforcement**: Through Mobile Device Management policies

**iOS Documentation**: https://developer.salesforce.com/docs/platform/mobile-sdk/guide/oauth-custom-login-host-ios.html

### Android Configuration  
Configure the server connection in your Android app using:
- **servers.xml**: Add custom servers to \`res/xml/servers.xml\` (include "https://" prefix)
- **User configuration**: Through the Add Connection button in your app
- **MDM enforcement**: Through Mobile Device Management policies

**Android Documentation**: https://developer.salesforce.com/docs/platform/mobile-sdk/guide/oauth-custom-login-host.html

## Important Notes
- The Consumer Secret is not needed for mobile applications
- Make sure the Callback URL is exactly: \`sfdc://success\`
- After creating the app, it may take 2-10 minutes to become active
- iOS apps: Omit "https://" prefix when configuring login host
- Android apps: Include "https://" prefix when configuring login URL

## Reference
For detailed instructions, see: https://help.salesforce.com/s/articleView?id=platform.ev_relay_create_connected_app.htm&language=en_US&type=5

Once you have your Consumer Key and know your login URL, provide them to this tool to validate and store the configuration.`;
  }

  private async handleRequest(params: ConnectedAppGuidanceRequestType) {
    try {
      // If no parameters provided, just return guidance
      if (!params.consumerKey) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  guidance: this.generateGuidance(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Validate the Consumer Key format (basic validation)
      if (params.consumerKey.length < 20) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    'Consumer Key appears to be invalid. It should be a long string (typically 80+ characters).',
                  guidance: this.generateGuidance(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Validate callback URL
      const callbackUrl = params.callbackUrl || 'sfdc://success';
      if (callbackUrl !== 'sfdc://success') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Callback URL must be exactly "sfdc://success" for mobile applications.',
                  guidance: this.generateGuidance(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Validate and set login URL
      const loginUrl = params.loginUrl || 'https://login.salesforce.com';

      // Common Salesforce login URL validation
      const validLoginUrlPatterns = [
        /^https:\/\/login\.salesforce\.com$/,
        /^https:\/\/test\.salesforce\.com$/,
        /^https:\/\/[a-zA-Z0-9-]+\.my\.salesforce\.com$/,
        /^https:\/\/[a-zA-Z0-9-]+--[a-zA-Z0-9-]+\.my\.salesforce\.com$/,
      ];

      const isValidLoginUrl = validLoginUrlPatterns.some(pattern => pattern.test(loginUrl));
      if (!isValidLoginUrl) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    'Login URL must be a valid Salesforce login URL (e.g., https://login.salesforce.com, https://test.salesforce.com, or your custom domain).',
                  guidance: this.generateGuidance(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Return success with the validated credentials
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                consumerKey: params.consumerKey,
                callbackUrl: callbackUrl,
                loginUrl: loginUrl,
                guidance: `Connected App credentials validated successfully! You can now use these credentials to configure your mobile project.
                
Configuration summary:
- Consumer Key: ${params.consumerKey}
- Callback URL: ${callbackUrl}
- Login URL: ${loginUrl}`,
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
            text: `Error validating Connected App credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
