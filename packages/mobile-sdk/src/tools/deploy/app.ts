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
import { CommandRunner } from '../../utils/commandRunner.js';
import { DesignUtils } from '../../utils/designUtils.js';

interface DeploymentResult {
  success: boolean;
  platform?: string;
  error?: string;
  deviceInfo?: { deviceId: string; deviceName: string };
  appPath?: string;
  bundleId?: string;
  packageName?: string;
  processId?: string;
  isRunning?: boolean;
  message?: string;
  suggestion?: string;
  installSuccess?: boolean;
  searchedIn?: string;
  actions?: {
    deviceSelected: string;
    appInstalled: boolean;
    appLaunched: boolean;
    appVerified: boolean;
  };
}

export class DeployAppTool implements Tool {
  readonly name = 'Deploy App';
  readonly toolId = 'deploy-app';
  readonly description =
    'Automatically deploys Mobile SDK apps to simulators/emulators. Finds built apps, selects available devices (preferring running ones), and performs complete deployment including installation, launch, and verification.';
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

      // Automatically deploy the app
      let deployResult: DeploymentResult;

      switch (platform) {
        case 'ios': {
          deployResult = await this.autoDeployIOS(params);
          break;
        }
        case 'android': {
          deployResult = await this.autoDeployAndroid(params);
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
                    error: `Platform '${platform}' auto-deploy not yet implemented`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
      }

      // Add design document reference to successful deployments
      if (deployResult.success) {
        const designReminder = DesignUtils.generateDesignReminder(params.projectPath);
        const phaseCheck = DesignUtils.checkPhaseAlignment(params.projectPath, 'deploy');
        const nextSteps = DesignUtils.extractNextSteps(params.projectPath);

        let enhancedMessage = deployResult.message || '';

        enhancedMessage += designReminder;

        if (phaseCheck.recommendation) {
          enhancedMessage += `
## 🎯 **PHASE ALIGNMENT CHECK**

${phaseCheck.recommendation}

**💡 Tip:** Now that deployment is complete, reference your design document to plan your next development iteration.
`;
        }

        if (nextSteps.length > 0) {
          enhancedMessage += `
## 📋 **NEXT STEPS FROM DESIGN DOCUMENT**

${nextSteps
  .slice(0, 3)
  .map(step => `- ${step}`)
  .join('\n')}
${nextSteps.length > 3 ? '\n*(See design document for complete roadmap)*' : ''}
`;
        }

        deployResult = {
          ...deployResult,
          message: enhancedMessage,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(deployResult, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error deploying app: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  /**
   * Automatically deploy an iOS app
   */
  private async autoDeployIOS(params: DeployGuidanceRequestType): Promise<DeploymentResult> {
    try {
      const { projectPath } = params;

      // Step 1: Find the built app
      let appPath = params.appPath;
      if (!appPath) {
        console.log('🔍 Searching for built iOS app...');
        appPath = await BuildManager.findBuiltIOSApp(projectPath);
        if (!appPath) {
          return {
            success: false,
            error:
              'No built iOS app found. Please build the project first using build-project tool.',
            suggestion: 'Run the build-project tool to build your iOS app first.',
            searchedIn: projectPath,
          };
        }
        console.log(`✅ Found iOS app: ${appPath}`);
      }

      // Step 2: Extract bundle ID
      let bundleId = params.bundleId;
      if (!bundleId) {
        bundleId = await BuildManager.getIOSBundleId(appPath);
        if (!bundleId) {
          return {
            success: false,
            error: 'Could not extract bundle ID from app. Please provide bundleId parameter.',
            appPath,
          };
        }
      }

      // Step 3: Select and start device
      const deviceInfo = await this.selectAndStartIOSDevice(params.targetDevice);
      if (!deviceInfo) {
        return {
          success: false,
          error: 'No iOS simulators available. Please install Xcode simulators.',
        };
      }

      // Step 4: Install the app
      const installResult = await CommandRunner.run('xcrun', [
        'simctl',
        'install',
        deviceInfo.deviceId,
        appPath,
      ]);

      if (!installResult.success) {
        return {
          success: false,
          error: `Failed to install app: ${installResult.stderr}`,
          deviceInfo,
          appPath,
          bundleId,
        };
      }

      // Step 5: Launch the app
      const launchResult = await CommandRunner.run('xcrun', [
        'simctl',
        'launch',
        deviceInfo.deviceId,
        bundleId,
      ]);

      if (!launchResult.success) {
        return {
          success: false,
          error: `Failed to launch app: ${launchResult.stderr}`,
          deviceInfo,
          appPath,
          bundleId,
          installSuccess: true,
        };
      }

      // Extract process ID from launch result
      const pidMatch = launchResult.stdout.match(/: (\d+)/);
      const processId = pidMatch ? pidMatch[1] : undefined;

      // Step 6: Verify the app is running
      await new Promise(resolve => setTimeout(resolve, 2000)); // Give it a moment to start
      const verifyResult = await CommandRunner.run('xcrun', [
        'simctl',
        'spawn',
        deviceInfo.deviceId,
        'ps',
        'aux',
      ]);

      const isRunning = verifyResult.success && verifyResult.stdout.includes(bundleId);

      return {
        success: true,
        platform: 'ios',
        deviceInfo,
        appPath,
        bundleId,
        processId,
        isRunning,
        message: `Successfully deployed and launched ${bundleId} on ${deviceInfo.deviceName}`,
        actions: {
          deviceSelected: deviceInfo.deviceName,
          appInstalled: true,
          appLaunched: true,
          appVerified: isRunning,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `iOS deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Automatically deploy an Android app
   */
  private async autoDeployAndroid(params: DeployGuidanceRequestType): Promise<DeploymentResult> {
    try {
      const { projectPath } = params;

      // Step 1: Find the built APK
      let appPath = params.appPath;
      if (!appPath) {
        console.log('🔍 Searching for built Android APK...');
        appPath = await BuildManager.findBuiltAndroidApk(projectPath, 'debug');
        if (!appPath) {
          return {
            success: false,
            error:
              'No built Android APK found. Please build the project first using build-project tool.',
            suggestion: 'Run the build-project tool to build your Android app first.',
            searchedIn: projectPath,
          };
        }
        console.log(`✅ Found Android APK: ${appPath}`);
      }

      // Step 2: Extract package name
      let packageName = params.bundleId;
      if (!packageName) {
        packageName = await BuildManager.getAndroidPackageName(projectPath);
        if (!packageName) {
          return {
            success: false,
            error:
              'Could not extract package name from project. Please provide bundleId parameter.',
            appPath,
          };
        }
      }

      // Step 3: Select and start device
      const deviceInfo = await this.selectAndStartAndroidDevice(params.targetDevice);
      if (!deviceInfo) {
        return {
          success: false,
          error: 'No Android emulators available. Please create Android AVDs.',
        };
      }

      // Step 4: Install the APK
      const installResult = await CommandRunner.run('adb', ['install', '-r', appPath]);

      if (!installResult.success) {
        return {
          success: false,
          error: `Failed to install APK: ${installResult.stderr}`,
          deviceInfo,
          appPath,
          packageName,
        };
      }

      // Step 5: Launch the app
      const launchResult = await CommandRunner.run('adb', [
        'shell',
        'am',
        'start',
        '-n',
        `${packageName}/.MainActivity`,
      ]);

      if (!launchResult.success) {
        return {
          success: false,
          error: `Failed to launch app: ${launchResult.stderr}`,
          deviceInfo,
          appPath,
          packageName,
          installSuccess: true,
        };
      }

      // Step 6: Verify the app is running
      await new Promise(resolve => setTimeout(resolve, 2000)); // Give it a moment to start
      const verifyResult = await CommandRunner.run('adb', ['shell', 'ps']);

      const isRunning = verifyResult.success && verifyResult.stdout.includes(packageName);

      return {
        success: true,
        platform: 'android',
        deviceInfo,
        appPath,
        packageName,
        isRunning,
        message: `Successfully deployed and launched ${packageName} on ${deviceInfo.deviceName}`,
        actions: {
          deviceSelected: deviceInfo.deviceName,
          appInstalled: true,
          appLaunched: true,
          appVerified: isRunning,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Android deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Select and start the best available iOS device
   * Prefers running devices, then fallback to available devices
   */
  private async selectAndStartIOSDevice(
    targetDevice?: string
  ): Promise<{ deviceId: string; deviceName: string } | null> {
    try {
      const devices = await DeviceManager.listIOSSimulators();

      // If specific device was requested, try to use it
      if (targetDevice) {
        const requestedDevice = devices.find(
          device => device.name === targetDevice && device.available
        );
        if (requestedDevice) {
          if (requestedDevice.state === 'booted') {
            return { deviceId: requestedDevice.id, deviceName: requestedDevice.name };
          } else {
            return await DeviceManager.startIOSSimulator(requestedDevice.name);
          }
        }
      }

      // Find the best device automatically
      // 1. Prefer already booted devices
      const bootedDevices = devices.filter(device => device.state === 'booted' && device.available);
      if (bootedDevices.length > 0) {
        const device = bootedDevices[0];
        return { deviceId: device.id, deviceName: device.name };
      }

      // 2. Start an available iPhone (preferred)
      const availableIphones = devices.filter(
        device => device.available && device.name.toLowerCase().includes('iphone')
      );
      if (availableIphones.length > 0) {
        return await DeviceManager.startIOSSimulator(availableIphones[0].name);
      }

      // 3. Start any available device
      const availableDevices = devices.filter(device => device.available);
      if (availableDevices.length > 0) {
        return await DeviceManager.startIOSSimulator(availableDevices[0].name);
      }

      return null;
    } catch (error) {
      console.error(`Error selecting iOS device: ${error}`);
      return null;
    }
  }

  /**
   * Select and start the best available Android device
   * Prefers running devices, then fallback to available devices
   */
  private async selectAndStartAndroidDevice(
    targetDevice?: string
  ): Promise<{ deviceId: string; deviceName: string } | null> {
    try {
      const devices = await DeviceManager.listAndroidEmulators();

      // If specific device was requested, try to use it
      if (targetDevice) {
        const requestedDevice = devices.find(
          device => device.name === targetDevice && device.available
        );
        if (requestedDevice) {
          if (requestedDevice.state === 'booted') {
            return { deviceId: requestedDevice.id, deviceName: requestedDevice.name };
          } else {
            return await DeviceManager.startAndroidEmulator(requestedDevice.name);
          }
        }
      }

      // Find the best device automatically
      // 1. Prefer already booted devices
      const bootedDevices = devices.filter(device => device.state === 'booted' && device.available);
      if (bootedDevices.length > 0) {
        const device = bootedDevices[0];
        return { deviceId: device.id, deviceName: device.name };
      }

      // 2. Start any available device
      const availableDevices = devices.filter(device => device.available);
      if (availableDevices.length > 0) {
        return await DeviceManager.startAndroidEmulator(availableDevices[0].name);
      }

      return null;
    } catch (error) {
      console.error(`Error selecting Android device: ${error}`);
      return null;
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
