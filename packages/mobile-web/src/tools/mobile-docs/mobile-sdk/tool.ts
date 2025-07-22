/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';
import { Tool } from '../../tool.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import dedent from 'dedent';

const EMPTY_INPUT_SCHEMA = z.object({}).describe('No input required');

export class MobileSdkTool implements Tool {
  readonly name = 'Salesforce Mobile SDK for iOS';
  readonly description =
    'Provides comprehensive guidance for creating native iOS applications using the Salesforce Mobile SDK and forceios CLI. Includes installation, project setup, authentication patterns, and development best practices for building native iOS apps that integrate with Salesforce.';
  readonly toolId = 'sfmobile-docs-mobile-sdk';
  readonly inputSchema = EMPTY_INPUT_SCHEMA;

  public register(server: McpServer, annotations: ToolAnnotations): void {
    server.registerTool(
      this.toolId,
      {
        description: this.description,
        inputSchema: this.inputSchema.shape,
        annotations: annotations,
      },
      async () => {
        try {
          const mobileSdkContent = this.getMobileSdkContent();

          return {
            content: [
              {
                type: 'text',
                text: mobileSdkContent,
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Failed to generate Mobile SDK content: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }
      }
    );
  }

  private getMobileSdkContent(): string {
    return dedent`
      # Salesforce Mobile SDK for iOS - Getting Started

      ## Overview

      Create native iOS applications that integrate with Salesforce using the Mobile SDK. The SDK provides built-in authentication, data access, and offline capabilities.

      ## Quick Setup

      **Prerequisites**: Xcode 14.0+, Node.js 18+, CocoaPods, Salesforce org access

      **Installation**:
      \`\`\`bash
      # Install forceios CLI
      sudo npm install -g forceios

      # Verify installation  
      forceios version
      \`\`\`

      **Create Project**:
      \`\`\`bash
      # Create new iOS project
      forceios create --apptype native --appname MyApp --companyid com.company.myapp --organization "My Company"

      # Navigate and setup
      cd MyApp
      pod install
      open MyApp.xcworkspace
      \`\`\`

      ## Key Configuration

      **Update bootconfig.plist**:
      \`\`\`xml
      <key>remoteAccessConsumerKey</key>
      <string>YOUR_CONNECTED_APP_CONSUMER_KEY</string>
      <key>oauthRedirectURI</key>  
      <string>myapp://auth/success</string>
      \`\`\`

      ## Development Examples

      **Authentication**:
      \`\`\`swift
      import SalesforceSDKCore
      if let user = UserAccountManager.shared.currentUserAccount {
          print("User: \\(user.userName)")
      }
      \`\`\`

      **Data Access**:
      \`\`\`swift
      let query = "SELECT Id, Name FROM Account LIMIT 10"
      RestClient.shared.performSOQLQuery(query) { (result, error) in
          // Process results
      }
      \`\`\`

      ## Official Documentation

      📚 **Primary Resources**:
      - [Mobile SDK Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/)
      - [iOS Development Setup](https://trailhead.salesforce.com/content/learn/projects/mobilesdk_setup_dev_tools/mobilesdk_setup_ios)
      - [Native iOS Development](https://trailhead.salesforce.com/content/learn/modules/mobile_sdk_native_ios)

      🔧 **Technical Resources**:
      - [iOS SDK Source Code](https://github.com/forcedotcom/SalesforceMobileSDK-iOS)  
      - [Sample Applications](https://github.com/forcedotcom/SalesforceMobileSDK-iOS-Samples)
      - [API Reference](https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/ios_native.htm)

      🎓 **Learning Paths**:
      - [Mobile SDK Basics](https://trailhead.salesforce.com/content/learn/modules/mobile_sdk_introduction)
      - [iOS App Development Trail](https://trailhead.salesforce.com/content/learn/trails/start-ios-appdev)

             ## Getting Help

       - [Salesforce Developer Community](https://developer.salesforce.com/forums)
       - [Stack Overflow: salesforce-mobile-sdk](https://stackoverflow.com/questions/tagged/salesforce-mobile-sdk)
       - [GitHub Issues](https://github.com/forcedotcom/SalesforceMobileSDK-iOS/issues)
     `;
  }
}
