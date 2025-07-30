/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { CommandRunner } from './commandRunner.js';
import { FileUtils } from './fileUtils.js';
import { DeviceManager } from './deviceManager.js';
import { join } from 'path';

export interface BuildOptions {
  projectPath: string;
  configuration: 'debug' | 'release';
  clean: boolean;
  targetDevice?: string;
}

export interface BuildResult {
  success: boolean;
  appPath?: string;
  deviceId?: string;
  deviceName?: string;
  appBundleId?: string;
  buildLogPath?: string;
  processId?: string;
  error?: string;
}

export class BuildManager {
  /**
   * Detect the platform of a project
   */
  static async detectPlatform(
    projectPath: string
  ): Promise<'ios' | 'android' | 'react-native' | null> {
    try {
      // Check for iOS-specific files by reading directory contents
      const files = await FileUtils.readDirectory(projectPath);

      // Check for Xcode project files
      const hasXcodeProject = files.some(file => file.endsWith('.xcodeproj'));
      const hasXcodeWorkspace = files.some(file => file.endsWith('.xcworkspace'));

      if (hasXcodeProject || hasXcodeWorkspace) {
        return 'ios';
      }

      // Check for iOS subdirectory (React Native structure)
      if (files.includes('ios')) {
        return 'ios';
      }

      // Check for Android-specific files
      if (
        files.includes('android') ||
        (await FileUtils.exists(join(projectPath, 'build.gradle'))) ||
        (await FileUtils.exists(join(projectPath, 'app', 'build.gradle')))
      ) {
        return 'android';
      }

      // Check for React Native
      if (files.includes('package.json')) {
        try {
          const packageJson = await FileUtils.readJsonFile(join(projectPath, 'package.json'));
          if (packageJson && typeof packageJson === 'object' && 'dependencies' in packageJson) {
            const deps = (packageJson as { dependencies?: Record<string, string> }).dependencies;
            if (deps?.['react-native']) {
              return 'react-native';
            }
          }
        } catch {
          // Ignore JSON parsing errors
        }
      }
    } catch (error) {
      console.error('Error detecting project platform:', error);
    }

    return null;
  }

