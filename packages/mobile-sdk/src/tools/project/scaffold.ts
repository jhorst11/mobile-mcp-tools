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
  ProjectScaffoldGuidanceRequest,
  ProjectScaffoldGuidanceResponse,
  type ProjectScaffoldGuidanceRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { resolve, join, dirname, basename } from 'path';

export class ProjectScaffoldTool implements Tool {
  readonly name = 'Project Scaffold Guidance';
  readonly toolId = 'project-scaffold';
  readonly description =
    'Provides step-by-step guidance for creating Salesforce Mobile SDK projects using forceios, forcedroid, or forcereact CLIs.';
  readonly inputSchema = ProjectScaffoldGuidanceRequest;
  readonly outputSchema = ProjectScaffoldGuidanceResponse;

  private generateGeneralGuidance(): string {
    return `# Salesforce Mobile SDK Project Scaffolding Guide

## Overview
The Salesforce Mobile SDK provides CLI tools to create new projects for different platforms:
- **forceios** - For iOS native Swift projects
- **forcedroid** - For Android native Kotlin projects  
- **forcereact** - For React Native cross-platform projects

## Prerequisites
Before scaffolding a project, ensure you have the correct CLI installed:

### iOS Projects (macOS only)
\`\`\`bash
npm install -g forceios
\`\`\`

### Android Projects
\`\`\`bash
npm install -g forcedroid
\`\`\`

### React Native Projects
\`\`\`bash
npm install -g forcereact
\`\`\`

## Common Parameters
All CLI tools use consistent parameter names:
- **App Name**: User-friendly name for your application (--appname)
- **Package Name**: Reverse domain identifier (--packagename, e.g., com.company.appname)  
- **Organization**: Your company or organization name (--organization)
- **Output Directory**: Where to create the project (--outputdir)

## Example Usage

### iOS Native Project
\`\`\`bash
# Navigate to the parent directory where you want to create the project
cd /path/to/parent/directory

# CLI will create the project directory for you
forceios create \\
  --apptype=native_swift \\
  --appname="My Mobile App" \\
  --packagename=com.company.mymobileapp \\
  --organization="My Company" \\
  --outputdir=MyMobileApp
\`\`\`

### Android Native Project
\`\`\`bash
# Navigate to the parent directory where you want to create the project
cd /path/to/parent/directory

# CLI will create the project directory for you
forcedroid create \\
  --apptype=native_kotlin \\
  --appname="My Mobile App" \\
  --packagename=com.company.mymobileapp \\
  --organization="My Company" \\
  --outputdir=MyMobileApp
\`\`\`

### React Native Project
\`\`\`bash
# Navigate to the parent directory where you want to create the project
cd /path/to/parent/directory

# CLI will create the project directory for you
forcereact create \\
  --apptype=react_native \\
  --appname="My Mobile App" \\
  --packagename=com.company.mymobileapp \\
  --organization="My Company" \\
  --outputdir=MyMobileApp
\`\`\`

## Important Notes
- The CLI tools will create the project directory for you - don't create it beforehand
- Run the commands from the parent directory where you want the project to be created
- The --outputdir parameter should be just the directory name, not a full path

## Next Steps
After creating your project:
1. Navigate to the project directory
2. Configure your Connected App credentials using the project-configure-connection tool
3. Build and run your project using the build-run-on-simulator tool

To get specific commands for your project parameters, provide them to this tool.`;
  }

