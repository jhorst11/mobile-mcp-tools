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
  DeployGuidanceRequest,
  DeployGuidanceResponse,
  type DeployGuidanceRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { BuildManager } from '../../utils/buildManager.js';
import { DeviceManager } from '../../utils/deviceManager.js';
import { FileUtils } from '../../utils/fileUtils.js';

export class DeployAppTool implements Tool {
  readonly name = 'Deploy App';
  readonly toolId = 'deploy-app';
  readonly description =
    'Provides step-by-step guidance for deploying and verifying Mobile SDK apps on simulators/emulators. Generates platform-specific deployment and verification commands.';
  readonly inputSchema = DeployGuidanceRequest;
  readonly outputSchema = DeployGuidanceResponse;

  private async handleRequest(params: DeployGuidanceRequestType) {
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
      let verificationCommands: string[];
      let deviceInfo: { deviceId: string; deviceName: string } | undefined;

      switch (platform) {
        case 'ios': {
          const iosResult = await this.generateIOSDeployGuidance(params);
          guidance = iosResult.guidance;
          commands = iosResult.commands;
          verificationCommands = iosResult.verificationCommands;
          deviceInfo = iosResult.deviceInfo;
          break;
        }
        case 'android': {
          const androidResult = await this.generateAndroidDeployGuidance(params);
          guidance = androidResult.guidance;
          commands = androidResult.commands;
          verificationCommands = androidResult.verificationCommands;
          deviceInfo = androidResult.deviceInfo;
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
                    error: `Platform '${platform}' deploy guidance not yet implemented`,
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
                platform,
                guidance,
                commands,
                verificationCommands,
                deviceInfo,
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
            text: `Error generating deploy guidance: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  private async generateIOSDeployGuidance(params: DeployGuidanceRequestType): Promise<{
    guidance: string;
    commands: string[];
    verificationCommands: string[];
    deviceInfo?: { deviceId: string; deviceName: string };
  }> {
    // Determine app path and bundle ID
    let appPath = params.appPath;
    let bundleId = params.bundleId;

    if (!appPath) {
      appPath = '<APP_PATH_FROM_BUILD>';
    }

    if (!bundleId) {
      bundleId = '<BUNDLE_ID>';
    }

    // Get device information
    let deviceInfo: { deviceId: string; deviceName: string } | undefined;
    let deviceSelection = '';

    if (params.targetDevice) {
      // Try to find the specified device
      try {
        const devices = await DeviceManager.listIOSSimulators();
        const targetDevice = devices.find(
          device => device.name === params.targetDevice && device.available
        );

        if (targetDevice) {
          deviceInfo = {
            deviceId: targetDevice.id,
            deviceName: targetDevice.name,
          };
          deviceSelection = `# Using specified device: ${targetDevice.name} (${targetDevice.id})`;
        } else {
          deviceSelection = `# Warning: Specified device '${params.targetDevice}' not found. Will use default device selection below.`;
        }
      } catch {
        deviceSelection = `# Warning: Could not query devices. Will use default device selection below.`;
      }
    } else {
      deviceSelection = '# No target device specified. Will auto-select an available device.';
    }

    const commands = [
      '# Step 1: Start a simulator (if needed)',
      deviceInfo
        ? `xcrun simctl boot "${deviceInfo.deviceId}"  # Start specific device`
        : 'xcrun simctl list devices  # List available devices',
      deviceInfo ? '' : 'DEVICE_ID="<SELECT_DEVICE_ID_FROM_LIST>"  # Choose an iPhone simulator',
      deviceInfo ? '' : 'xcrun simctl boot "$DEVICE_ID"  # Start the selected device',
      '',
      '# Step 2: Install the app',
      deviceInfo
        ? `xcrun simctl install "${deviceInfo.deviceId}" "${appPath}"`
        : `xcrun simctl install "$DEVICE_ID" "${appPath}"`,
      '',
      '# Step 3: Launch the app',
      deviceInfo
        ? `xcrun simctl launch "${deviceInfo.deviceId}" "${bundleId}"`
        : `xcrun simctl launch "$DEVICE_ID" "${bundleId}"`,
    ].filter(cmd => cmd !== '');

    const verificationCommands = [
      '# Verify the app is running by checking process list',
      deviceInfo
        ? `xcrun simctl spawn "${deviceInfo.deviceId}" ps aux | grep "${bundleId}"`
        : `xcrun simctl spawn "$DEVICE_ID" ps aux | grep "${bundleId}"`,
      '',
      '# Alternative: List installed apps',
      deviceInfo
        ? `xcrun simctl list apps "${deviceInfo.deviceId}" | grep "${bundleId}"`
        : `xcrun simctl list apps "$DEVICE_ID" | grep "${bundleId}"`,
      '',
      '# Check simulator status',
      'xcrun simctl list devices | grep Booted',
    ];

    const bundleIdInstructions =
      bundleId === '<BUNDLE_ID>'
        ? `
## Extract Bundle ID

If you don't have the bundle ID, extract it from the app:

\`\`\`bash
plutil -p "${appPath}/Info.plist" | grep CFBundleIdentifier
# Output example: "CFBundleIdentifier" => "com.example.MyApp"
\`\`\`

Use the value (e.g., \`com.example.MyApp\`) as the bundle ID in the launch command.`
        : '';