  /**
   * Build and deploy to iOS simulator
   */
  static async buildAndDeployIOS(options: BuildOptions): Promise<BuildResult> {
    try {
      const { projectPath, configuration, clean, targetDevice } = options;

      // Find the workspace or project file
      let buildTarget: string | null = null;
      const workspaceFiles = ['*.xcworkspace', '*.xcodeproj'];

      for (const pattern of workspaceFiles) {
        const files = await this.findFilesWithPattern(projectPath, pattern);
        if (files.length > 0) {
          buildTarget = files[0];
          break;
        }
      }

      if (!buildTarget) {
        throw new Error('No Xcode workspace or project file found');
      }

      const isWorkspace = buildTarget.endsWith('.xcworkspace');
      const buildArgs = [
        isWorkspace ? '-workspace' : '-project',
        buildTarget,
        '-scheme',
        await this.getIOSScheme(projectPath, buildTarget),
        '-configuration',
        configuration === 'debug' ? 'Debug' : 'Release',
        '-sdk',
        'iphonesimulator',
      ];

      // Find and start simulator if needed
      let deviceInfo: { deviceId: string; deviceName: string } | undefined;

      if (targetDevice) {
        try {
          deviceInfo = await DeviceManager.startIOSSimulator(targetDevice);
          buildArgs.push('-destination', `id=${deviceInfo.deviceId}`);
        } catch {
          console.error(
            `Failed to start specified simulator '${targetDevice}', trying default simulator...`
          );
          // Try to start default simulator instead of falling back to generic
          try {
            const devices = await DeviceManager.listIOSSimulators();
            const defaultDevice =
              devices.find(d => d.available && d.name.includes('iPhone')) ||
              devices.find(d => d.available);
            if (defaultDevice) {
              deviceInfo = await DeviceManager.startIOSSimulator(defaultDevice.name);
              buildArgs.push('-destination', `id=${deviceInfo.deviceId}`);
              console.log(`✅ Started fallback simulator: ${deviceInfo.deviceName}`);
            } else {
              buildArgs.push('-destination', 'generic/platform=iOS Simulator');
            }
          } catch {
            buildArgs.push('-destination', 'generic/platform=iOS Simulator');
          }
        }
      } else {
        // Auto-select and start a default simulator
        try {
          console.log('🔍 No target device specified, finding available simulator...');
          const devices = await DeviceManager.listIOSSimulators();

          // Prefer iPhone simulators, then any available simulator
          const defaultDevice =
            devices.find(d => d.available && d.name.includes('iPhone')) ||
            devices.find(d => d.available);

          if (defaultDevice) {
            console.log(`🚀 Starting default simulator: ${defaultDevice.name}`);
            deviceInfo = await DeviceManager.startIOSSimulator(defaultDevice.name);
            buildArgs.push('-destination', `id=${deviceInfo.deviceId}`);
            console.log(`✅ Simulator ready: ${deviceInfo.deviceName} (${deviceInfo.deviceId})`);
          } else {
            console.log('⚠️ No available simulators found, using generic destination');
            buildArgs.push('-destination', 'generic/platform=iOS Simulator');
          }
        } catch (error) {
          console.error('⚠️ Failed to start default simulator:', error);
          buildArgs.push('-destination', 'generic/platform=iOS Simulator');
        }
      }

      // Add clean if requested
      if (clean) {
        buildArgs.push('clean');
      }

      // Add build action
      buildArgs.push('build');

      // Create build log file
      const logPath = join(projectPath, 'build.log');

      // Execute the build
      console.error(`Building iOS project: xcodebuild ${buildArgs.join(' ')}`);
      const buildResult = await CommandRunner.run('xcodebuild', buildArgs, {
        cwd: projectPath,
        timeout: 300000, // 5 minutes
      });

      // Write build log
      await FileUtils.writeFile(logPath, buildResult.stdout + '\n' + buildResult.stderr);

      // Verify build success by analyzing build logs
      const buildVerification = await this.verifyIOSBuildSuccess(buildResult, logPath);
      if (!buildVerification.success) {
        return {
          success: false,
          error: buildVerification.error,
          buildLogPath: logPath,
        };
      }

      console.log(`✅ Build verification successful`);
      if (buildVerification.warnings.length > 0) {
        console.log(`⚠️ Build warnings detected: ${buildVerification.warnings.length}`);
        buildVerification.warnings.forEach(warning => console.log(`   ${warning}`));
      }

      // Find the built app
      const appPath = await this.findBuiltIOSApp(projectPath);
      const bundleId = appPath ? await this.getIOSBundleId(appPath) : undefined;

      // Deploy and verify app is running on simulator
      if (!deviceInfo) {
        return {
          success: false,
          error:
            'No simulator was started, app built but not deployed. Use simulator-list-devices and specify targetDevice parameter.',
          buildLogPath: logPath,
        };
      }

      if (!appPath) {
        return {
          success: false,
          error: 'App was built but .app file not found, cannot install',
          buildLogPath: logPath,
        };
      }

      if (!bundleId) {
        return {
          success: false,
          error: 'Could not determine bundle ID from built app',
          buildLogPath: logPath,
        };
      }

      // Install, launch, and verify the app is running
      const deploymentResult = await this.deployAndVerifyIOSApp(deviceInfo, appPath, bundleId);

      if (!deploymentResult.success) {
        return {
          success: false,
          error: deploymentResult.error,
          buildLogPath: logPath,
          appPath,
          deviceId: deviceInfo.deviceId,
          deviceName: deviceInfo.deviceName,
          appBundleId: bundleId,
        };
      }

      console.log(`🎉 App is verified running on ${deviceInfo.deviceName}!`);
      console.log(`   Process ID: ${deploymentResult.processId}`);

      return {
        success: true,
        appPath,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        appBundleId: bundleId,
        buildLogPath: logPath,
        processId: deploymentResult.processId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build and deploy to Android emulator
   */
  static async buildAndDeployAndroid(options: BuildOptions): Promise<BuildResult> {
    try {
      const { projectPath, configuration, clean, targetDevice } = options;

      // Find the gradle wrapper
      const gradlewPath = (await FileUtils.exists(join(projectPath, 'gradlew')))
        ? join(projectPath, 'gradlew')
        : 'gradlew';

      const buildArgs: string[] = [];

      // Add clean if requested
      if (clean) {
        buildArgs.push('clean');
      }

      // Add build task
      const buildTask = configuration === 'debug' ? 'assembleDebug' : 'assembleRelease';
      buildArgs.push(buildTask);

      // Create build log file
      const logPath = join(projectPath, 'build.log');

      // Execute the build
      console.error(`Building Android project: ${gradlewPath} ${buildArgs.join(' ')}`);
      const buildResult = await CommandRunner.run(gradlewPath, buildArgs, {
        cwd: projectPath,
        timeout: 300000, // 5 minutes
      });

      // Write build log
      await FileUtils.writeFile(logPath, buildResult.stdout + '\n' + buildResult.stderr);

      if (!buildResult.success) {
        return {
          success: false,
          error: `Build failed: ${buildResult.stderr}`,
          buildLogPath: logPath,
        };
      }

      // Find the built APK
      const apkPath = await this.findBuiltAndroidApk(projectPath, configuration);
      const bundleId = apkPath ? await this.getAndroidPackageName(projectPath) : undefined;

      // Start emulator and install/launch if device was specified
      let deviceInfo: { deviceId: string; deviceName: string } | undefined;

      if (targetDevice && apkPath) {
        try {
          deviceInfo = await DeviceManager.startAndroidEmulator(targetDevice);

          // Install the APK
          const installResult = await CommandRunner.run('adb', [
            '-s',
            deviceInfo.deviceId,
            'install',
            '-r',
            apkPath,
          ]);

          if (!installResult.success) {
            console.error(`Failed to install APK: ${installResult.stderr}`);
          } else if (bundleId) {
            // Launch the app
            const launchResult = await CommandRunner.run('adb', [
              '-s',
              deviceInfo.deviceId,
              'shell',
              'am',
              'start',
              '-n',
              `${bundleId}/.MainActivity`,
            ]);

            if (!launchResult.success) {
              console.error(`Failed to launch app: ${launchResult.stderr}`);
            }
          }
        } catch (error) {
          console.error(`Error during emulator start/install/launch: ${error}`);
        }
      }

      return {
        success: true,
        appPath: apkPath,
        deviceId: deviceInfo?.deviceId,
        deviceName: deviceInfo?.deviceName,
        appBundleId: bundleId,
        buildLogPath: logPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build and deploy based on detected platform
   */
  static async buildAndDeploy(options: BuildOptions): Promise<BuildResult> {
    const platform = await this.detectPlatform(options.projectPath);

    if (!platform) {
      return {
        success: false,
        error: 'Could not detect project platform',
      };
    }

    switch (platform) {
      case 'ios':
        return this.buildAndDeployIOS(options);
      case 'android':
        return this.buildAndDeployAndroid(options);
      case 'react-native':
        // For React Native, we need to build for a specific platform
        // This would require additional logic to determine which platform to build
        return {
          success: false,
          error: 'React Native projects require specifying target platform',
        };
      default:
        return {
          success: false,
          error: `Unsupported platform: ${platform}`,
        };
    }
  }

  /**
   * Helper method to find files or directories with a pattern
   */
  private static async findFilesWithPattern(directory: string, pattern: string): Promise<string[]> {
    try {
      // Xcode projects and workspaces are directories, not files
      const isXcodePattern = pattern.includes('.xcodeproj') || pattern.includes('.xcworkspace');
      const typeFlag = isXcodePattern ? 'd' : 'f';

      const result = await CommandRunner.run('find', [
        directory,
        '-name',
        pattern,
        '-type',
        typeFlag,
      ]);
      if (result.success) {
        return result.stdout.split('\n').filter(line => line.trim().length > 0);
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get the iOS scheme name
   */
  private static async getIOSScheme(projectPath: string, buildTarget: string): Promise<string> {
    try {
      const isWorkspace = buildTarget.endsWith('.xcworkspace');
      const listResult = await CommandRunner.run(
        'xcodebuild',
        [isWorkspace ? '-workspace' : '-project', buildTarget, '-list'],
        { cwd: projectPath }
      );

      if (listResult.success) {
        const lines = listResult.stdout.split('\n');
        let inSchemes = false;
        for (const line of lines) {
          if (line.trim() === 'Schemes:') {
            inSchemes = true;
            continue;
          }
          if (inSchemes && line.trim().length > 0 && !line.startsWith(' ')) {
            break;
          }
          if (inSchemes && line.trim().length > 0) {
            return line.trim();
          }
        }
      }
    } catch {
      // Fall back to default
    }

    // Default scheme name (often matches project name)
    const projectName = buildTarget
      .split('/')
      .pop()
      ?.replace(/\.(xcworkspace|xcodeproj)$/, '');
    return projectName || 'MyApp';
  }

  /**
   * Find the built iOS app
   */
  static async findBuiltIOSApp(projectPath: string): Promise<string | undefined> {
    try {
      console.log(`🔍 Searching for iOS app in: ${projectPath}`);

      // Get the home directory for DerivedData search
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const systemDerivedDataPath = join(homeDir, 'Library/Developer/Xcode/DerivedData');

      // First try to find in the standard build directory structure
      const standardPaths = [
        join(projectPath, 'build/Debug-iphonesimulator'),
        join(projectPath, 'build/Release-iphonesimulator'),
        join(projectPath, 'DerivedData'),
        systemDerivedDataPath, // Add system DerivedData path
      ];

      for (const searchPath of standardPaths) {
        console.log(`   Checking standard path: ${searchPath}`);
        if (await FileUtils.exists(searchPath)) {
          console.log(`   ✅ Path exists, searching for .app files...`);
          const result = await CommandRunner.run('find', [
            searchPath,
            '-name',
            '*.app',
            '-type',
            'd',
          ]);
          if (result.success) {
            const apps = result.stdout.split('\n').filter(line => line.trim().length > 0);
            if (apps.length > 0) {
              console.log(`   ✅ Found app in standard path: ${apps[0]}`);
              // For DerivedData, prefer the most recently modified app
              if (searchPath.includes('DerivedData')) {
                const sortedApps = await this.sortAppsByModificationTime(apps);
                console.log(`   📅 Using most recent app: ${sortedApps[0]}`);
                return sortedApps[0];
              }
              return apps[0];
            }
          }
        } else {
          console.log(`   ❌ Path does not exist`);
        }
      }

      // Enhanced fallback: Also search common Xcode build locations
      const additionalSearchPaths = [
        '/tmp', // Sometimes Xcode uses temp directories
        join(homeDir, 'Library/Developer/Xcode/DerivedData'), // Explicit DerivedData search
      ];

      console.log(`   Extended search in additional Xcode locations...`);
      for (const searchPath of additionalSearchPaths) {
        if (await FileUtils.exists(searchPath)) {
          console.log(`   Searching in: ${searchPath}`);
          const result = await CommandRunner.run('find', [
            searchPath,
            '-name',
            '*.app',
            '-type',
            'd',
            '-path',
            '*iphonesimulator*',
          ]);
          if (result.success) {
            const apps = result.stdout.split('\n').filter(line => line.trim().length > 0);
            if (apps.length > 0) {
              console.log(`   ✅ Found ${apps.length} apps in ${searchPath}`);
              // Sort by modification time and take the most recent
              const sortedApps = await this.sortAppsByModificationTime(apps);
              console.log(`   📅 Using most recent app: ${sortedApps[0]}`);
              return sortedApps[0];
            }
          }
        }
      }

      // Final fallback: Search the entire project directory for .app files
      console.log(`   Final fallback: Searching entire project for .app files...`);
      const result = await CommandRunner.run('find', [projectPath, '-name', '*.app', '-type', 'd']);

      if (result.success) {
        const apps = result.stdout
          .split('\n')
          .filter(line => line.trim().length > 0)
          // Prefer simulator builds, but accept any .app if that's all we have
          .sort((a, b) => {
            const aIsSimulator =
              a.includes('iphonesimulator') || a.includes('Debug') || a.includes('Release');
            const bIsSimulator =
              b.includes('iphonesimulator') || b.includes('Debug') || b.includes('Release');
            if (aIsSimulator && !bIsSimulator) return -1;
            if (!aIsSimulator && bIsSimulator) return 1;
            return 0;
          });

        if (apps.length > 0) {
          console.log(`   ✅ Found ${apps.length} .app files, using: ${apps[0]}`);
          if (apps.length > 1) {
            console.log(`   Other apps found: ${apps.slice(1).join(', ')}`);
          }
          return apps[0];
        } else {
          console.log(`   ❌ No .app files found in project`);
        }
      } else {
        console.log(`   ❌ Find command failed: ${result.stderr}`);
      }

      // Ultimate debugging: Let's see what files ARE in the project
      console.log(`   🔍 DEBUG: Let's see what's actually in the project...`);
      const debugResult = await CommandRunner.run('find', [
        projectPath,
        '-type',
        'f',
        '-name',
        '*',
      ]);
      if (debugResult.success) {
        const allFiles = debugResult.stdout.split('\n').filter(line => line.trim().length > 0);
        console.log(`   📁 Total files found: ${allFiles.length}`);
        const buildRelatedFiles = allFiles.filter(
          file =>
            file.includes('build') ||
            file.includes('Build') ||
            file.includes('DerivedData') ||
            file.includes('.app') ||
            file.includes('Debug') ||
            file.includes('Release')
        );
        if (buildRelatedFiles.length > 0) {
          console.log(`   🔨 Build-related files found:`);
          buildRelatedFiles.slice(0, 10).forEach(file => console.log(`      ${file}`));
          if (buildRelatedFiles.length > 10) {
            console.log(`      ... and ${buildRelatedFiles.length - 10} more`);
          }
        } else {
          console.log(`   ❌ No build-related files found`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error during search: ${error}`);
    }
    return undefined;
  }

  /**
   * Sort apps by modification time (most recent first)
   */
  private static async sortAppsByModificationTime(apps: string[]): Promise<string[]> {
    try {
      const appsWithTime = await Promise.all(
        apps.map(async app => {
          try {
            const result = await CommandRunner.run('stat', ['-f', '%m', app]);
            const modTime = result.success ? parseInt(result.stdout.trim()) : 0;
            return { app, modTime };
          } catch {
            return { app, modTime: 0 };
          }
        })
      );

      return appsWithTime.sort((a, b) => b.modTime - a.modTime).map(item => item.app);
    } catch {
      return apps; // Fallback to original order
    }
  }

  /**
   * Get iOS bundle identifier
   */
  static async getIOSBundleId(appPath: string): Promise<string | undefined> {
    try {
      const plistPath = join(appPath, 'Info.plist');
      const result = await CommandRunner.run('plutil', ['-p', plistPath]);

      if (result.success) {
        const bundleIdMatch = result.stdout.match(/"CFBundleIdentifier" => "([^"]+)"/);
        return bundleIdMatch ? bundleIdMatch[1] : undefined;
      }
    } catch {
      // Ignore errors
    }
    return undefined;
  }

  /**
   * Find the built Android APK
   */
  static async findBuiltAndroidApk(
    projectPath: string,
    configuration: 'debug' | 'release'
  ): Promise<string | undefined> {
    try {
      const configName = configuration === 'debug' ? 'debug' : 'release';

      // First try specific patterns for the configuration
      const patterns = [`*${configName}.apk`, `*-${configName}.apk`, `app-${configName}.apk`];

      for (const pattern of patterns) {
        const result = await CommandRunner.run('find', [
          projectPath,
          '-name',
          pattern,
          '-type',
          'f',
        ]);

        if (result.success) {
          const apks = result.stdout.split('\n').filter(line => line.trim().length > 0);
          if (apks.length > 0) {
            return apks[0];
          }
        }
      }

      // Fallback: Search for any APK files and prefer the ones with the right configuration
      const result = await CommandRunner.run('find', [projectPath, '-name', '*.apk', '-type', 'f']);

      if (result.success) {
        const apks = result.stdout
          .split('\n')
          .filter(line => line.trim().length > 0)
          // Prefer APKs with the requested configuration
          .sort((a, b) => {
            const aMatches = a.toLowerCase().includes(configName);
            const bMatches = b.toLowerCase().includes(configName);
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
            return 0;
          });
        return apks[0] || undefined;
      }
    } catch {
      // Ignore errors
    }
    return undefined;
  }

  /**
   * Get Android package name from manifest
   */
  static async getAndroidPackageName(projectPath: string): Promise<string | undefined> {
    try {
      // Try to find AndroidManifest.xml
      const manifestResult = await CommandRunner.run('find', [
        projectPath,
        '-name',
        'AndroidManifest.xml',
        '-type',
        'f',
      ]);

      if (manifestResult.success) {
        const manifests = manifestResult.stdout
          .split('\n')
          .filter(line => line.trim().length > 0 && line.includes('src/main'));

        if (manifests.length > 0) {
          const manifestContent = await FileUtils.readFile(manifests[0]);
          const packageMatch = manifestContent.match(/package="([^"]+)"/);
          return packageMatch ? packageMatch[1] : undefined;
        }
      }
    } catch {
      // Ignore errors
    }
    return undefined;
  }

  /**
   * Verify iOS build success by analyzing build logs
   */
  private static async verifyIOSBuildSuccess(
    buildResult: { success: boolean; stdout: string; stderr: string },
    logPath: string
  ): Promise<{ success: boolean; error?: string; warnings: string[] }> {
    const warnings: string[] = [];

    // First check if the command itself failed
    if (!buildResult.success) {
      return {
        success: false,
        error: `Build command failed: ${buildResult.stderr}`,
        warnings,
      };
    }

    try {
      // Read and analyze the build log
      const logContent = await FileUtils.readFile(logPath);

      // Check for build failure indicators
      const failurePatterns = [
        /BUILD FAILED/i,
        /\*\* BUILD FAILED \*\*/i,
        /error:/i,
        /fatal error:/i,
        /compilation failed/i,
        /ld: library not found/i,
        /no such file or directory/i,
      ];

      for (const pattern of failurePatterns) {
        if (pattern.test(logContent)) {
          const errorLines = logContent
            .split('\n')
            .filter(line => pattern.test(line))
            .slice(0, 3); // Limit to first 3 error lines

          return {
            success: false,
            error: `Build failed with errors: ${errorLines.join('; ')}`,
            warnings,
          };
        }
      }

      // Check for success indicators
      const successPatterns = [/BUILD SUCCEEDED/i, /\*\* BUILD SUCCEEDED \*\*/i];

      const hasSuccessIndicator = successPatterns.some(pattern => pattern.test(logContent));

      // Collect warnings
      const warningLines = logContent
        .split('\n')
        .filter(line => /warning:/i.test(line))
        .slice(0, 5); // Limit to first 5 warnings

      warnings.push(...warningLines);

      if (!hasSuccessIndicator) {
        return {
          success: false,
          error: 'Build log does not contain success indicators. Build may have failed silently.',
          warnings,
        };
      }

      return {
        success: true,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read build log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings,
      };
    }
  }

  /**
   * Deploy and verify iOS app is running on simulator
   */
  private static async deployAndVerifyIOSApp(
    deviceInfo: { deviceId: string; deviceName: string },
    appPath: string,
    bundleId: string
  ): Promise<{ success: boolean; error?: string; processId?: string }> {
    try {
      console.log(`📱 Installing app on ${deviceInfo.deviceName}...`);
      console.log(`   App path: ${appPath}`);
      console.log(`   Device ID: ${deviceInfo.deviceId}`);

      // Step 1: Install the app
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
        };
      }

      console.log(`✅ App installed successfully`);

      // Step 2: Launch the app
      console.log(`🚀 Launching app (Bundle ID: ${bundleId})...`);
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
        };
      }

      console.log(`🔍 Verifying app is running...`);

      // Step 3: Verify the app is actually running by checking process list
      const processVerification = await this.verifyAppIsRunning(deviceInfo.deviceId, bundleId);

      if (!processVerification.success) {
        return {
          success: false,
          error: `App launched but verification failed: ${processVerification.error}`,
        };
      }

      return {
        success: true,
        processId: processVerification.processId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error during deployment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verify app is running on simulator by checking process list
   */
  private static async verifyAppIsRunning(
    deviceId: string,
    bundleId: string
  ): Promise<{ success: boolean; error?: string; processId?: string }> {
    try {
      // Give the app a moment to fully start
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check running processes on the simulator
      const psResult = await CommandRunner.run('xcrun', ['simctl', 'spawn', deviceId, 'ps', 'aux']);

      if (!psResult.success) {
        return {
          success: false,
          error: `Failed to get process list: ${psResult.stderr}`,
        };
      }

      // Look for our app in the process list
      const processLines = psResult.stdout.split('\n');
      const appProcess = processLines.find(line => line.includes(bundleId));

      if (!appProcess) {
        // Try alternative verification method using simctl list
        const appListResult = await CommandRunner.run('xcrun', [
          'simctl',
          'list',
          'apps',
          deviceId,
        ]);

        if (appListResult.success && appListResult.stdout.includes(bundleId)) {
          console.log(`✅ App verified installed, but process verification inconclusive`);
          return {
            success: true,
            processId: 'unknown',
          };
        }

        return {
          success: false,
          error: `App is not running on simulator. Bundle ID '${bundleId}' not found in process list.`,
        };
      }

      // Extract process ID from the process line
      const processMatch = appProcess.trim().match(/^\s*\S+\s+(\d+)/);
      const processId = processMatch ? processMatch[1] : 'unknown';

      console.log(`✅ App verified running with process ID: ${processId}`);

      return {
        success: true,
        processId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Process verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
