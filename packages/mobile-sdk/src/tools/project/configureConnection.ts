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
  ProjectConfigurationRequest,
  ProjectConfigurationResponse,
  type ProjectConfigurationRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { FileUtils } from '../../utils/fileUtils.js';
import { join } from 'path';

export class ProjectConfigurationTool implements Tool {
  readonly name = 'Configure Project Connection';
  readonly toolId = 'project-configure-connection';
  readonly description =
    "Injects the Connected App credentials into the scaffolded project's configuration files for the correct platform.";
  readonly inputSchema = ProjectConfigurationRequest;
  readonly outputSchema = ProjectConfigurationResponse;

  private async detectPlatform(projectPath: string): Promise<string | null> {
    // Check for iOS-specific files
    if (await FileUtils.exists(join(projectPath, 'bootconfig.plist'))) {
      return 'ios';
    }

    // Check for .xcodeproj directory (iOS projects)
    try {
      const files = await FileUtils.readDirectory(projectPath);
      if (files.some(file => file.endsWith('.xcodeproj'))) {
        return 'ios';
      }
    } catch {
      // Directory might not exist or be readable
    }

    // Check for Android-specific files
    if (
      (await FileUtils.exists(join(projectPath, 'build.gradle'))) ||
      (await FileUtils.exists(join(projectPath, 'app', 'build.gradle')))
    ) {
      return 'android';
    }

    // Check for React Native/Cordova files
    if (await FileUtils.exists(join(projectPath, 'package.json'))) {
      const packageJson = await FileUtils.readJsonFile(join(projectPath, 'package.json'));
      if (packageJson && typeof packageJson === 'object' && 'dependencies' in packageJson) {
        const deps = (packageJson as { dependencies?: Record<string, string> }).dependencies;
        if (deps?.['react-native']) {
          return 'react-native';
        }
        if (deps?.['cordova']) {
          return 'hybrid';
        }
      }
    }

    // Check for Cordova/PhoneGap
    if (await FileUtils.exists(join(projectPath, 'config.xml'))) {
      return 'hybrid';
    }

    return null;
  }

  private generateIOSConfig(consumerKey: string, callbackUrl: string): string {
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

  private generateAndroidConfig(consumerKey: string, callbackUrl: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="remoteAccessConsumerKey">${consumerKey}</string>
    <string name="oauthRedirectURI">${callbackUrl}</string>
    <string-array name="oauthScopes">
        <item>api</item>
        <item>web</item>
        <item>refresh_token</item>
        <item>offline_access</item>
    </string-array>
</resources>`;
  }

  private generateJSONConfig(consumerKey: string, callbackUrl: string): object {
    return {
      remoteAccessConsumerKey: consumerKey,
      oauthRedirectURI: callbackUrl,
      oauthScopes: ['api', 'web', 'refresh_token', 'offline_access'],
      isLocal: false,
      shouldAuthenticate: true,
      attemptOfflineLoad: false,
    };
  }

  private async configureIOSProject(
    projectPath: string,
    consumerKey: string,
    callbackUrl: string
  ): Promise<string[]> {
    const configuredFiles: string[] = [];
    const configContent = this.generateIOSConfig(consumerKey, callbackUrl);

    // Look for bootconfig.plist in common locations
    const possiblePaths = [
      join(projectPath, 'bootconfig.plist'),
      join(projectPath, 'Resources', 'bootconfig.plist'),
      join(projectPath, '*/Resources/bootconfig.plist'), // Wildcard for app name directory
    ];

    for (const path of possiblePaths) {
      if (await FileUtils.exists(path)) {
        await FileUtils.writeFile(path, configContent);
        configuredFiles.push(path);
      }
    }

    // If no existing file found, create one in the project root
    if (configuredFiles.length === 0) {
      const defaultPath = join(projectPath, 'bootconfig.plist');
      await FileUtils.writeFile(defaultPath, configContent);
      configuredFiles.push(defaultPath);
    }

    return configuredFiles;
  }

  private async configureAndroidProject(
    projectPath: string,
    consumerKey: string,
    callbackUrl: string
  ): Promise<string[]> {
    const configuredFiles: string[] = [];
    const configContent = this.generateAndroidConfig(consumerKey, callbackUrl);

    // Look for bootconfig.xml in common locations
    const possiblePaths = [
      join(projectPath, 'res', 'values', 'bootconfig.xml'),
      join(projectPath, 'app', 'src', 'main', 'res', 'values', 'bootconfig.xml'),
      join(projectPath, 'src', 'main', 'res', 'values', 'bootconfig.xml'),
    ];

    for (const path of possiblePaths) {
      // Ensure the directory exists before writing
      await FileUtils.ensureDirectory(join(path, '..'));

      if (await FileUtils.exists(path)) {
        await FileUtils.writeFile(path, configContent);
        configuredFiles.push(path);
      }
    }

    // If no existing file found, create one in the most likely location
    if (configuredFiles.length === 0) {
      const defaultPath = join(
        projectPath,
        'app',
        'src',
        'main',
        'res',
        'values',
        'bootconfig.xml'
      );
      await FileUtils.ensureDirectory(join(defaultPath, '..'));
      await FileUtils.writeFile(defaultPath, configContent);
      configuredFiles.push(defaultPath);
    }

    return configuredFiles;
  }

  private async configureHybridProject(
    projectPath: string,
    consumerKey: string,
    callbackUrl: string
  ): Promise<string[]> {
    const configuredFiles: string[] = [];
    const configContent = this.generateJSONConfig(consumerKey, callbackUrl);

    // Look for bootconfig.json in common locations
    const possiblePaths = [
      join(projectPath, 'bootconfig.json'),
      join(projectPath, 'www', 'bootconfig.json'),
      join(projectPath, 'platforms', 'ios', 'www', 'bootconfig.json'),
      join(projectPath, 'platforms', 'android', 'assets', 'www', 'bootconfig.json'),
    ];

    for (const path of possiblePaths) {
      if (await FileUtils.exists(path)) {
        await FileUtils.writeJsonFile(path, configContent);
        configuredFiles.push(path);
      }
    }

    // If no existing file found, create one in the www directory
    if (configuredFiles.length === 0) {
      const defaultPath = join(projectPath, 'www', 'bootconfig.json');
      await FileUtils.ensureDirectory(join(defaultPath, '..'));
      await FileUtils.writeJsonFile(defaultPath, configContent);
      configuredFiles.push(defaultPath);
    }

    return configuredFiles;
  }

  private async handleRequest(params: ProjectConfigurationRequestType) {
    try {
      // Verify project directory exists
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
      const platform = await this.detectPlatform(params.projectPath);
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

      // Configure based on platform
      let configuredFiles: string[] = [];

      switch (platform) {
        case 'ios':
          configuredFiles = await this.configureIOSProject(
            params.projectPath,
            params.consumerKey,
            params.callbackUrl
          );
          break;
        case 'android':
          configuredFiles = await this.configureAndroidProject(
            params.projectPath,
            params.consumerKey,
            params.callbackUrl
          );
          break;
        case 'react-native':
        case 'hybrid':
          configuredFiles = await this.configureHybridProject(
            params.projectPath,
            params.consumerKey,
            params.callbackUrl
          );
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

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                configuredFiles,
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
