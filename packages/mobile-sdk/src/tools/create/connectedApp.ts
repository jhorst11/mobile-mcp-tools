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

export class CreateConnectedAppTool implements Tool {
  readonly name = 'Create Connected App';
  readonly toolId = 'create-connected-app';
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
   - **IMPORTANT**: Uncheck "Require Secret for Web Server Flow" (mobile apps don't need the consumer secret)
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
**Do you need a custom login URL?**

Most developers can use the default login URL. Choose your situation:

### Option 1: Use Default Login URL (Most Common)
If you're using a **production org** or **developer org**, you can skip providing a login URL and use the default: \`https://login.salesforce.com\`

### Option 2: Provide Custom Login URL
If you're using any of these, provide the appropriate login URL when calling this tool:
- **Sandbox orgs**: \`https://test.salesforce.com\`
- **Custom domains**: \`https://mycompany.my.salesforce.com\`
- **Scratch orgs**: Check your scratch org info for the specific URL
- **Partner/Trialforce orgs**: Use your organization-specific URL

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
- **Uncheck "Require Secret for Web Server Flow"** - Mobile applications don't need the Consumer Secret
- Make sure the Callback URL is exactly: \`sfdc://success\`
- After creating the app, it may take 2-10 minutes to become active
- Most developers can use the default login URL (https://login.salesforce.com)
- iOS apps: Omit "https://" prefix when configuring login host
- Android apps: Include "https://" prefix when configuring login URL

## Reference
For detailed instructions, see: https://help.salesforce.com/s/articleView?id=platform.ev_relay_create_connected_app.htm&language=en_US&type=5

## Providing Credentials to This Tool

### If using default login URL (production/developer org):
Provide only your Consumer Key:
\`\`\`json
{
  "consumerKey": "3MVG9A2kN3Bn17h..."
}
\`\`\`

### If using custom login URL (sandbox/custom domain):
Provide both Consumer Key and login URL:
\`\`\`json
{
  "consumerKey": "3MVG9A2kN3Bn17h...",
  "loginUrl": "https://test.salesforce.com"
}
\`\`\`

Once you have your Consumer Key (and custom login URL if needed), provide them to this tool to validate and store the configuration.`;
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

      // Validate and normalize login URL
      let loginUrl = params.loginUrl || 'https://login.salesforce.com';

      // Auto-add https:// if missing
      if (loginUrl && !loginUrl.startsWith('http://') && !loginUrl.startsWith('https://')) {
        loginUrl = `https://${loginUrl}`;
      }

      // Comprehensive Salesforce login URL validation patterns
      const validLoginUrlPatterns = [
        // Standard Salesforce URLs
        /^https:\/\/login\.salesforce\.com$/,
        /^https:\/\/test\.salesforce\.com$/,

        // My Domain URLs
        /^https:\/\/[a-zA-Z0-9-]+\.my\.salesforce\.com$/,

        // Scratch org and sandbox URLs
        /^https:\/\/[a-zA-Z0-9-]+--[a-zA-Z0-9-]+\.my\.salesforce\.com$/,

        // Partner Community and test environments (pc-rnd, cs1, etc.)
        /^https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.my\.[a-zA-Z0-9-]+\.salesforce\.com$/,

        // Enhanced My Domain with additional subdomains
        /^https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.my\.salesforce\.com$/,

        // Sandbox URLs with various patterns
        /^https:\/\/[a-zA-Z0-9-]+\.sandbox\.my\.salesforce\.com$/,

        // Developer edition and trailhead playground URLs
        /^https:\/\/[a-zA-Z0-9-]+\.develop\.my\.salesforce\.com$/,

        // Custom domains (more flexible pattern)
        /^https:\/\/[a-zA-Z0-9.-]+\.salesforce\.com$/,
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
                    `Login URL "${loginUrl}" is not recognized as a valid Salesforce login URL. ` +
                    'Supported formats include:\n' +
                    '• https://login.salesforce.com (Production)\n' +
                    '• https://test.salesforce.com (Sandbox)\n' +
                    '• https://mydomain.my.salesforce.com (My Domain)\n' +
                    '• https://mydomain--sandbox.my.salesforce.com (Sandbox My Domain)\n' +
                    '• https://mydomain.test1.my.pc-rnd.salesforce.com (Partner/Test environments)\n' +
                    '• Custom Salesforce domains ending in .salesforce.com\n\n' +
                    'Note: You can omit "https://" - it will be added automatically.',
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