    const guidance = `# iOS Deploy Guidance

${deviceSelection}

## Prerequisites

- App must be built first (use **build-guidance** tool)
- Xcode simulators must be available
- App path: \`${appPath}\`
- Bundle ID: \`${bundleId}\`

${bundleIdInstructions}

## Deployment Commands

Execute these commands in order:

\`\`\`bash
${commands.join('\n')}
\`\`\`

## Verification Commands

After deployment, verify the app is running:

\`\`\`bash
${verificationCommands.join('\n')}
\`\`\`

## Expected Results

**Successful deployment:**
- Install command should output: (no output is success)
- Launch command should output: Process launched with PID: XXXX
- Process verification should show your app in the process list
- You should see the app running in the iOS Simulator

**Bundle ID verification:**
- The grep command should show a line containing your bundle ID
- If no output, the app is not running

## Troubleshooting

**Installation Fails:**
- Verify the app path exists: \`ls -la "${appPath}"\`
- Check simulator is booted: \`xcrun simctl list devices | grep Booted\`
- Try force-reinstalling: Add \`--force-reinstall\` to install command

**Launch Fails:**
- Verify bundle ID: \`plutil -p "${appPath}/Info.plist" | grep CFBundleIdentifier\`
- Check if app is installed: \`xcrun simctl list apps DEVICE_ID\`
- Try launching from Simulator app directly

**App Not Visible:**
- App may have crashed immediately - check device logs
- Ensure simulator is actually booted and visible on screen
- Try launching a different app first to verify simulator is responsive

## Next Steps

Once verification shows the app is running:
- The deployment is complete and successful
- Test core functionality (login, navigation, etc.)
- Check app logs if needed: \`xcrun simctl spawn DEVICE_ID log\``;

    return {
      guidance,
      commands,
      verificationCommands,
      deviceInfo,
    };
  }

  private async generateAndroidDeployGuidance(params: DeployGuidanceRequestType): Promise<{
    guidance: string;
    commands: string[];
    verificationCommands: string[];
    deviceInfo?: { deviceId: string; deviceName: string };
  }> {
    const projectPath = params.projectPath;

    // Determine APK path
    let appPath = params.appPath;
    if (!appPath) {
      appPath = '<APK_PATH_FROM_BUILD>';
    }

    // Get package name from bundleId or determine it
    let packageName = params.bundleId;
    if (!packageName) {
      packageName = '<PACKAGE_NAME>';
    }

    // Get device information
    let deviceInfo: { deviceId: string; deviceName: string } | undefined;
    let deviceSelection = '';

    if (params.targetDevice) {
      deviceSelection = `# Using specified emulator: ${params.targetDevice}`;
    } else {
      deviceSelection = '# No target device specified. Will auto-select an available emulator.';
    }

    const commands = [
      '# Step 1: Start an emulator (if needed)',
      'adb devices  # Check running emulators',
      params.targetDevice
        ? `emulator -avd ${params.targetDevice} &  # Start specific emulator`
        : 'emulator -list-avds  # List available emulators',
      params.targetDevice ? '' : 'emulator -avd <EMULATOR_NAME> &  # Start an emulator',
      '',
      '# Step 2: Wait for emulator to be ready',
      'adb wait-for-device',
      '',
      '# Step 3: Install the APK',
      `adb install -r "${appPath}"  # -r flag allows reinstall`,
      '',
      '# Step 4: Launch the app',
      `adb shell am start -n "${packageName}/.MainActivity"`,
    ].filter(cmd => cmd !== '');

    const verificationCommands = [
      '# Verify the app is running',
      `adb shell ps | grep "${packageName}"`,
      '',
      '# Alternative: Check recent activities',
      'adb shell dumpsys activity activities | grep -i running',
      '',
      '# List installed packages',
      `adb shell pm list packages | grep "${packageName}"`,
      '',
      '# Check device status',
      'adb devices',
    ];

    const packageNameInstructions =
      packageName === '<PACKAGE_NAME>'
        ? `
## Extract Package Name

If you don't have the package name, extract it from the AndroidManifest.xml:

\`\`\`bash
find "${projectPath}" -name "AndroidManifest.xml" -path "*/src/main/*" -exec grep -H "package=" {} \\;
# Output example: package="com.example.myapp"
\`\`\`

Use the value (e.g., \`com.example.myapp\`) as the package name.`
        : '';

    const guidance = `# Android Deploy Guidance

${deviceSelection}

## Prerequisites

- APK must be built first (use **build-guidance** tool)
- Android emulator must be available
- APK path: \`${appPath}\`
- Package name: \`${packageName}\`

${packageNameInstructions}

## Deployment Commands

Execute these commands in order:

\`\`\`bash
${commands.join('\n')}
\`\`\`

## Verification Commands

After deployment, verify the app is running:

\`\`\`bash
${verificationCommands.join('\n')}
\`\`\`

## Expected Results

**Successful deployment:**
- Install command should output: Success
- Launch command should start the activity
- Process verification should show your app in the process list
- You should see the app running in the Android emulator

**Package verification:**
- The grep command should show a line containing your package name
- If no output, the app is not running

## Troubleshooting

**Installation Fails:**
- Verify the APK path exists: \`ls -la "${appPath}"\`
- Check emulator is connected: \`adb devices\`
- Try uninstalling first: \`adb uninstall ${packageName}\`

**Launch Fails:**
- Verify package name in AndroidManifest.xml
- Check if app is installed: \`adb shell pm list packages | grep ${packageName}\`
- Try different activity: \`adb shell pm dump ${packageName} | grep -A 1 MAIN\`

**App Not Visible:**
- App may have crashed immediately - check logcat: \`adb logcat\`
- Ensure emulator is actually booted and visible on screen
- Try launching a different app first to verify emulator is responsive

## Next Steps

Once verification shows the app is running:
- The deployment is complete and successful
- Test core functionality (login, navigation, etc.)
- Monitor logs if needed: \`adb logcat -s MyApp\``;

    return {
      guidance,
      commands,
      verificationCommands,
      deviceInfo,
    };
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