  private generateSpecificGuidance(params: ProjectScaffoldGuidanceRequestType): {
    success: boolean;
    guidance: string;
    commands: string[];
    projectPath?: string;
    error?: string;
  } {
    // Validate required parameters if any are provided
    if (params.platform) {
      if (!params.appName || !params.packageId || !params.organization || !params.outputDir) {
        return {
          success: false,
          error:
            'When platform is specified, appName, packageId, organization, and outputDir are all required.',
          guidance: this.generateGeneralGuidance(),
          commands: [],
        };
      }

      // Validate package ID format
      const packageIdRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
      if (!packageIdRegex.test(params.packageId)) {
        return {
          success: false,
          error: 'Package ID must be in reverse domain format (e.g., com.company.app)',
          guidance: this.generateGeneralGuidance(),
          commands: [],
        };
      }

      // Platform-specific validations
      if (params.platform === 'ios' && process.platform !== 'darwin') {
        return {
          success: false,
          error: 'iOS development is only supported on macOS',
          guidance: this.generateGeneralGuidance(),
          commands: [],
        };
      }

      // Generate specific commands
      const outputDir = resolve(params.outputDir);
      const parentDir = dirname(outputDir);
      const projectDirName = basename(outputDir);
      const projectPath = join(outputDir, params.appName);

      let commands: string[] = [];
      let cliName: string;
      let guidance: string;

      switch (params.platform.toLowerCase()) {
        case 'ios':
          cliName = 'forceios';
          commands = [
            `mkdir -p "${parentDir}"`,
            `cd "${parentDir}"`,
            `${cliName} create \\`,
            `  --apptype=native_swift \\`,
            `  --appname="${params.appName}" \\`,
            `  --packagename=${params.packageId} \\`,
            `  --organization="${params.organization}" \\`,
            `  --outputdir="${projectDirName}"`,
          ];
          guidance = `# iOS Project Scaffolding Commands

Run these commands to create your iOS project:

\`\`\`bash
${commands.join('\n')}
\`\`\`

Your project will be created at: ${projectPath}

## Next Steps:
1. Open the project in Xcode: \`open "${projectPath}/${params.appName}.xcworkspace"\`
2. Configure Connected App credentials using the project-configure-connection tool
3. Build and run using the build-run-on-simulator tool`;
          break;

        case 'android':
          cliName = 'forcedroid';
          commands = [
            `mkdir -p "${parentDir}"`,
            `cd "${parentDir}"`,
            `${cliName} create \\`,
            `  --apptype=native_kotlin \\`,
            `  --appname="${params.appName}" \\`,
            `  --packagename=${params.packageId} \\`,
            `  --organization="${params.organization}" \\`,
            `  --outputdir="${projectDirName}"`,
          ];
          guidance = `# Android Project Scaffolding Commands

Run these commands to create your Android project:

\`\`\`bash
${commands.join('\n')}
\`\`\`

Your project will be created at: ${projectPath}

## Next Steps:
1. Open the project in Android Studio: \`open "${projectPath}"\`
2. Configure Connected App credentials using the project-configure-connection tool
3. Build and run using the build-run-on-simulator tool`;
          break;

        case 'react-native':
          cliName = 'forcereact';
          commands = [
            `mkdir -p "${parentDir}"`,
            `cd "${parentDir}"`,
            `${cliName} create \\`,
            `  --apptype=react_native \\`,
            `  --appname="${params.appName}" \\`,
            `  --packagename=${params.packageId} \\`,
            `  --organization="${params.organization}" \\`,
            `  --outputdir="${projectDirName}"`,
          ];
          guidance = `# React Native Project Scaffolding Commands

Run these commands to create your React Native project:

\`\`\`bash
${commands.join('\n')}
\`\`\`

Your project will be created at: ${projectPath}

## Next Steps:
1. Install dependencies: \`cd "${projectPath}" && npm install\`
2. Configure Connected App credentials using the project-configure-connection tool
3. Build and run using the build-run-on-simulator tool`;
          break;

        default:
          return {
            success: false,
            error: `Unsupported platform: ${params.platform}`,
            guidance: this.generateGeneralGuidance(),
            commands: [],
          };
      }

      return {
        success: true,
        guidance,
        commands,
        projectPath,
      };
    }

    // No platform specified, return general guidance
    return {
      success: true,
      guidance: this.generateGeneralGuidance(),
      commands: [],
    };
  }

  private async handleRequest(params: ProjectScaffoldGuidanceRequestType) {
    try {
      const result = this.generateSpecificGuidance(params);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error generating project guidance: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
