/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Tool } from '../tool.js';
import {
  ProjectConfigurationRequest,
  ProjectConfigurationResponse,
  type ProjectConfigurationRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { FileUtils } from '../../utils/fileUtils.js';
import { join } from 'path';

export class CreateConfigurationTool implements Tool {
  readonly name = 'Create Configuration';
  readonly toolId = 'create-configuration';
  readonly description =
    'Configures the Mobile SDK project with Connected App credentials following official Salesforce documentation. Updates bootconfig.plist for OAuth credentials and Info.plist for custom login hosts.';
  readonly inputSchema = ProjectConfigurationRequest;
  readonly outputSchema = ProjectConfigurationResponse;

  private async detectPlatform(
    projectPath: string
  ): Promise<{ platform: string | null; error?: string }> {
    // Check if project directory exists first
    if (!(await FileUtils.exists(projectPath))) {
      return {
        platform: null,
        error: `Project directory does not exist: ${projectPath}`,
      };
    }

    // Check for iOS-specific files by reading directory contents
    try {
      const files = await FileUtils.readDirectory(projectPath);

      // Check for Xcode project files
      const hasXcodeProject = files.some(file => file.endsWith('.xcodeproj'));
      const hasXcodeWorkspace = files.some(file => file.endsWith('.xcworkspace'));

      if (hasXcodeProject || hasXcodeWorkspace) {
        return { platform: 'ios' };
      }

      // Check for iOS subdirectory (React Native structure)
      if (files.includes('ios')) {
        return { platform: 'ios' };
      }

      // Check for Android-specific files
      if (
        files.includes('android') ||
        (await FileUtils.exists(join(projectPath, 'build.gradle'))) ||
        (await FileUtils.exists(join(projectPath, 'app', 'build.gradle')))
      ) {
        return { platform: 'android' };
      }

      // Check for React Native
      if (files.includes('package.json')) {
        try {
          const packageJson = await FileUtils.readJsonFile(join(projectPath, 'package.json'));
          if (packageJson && typeof packageJson === 'object' && 'dependencies' in packageJson) {
            const deps = (packageJson as { dependencies?: Record<string, string> }).dependencies;
            if (deps?.['react-native']) {
              return { platform: 'react-native' };
            }
          }
        } catch {
          // Ignore JSON parsing errors
        }
      }

      // Check for Cordova/PhoneGap
      if (files.includes('config.xml')) {
        return { platform: 'hybrid' };
      }

      // Directory exists but no Mobile SDK markers found
      return {
        platform: null,
        error: `Directory exists but no Mobile SDK project files found. Looking for:
- iOS: .xcodeproj or .xcworkspace files
- Android: android directory or build.gradle files  
- React Native: package.json with react-native dependency
- Hybrid: config.xml file

Found files: ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`,
      };
    } catch (error) {
      console.error('Error detecting project platform:', error);
      return {
        platform: null,
        error: `Error reading project directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private generateIOSBootConfig(consumerKey: string, callbackUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>remoteAccessConsumerKey</key>
    <string>${consumerKey}</string>
    <key>oauthRedirectURI</key>
    <string>${callbackUrl}</string>
    <key>oauthScopes</key>
    <array>
        <string>api</string>
        <string>web</string>
        <string>refresh_token</string>
        <string>offline_access</string>
    </array>
    <key>isLocal</key>
    <false/>
    <key>shouldAuthenticate</key>
    <true/>
    <key>attemptOfflineLoad</key>
    <false/>
</dict>
</plist>`;
  }

  private async updateInfoPlistWithLoginHost(infoPath: string, loginUrl: string): Promise<void> {
    // Remove https:// protocol as per official documentation
    // "Do not use a protocol prefix such as "https://" when specifying the login URI."
    const loginHost = loginUrl.replace(/^https?:\/\//, '');

    try {
      // Read existing info.plist content
      let content = '';
      if (await FileUtils.exists(infoPath)) {
        content = await FileUtils.readFile(infoPath);
      } else {
        throw new Error(`Info.plist not found at ${infoPath}`);
      }

      // Check if SFDCOAuthLoginHost already exists
      if (content.includes('<key>SFDCOAuthLoginHost</key>')) {
        // Replace existing value
        content = content.replace(
          /(<key>SFDCOAuthLoginHost<\/key>\s*<string>)[^<]*(<\/string>)/,
          `$1${loginHost}$2`
        );
        console.log(`✅ Updated existing SFDCOAuthLoginHost in ${infoPath}`);
      } else {
        // Add new SFDCOAuthLoginHost property before closing </dict>
        content = content.replace(
          '</dict>',
          `\t<key>SFDCOAuthLoginHost</key>
\t<string>${loginHost}</string>
</dict>`
        );
        console.log(`✅ Added SFDCOAuthLoginHost to ${infoPath}`);
      }

      await FileUtils.writeFile(infoPath, content);
      console.log(
        `📋 Official Documentation: https://developer.salesforce.com/docs/platform/mobile-sdk/guide/oauth-custom-login-host-ios.html`
      );
      console.log(`🎯 Configured login host: ${loginHost} (protocol prefix removed as required)`);
    } catch (error) {
      console.error(`❌ Failed to update Info.plist: ${error}`);
      throw error;
    }
  }

  private async findAllBootconfigFiles(projectPath: string): Promise<string[]> {
    const bootconfigFiles: string[] = [];

    try {
      // Use find command to locate all bootconfig.plist files, excluding SDK samples
      const { CommandRunner } = await import('../../utils/commandRunner.js');
      const result = await CommandRunner.run(
        'find',
        [
          projectPath,
          '-name',
          'bootconfig.plist',
          '-type',
          'f',
          '!',
          '-path',
          '*/mobile_sdk/*', // Exclude SDK directory
          '!',
          '-path',
          '*/SampleApps/*', // Exclude sample apps
          '!',
          '-path',
          '*/Pods/*', // Exclude CocoaPods
          '!',
          '-path',
          '*/Build/*', // Exclude build artifacts
        ],
        { cwd: projectPath }
      );

      if (result.success && result.stdout) {
        const files = result.stdout.trim().split('\n').filter(Boolean);
        bootconfigFiles.push(...files);
      }
    } catch (error) {
      console.warn('Error finding bootconfig files with find command:', error);

      // Fallback to manual checking of common locations
      const commonPaths = [
        join(projectPath, 'bootconfig.plist'),
        join(projectPath, 'Resources', 'bootconfig.plist'),
      ];

      // Also check for app-specific bootconfig.plist (AppName/bootconfig.plist)
      try {
        const files = await FileUtils.readDirectory(projectPath);
        for (const file of files) {
          if (!file.includes('.') && !file.startsWith('.')) {
            // Likely a directory
            const appSpecificPath = join(projectPath, file, 'bootconfig.plist');
            commonPaths.push(appSpecificPath);
          }
        }
      } catch {
        // Ignore directory read errors
      }

      for (const path of commonPaths) {
        if (await FileUtils.exists(path)) {
          bootconfigFiles.push(path);
        }
      }
    }

    return bootconfigFiles;
  }

  private async findInfoPlistFiles(projectPath: string): Promise<string[]> {
    const infoPlistFiles: string[] = [];

    try {
      // Use find command to locate info.plist files, excluding SDK samples
      const { CommandRunner } = await import('../../utils/commandRunner.js');
      const result = await CommandRunner.run(
        'find',
        [
          projectPath,
          '-name',
          'Info.plist',
          '-type',
          'f',
          '!',
          '-path',
          '*/mobile_sdk/*', // Exclude SDK directory
          '!',
          '-path',
          '*/SampleApps/*', // Exclude sample apps
          '!',
          '-path',
          '*/Pods/*', // Exclude CocoaPods
          '!',
          '-path',
          '*/Build/*', // Exclude build artifacts
        ],
        { cwd: projectPath }
      );

      if (result.success && result.stdout) {
        const files = result.stdout.trim().split('\n').filter(Boolean);
        infoPlistFiles.push(...files);
      }
    } catch (error) {
      console.warn('Error finding info.plist files with find command:', error);

      // Fallback to checking common locations
      const commonPaths = [join(projectPath, 'Info.plist')];

      // Also check for app-specific info.plist (AppName/Info.plist)
      try {
        const files = await FileUtils.readDirectory(projectPath);
        for (const file of files) {
          if (!file.includes('.') && !file.startsWith('.')) {
            // Likely a directory
            const appSpecificPath = join(projectPath, file, 'Info.plist');
            commonPaths.push(appSpecificPath);
          }
        }
      } catch {
        // Ignore directory read errors
      }

      for (const path of commonPaths) {
        if (await FileUtils.exists(path)) {
          infoPlistFiles.push(path);
        }
      }
    }

    return infoPlistFiles;
  }

  private async configureIOSProject(
    projectPath: string,
    consumerKey: string,
    callbackUrl: string,
    loginUrl?: string
  ): Promise<string[]> {
    const configuredFiles: string[] = [];

    console.log(`\n🔧 Configuring iOS project following official Salesforce documentation...`);
    console.log(
      `📋 Reference: https://developer.salesforce.com/docs/platform/mobile-sdk/guide/oauth-custom-login-host-ios.html`
    );

    // Step 1: Configure bootconfig.plist files (for Connected App OAuth credentials)
    console.log(`\n📋 Step 1: Configuring bootconfig.plist for OAuth credentials`);
    const bootConfigContent = this.generateIOSBootConfig(consumerKey, callbackUrl);
    const bootconfigFiles = await this.findAllBootconfigFiles(projectPath);

    if (bootconfigFiles.length > 0) {
      console.log(`Found ${bootconfigFiles.length} bootconfig.plist file(s):`);
      for (const file of bootconfigFiles) {
        console.log(`  - ${file}`);
      }

      // Update all found bootconfig.plist files
      for (const path of bootconfigFiles) {
        try {
          await FileUtils.writeFile(path, bootConfigContent);
          configuredFiles.push(path);
          console.log(`✅ Updated bootconfig.plist: ${path}`);
        } catch (error) {
          console.error(`❌ Failed to update ${path}:`, error);
        }
      }
    } else {
      // No existing files found, create one in the project root
      const defaultPath = join(projectPath, 'bootconfig.plist');
      await FileUtils.writeFile(defaultPath, bootConfigContent);
      configuredFiles.push(defaultPath);
      console.log(`📝 Created new bootconfig.plist: ${defaultPath}`);
    }

    // Step 2: Configure Info.plist for custom login host (OFFICIAL APPROACH)
    const isDefaultLogin =
      !loginUrl ||
      loginUrl === 'https://login.salesforce.com' ||
      loginUrl === 'login.salesforce.com';

    if (!isDefaultLogin) {
      console.log(`\n📋 Step 2: Configuring Info.plist for custom login host (per official docs)`);
      console.log(`🎯 Login URL provided: ${loginUrl}`);

      try {
        // Find info.plist files in app directories
        const infoPlistFiles = await this.findInfoPlistFiles(projectPath);

        if (infoPlistFiles.length > 0) {
          console.log(`Found ${infoPlistFiles.length} Info.plist file(s):`);
          for (const file of infoPlistFiles) {
            console.log(`  - ${file}`);
          }

          for (const infoPath of infoPlistFiles) {
            try {
              await this.updateInfoPlistWithLoginHost(infoPath, loginUrl!);
              configuredFiles.push(infoPath);
            } catch (error) {
              console.error(`❌ Failed to update Info.plist ${infoPath}:`, error);
            }
          }
        } else {
          console.log(`⚠️ No Info.plist files found. Login host configuration skipped.`);
          console.log(`   Please manually add SFDCOAuthLoginHost to your app's Info.plist`);
        }
      } catch (error) {
        console.error(`❌ Error configuring login host:`, error);
      }
    } else {
      console.log(`\n📋 Step 2: Using default login host (login.salesforce.com)`);
      console.log(`ℹ️ No Info.plist update needed for default login host`);
    }

    return configuredFiles;
  }

  private async handleRequest(params: ProjectConfigurationRequestType) {
    try {
      const { projectPath, consumerKey, callbackUrl, loginUrl } = params;

      console.log(`\n🚀 Starting Mobile SDK project configuration...`);
      console.log(`📁 Project: ${projectPath}`);
      console.log(`🔑 Consumer Key: ${consumerKey.substring(0, 10)}...`);
      console.log(`🔗 Callback URL: ${callbackUrl}`);
      console.log(`🌐 Login URL: ${loginUrl || 'default (login.salesforce.com)'}`);

      // Detect platform
      const platformResult = await this.detectPlatform(projectPath);
      if (!platformResult.platform) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    platformResult.error ||
                    'Could not detect project platform. Ensure this is a valid Mobile SDK project.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const platform = platformResult.platform;
      console.log(`📱 Detected platform: ${platform}`);

      let configuredFiles: string[] = [];

      // Configure based on platform
      switch (platform) {
        case 'ios':
          configuredFiles = await this.configureIOSProject(
            projectPath,
            consumerKey,
            callbackUrl,
            loginUrl
          );
          break;
        case 'android':
          // Android configuration would go here
          console.log(`⚠️ Android configuration not yet implemented in this version`);
          break;
        case 'react-native':
          // React Native configuration would go here
          console.log(`⚠️ React Native configuration not yet implemented in this version`);
          break;
        default:
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Unsupported platform: ${platform}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
      }

      console.log(`\n✅ Configuration complete! Files updated: ${configuredFiles.length}`);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                configuredFiles,
                platform,
                loginHostConfigured:
                  loginUrl &&
                  loginUrl !== 'https://login.salesforce.com' &&
                  loginUrl !== 'login.salesforce.com',
                officialDocumentation:
                  'https://developer.salesforce.com/docs/platform/mobile-sdk/guide/oauth-custom-login-host-ios.html',
                summary: {
                  bootconfigUpdated: configuredFiles.filter(f => f.includes('bootconfig.plist'))
                    .length,
                  infoPlistUpdated: configuredFiles.filter(f => f.includes('Info.plist')).length,
                  customLoginHost:
                    loginUrl &&
                    loginUrl !== 'https://login.salesforce.com' &&
                    loginUrl !== 'login.salesforce.com'
                      ? loginUrl.replace(/^https?:\/\//, '')
                      : null,
                },
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
            text: `Error configuring project: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  async register(server: McpServer): Promise<void> {
    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      this.handleRequest.bind(this)
    );
  }
}
