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
  BuildGuidanceRequest,
  BuildGuidanceResponse,
  type BuildGuidanceRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { BuildManager } from '../../utils/buildManager.js';
import { FileUtils } from '../../utils/fileUtils.js';
import { DesignUtils } from '../../utils/designUtils.js';
import { join } from 'path';

export class BuildProjectTool implements Tool {
  readonly name = 'Build Project';
  readonly toolId = 'build-project';
  readonly description =
    'Provides step-by-step guidance and exact commands for building Mobile SDK projects. Analyzes project structure and generates platform-specific build commands.';
  readonly inputSchema = BuildGuidanceRequest;
  readonly outputSchema = BuildGuidanceResponse;

  private async handleRequest(params: BuildGuidanceRequestType) {
    try {
      // Validate project exists
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
      const platform = await BuildManager.detectPlatform(params.projectPath);
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

      // Generate platform-specific guidance
      let guidance: string;
      let commands: string[];
      let buildLogPath: string;
      let expectedAppPath: string;

      switch (platform) {
        case 'ios': {
          const iosResult = await this.generateIOSBuildGuidance(params);
          guidance = iosResult.guidance;
          commands = iosResult.commands;
          buildLogPath = iosResult.buildLogPath;
          expectedAppPath = iosResult.expectedAppPath;
          break;
        }
        case 'android': {
          const androidResult = await this.generateAndroidBuildGuidance(params);
          guidance = androidResult.guidance;
          commands = androidResult.commands;
          buildLogPath = androidResult.buildLogPath;
          expectedAppPath = androidResult.expectedAppPath;
          break;
        }
        default:
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Platform '${platform}' build guidance not yet implemented`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
      }

      // Add design document reference to guidance
      const designReminder = DesignUtils.generateDesignReminder(params.projectPath);
      const phaseCheck = DesignUtils.checkPhaseAlignment(params.projectPath, 'build');

      guidance += designReminder;

      if (phaseCheck.recommendation) {
        guidance += `
## 🎯 **PHASE ALIGNMENT CHECK**

${phaseCheck.recommendation}

**💡 Tip:** Reference your design document to ensure you're building the right features at the right time according to your implementation roadmap.
`;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                platform,
                guidance,
                commands,
                buildLogPath,
                expectedAppPath,
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
            text: `Error generating build guidance: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  private async generateIOSBuildGuidance(params: BuildGuidanceRequestType): Promise<{
    guidance: string;
    commands: string[];
    buildLogPath: string;
    expectedAppPath: string;
  }> {
    const projectPath = params.projectPath;
    const configuration = params.configuration === 'release' ? 'Release' : 'Debug';
    const buildLogPath = join(projectPath, 'build.log');

    // Find workspace or project file
    const workspaceFiles = await this.findXcodeFiles(projectPath);
    if (workspaceFiles.length === 0) {
      throw new Error('No Xcode workspace or project file found');
    }

    const buildTarget = workspaceFiles[0];
    const isWorkspace = buildTarget.endsWith('.xcworkspace');
    const scheme = await this.getIOSScheme(projectPath, buildTarget);

    const buildArgs = [
      'xcodebuild',
      isWorkspace ? '-workspace' : '-project',
      buildTarget,
      '-scheme',
      scheme,
      '-configuration',
      configuration,
      '-sdk',
      'iphonesimulator',
      '-destination',
      'generic/platform=iOS Simulator',
    ];

    if (params.clean) {
      buildArgs.push('clean');
    }
    buildArgs.push('build');

    const commands = [`cd "${projectPath}"`, `${buildArgs.join(' ')} 2>&1 | tee build.log`];

    const expectedAppPath = join(
      projectPath,
      'build',
      `${configuration}-iphonesimulator`,
      `${scheme}.app`
    );

    const guidance = `# iOS Build Guidance

## Project Analysis
- **Project Path**: ${projectPath}
- **Build Target**: ${buildTarget}
- **Scheme**: ${scheme}
- **Configuration**: ${configuration}
- **Platform**: iOS Simulator

## Build Commands

Execute these commands in order:

\`\`\`bash
${commands.join('\n')}
\`\`\`

## Build Verification

After running the build commands:

1. **Check build log**: \`cat build.log\`
   - Look for "BUILD SUCCEEDED" at the end
   - Note any warnings or errors

2. **Verify app was built**: Check if the app exists:
   \`\`\`bash
   ls -la "${expectedAppPath}"
   \`\`\`

3. **Find actual app location** (if not at expected path):
   \`\`\`bash
   find "${projectPath}" -name "*.app" -type d | grep ${configuration}-iphonesimulator
   \`\`\`

## Next Steps

After successful build verification:
- Use the **deploy-guidance** tool to install and run the app on simulator
- Provide the actual app path found during verification

## Troubleshooting

**Build Failures:**
- Check build.log for specific error messages
- Ensure Xcode Command Line Tools are installed: \`xcode-select --install\`
- Try cleaning: Add \`clean\` to the build command
- Check that the simulator SDK is available: \`xcodebuild -showsdks\`

**Missing App:**
- Build may have succeeded but app not where expected
- Use the find command above to locate the actual .app bundle
- Check for different configuration names or schemes`;

    return {
      guidance,
      commands,
      buildLogPath,
      expectedAppPath,
    };
  }

  private async generateAndroidBuildGuidance(params: BuildGuidanceRequestType): Promise<{
    guidance: string;
    commands: string[];
    buildLogPath: string;
    expectedAppPath: string;
  }> {
    const projectPath = params.projectPath;
    const buildLogPath = join(projectPath, 'build.log');

    const gradlewPath = (await FileUtils.exists(join(projectPath, 'gradlew')))
      ? './gradlew'
      : 'gradlew';

    const buildTask = params.configuration === 'release' ? 'assembleRelease' : 'assembleDebug';

    const buildArgs = [gradlewPath];
    if (params.clean) {
      buildArgs.push('clean');
    }
    buildArgs.push(buildTask);

    const commands = [`cd "${projectPath}"`, `${buildArgs.join(' ')} 2>&1 | tee build.log`];

    const configName = params.configuration === 'release' ? 'release' : 'debug';
    const expectedAppPath = join(
      projectPath,
      'app',
      'build',
      'outputs',
      'apk',
      configName,
      `app-${configName}.apk`
    );

    const guidance = `# Android Build Guidance

## Project Analysis
- **Project Path**: ${projectPath}
- **Gradle Wrapper**: ${gradlewPath}
- **Build Task**: ${buildTask}
- **Configuration**: ${params.configuration}

## Build Commands

Execute these commands in order:

\`\`\`bash
${commands.join('\n')}
\`\`\`

## Build Verification

After running the build commands:

1. **Check build log**: \`cat build.log\`
   - Look for "BUILD SUCCESSFUL" at the end
   - Note any warnings or errors

2. **Verify APK was built**: Check if the APK exists:
   \`\`\`bash
   ls -la "${expectedAppPath}"
   \`\`\`

3. **Find actual APK location** (if not at expected path):
   \`\`\`bash
   find "${projectPath}" -name "*${configName}.apk" -type f
   \`\`\`

## Next Steps

After successful build verification:
- Use the **deploy-guidance** tool to install and run the APK on emulator
- Provide the actual APK path found during verification

## Troubleshooting

**Build Failures:**
- Check build.log for specific error messages
- Ensure Android SDK is properly configured
- Check ANDROID_HOME environment variable
- Try cleaning: Add \`clean\` to the build command
- Ensure emulator/device connectivity: \`adb devices\``;

    return {
      guidance,
      commands,
      buildLogPath,
      expectedAppPath,
    };
  }

  private async findXcodeFiles(projectPath: string): Promise<string[]> {
    try {
      const files = await FileUtils.readDirectory(projectPath);
      const xcodeFiles = files.filter(
        file => file.endsWith('.xcworkspace') || file.endsWith('.xcodeproj')
      );

      // Prefer workspace over project
      const workspace = xcodeFiles.find(file => file.endsWith('.xcworkspace'));
      if (workspace) {
        return [join(projectPath, workspace)];
      }

      const project = xcodeFiles.find(file => file.endsWith('.xcodeproj'));
      if (project) {
        return [join(projectPath, project)];
      }

      return [];
    } catch {
      return [];
    }
  }

  private async getIOSScheme(projectPath: string, buildTarget: string): Promise<string> {
    // Default scheme name (often matches project name)
    const projectName = buildTarget
      .split('/')
      .pop()
      ?.replace(/\.(xcworkspace|xcodeproj)$/, '');
    return projectName || 'MyApp';
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
