/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  AbstractGuidanceNode,
  Logger,
  NodeExecutor,
  NodeGuidanceData,
} from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';
import { DEPLOYMENT_TOOL } from '../../tools/run/sfmobile-native-deployment/metadata.js';
import { TempDirectoryManager, defaultTempDirectoryManager } from '../../common.js';
import dedent from 'dedent';

export class DeploymentNode extends AbstractGuidanceNode<State> {
  private readonly tempDirManager: TempDirectoryManager;

  constructor(
    nodeExecutor?: NodeExecutor,
    logger?: Logger,
    tempDirManager: TempDirectoryManager = defaultTempDirectoryManager
  ) {
    super('deployApp', nodeExecutor, logger);
    this.tempDirManager = tempDirManager;
  }

  execute = (state: State): Partial<State> => {
    // packageName comes from templateProperties (bundleIdentifier for iOS, packageName for Android)
    const packageName =
      (state.templateProperties?.bundleIdentifier as string) ||
      (state.templateProperties?.packageName as string) ||
      '';

    // Set default target device if not provided
    const targetDevice = state.targetDevice ?? 'iPhone 16 Pro Max';

    const guidanceData: NodeGuidanceData = {
      nodeId: 'deployApp',
      taskPrompt: this.generateDeploymentGuidance(state, packageName, targetDevice),
      taskInput: {
        platform: state.platform,
        projectPath: state.projectPath,
        buildType: state.buildType,
        targetDevice,
        packageName,
        projectName: state.projectName,
      },
      resultSchema: DEPLOYMENT_TOOL.resultSchema,
      metadata: {
        nodeName: this.name,
        description: DEPLOYMENT_TOOL.description,
      },
    };

    const validatedResult =
      this.executeWithGuidance<typeof DEPLOYMENT_TOOL.resultSchema>(guidanceData);
    return validatedResult;
  };

  private generateDeploymentGuidance(
    state: State,
    packageName: string,
    targetDevice: string
  ): string {
    return dedent`
      You are a technology-adept agent working on behalf of a user who has less familiarity with the technical details of application deployment than you do, and needs your assistance to deploy the app to the target device.
      Please execute the instructions of the following plan on behalf of the user, providing them information on the outcomes that they may need to know.

      # Mobile Native App Deployment Guidance for ${state.platform}

      You MUST follow the steps in this guide in order. Do not execute any commands that are not part of the steps in this guide.

      ${this.generateTargetDeviceReadyStep(1, state, targetDevice)}

      ${this.generateDeploymentStep(2, state, packageName, targetDevice)}

      ${this.generateNextStep(state, packageName, targetDevice)}
    `;
  }

  private generateTargetDeviceReadyStep(
    stepNumber: number,
    state: State,
    targetDevice: string
  ): string {
    return dedent`
      ## Step ${stepNumber}: ${state.platform === 'iOS' ? 'iOS Simulator' : 'Android Emulator'} must be ready
      
      ${
        state.platform === 'iOS'
          ? this.generateTargetDeviceReadyStepIOS(targetDevice)
          : this.generateTargetDeviceReadyStepAndroid(state)
      }
    `;
  }

  private generateTargetDeviceReadyStepIOS(targetDevice: string): string {
    return dedent`
      ### Launch the macOS Simulator app
      If the macOS Simulator app is not running on the macOS host, we will not be able to proceed
      with the deployment commands. The easiest way to ensure that the Simulator app is
      running is to run:

      \`\`\`bash
      open -a Simulator
      \`\`\`

      ### Check to see if our targeted simulator is running
      Run the following command to check if the simulator is running:

      \`\`\`bash
      xcrun simctl list devices | grep "${targetDevice}"
      \`\`\`

      If (Shutdown) is shown as the output, the simulator is not running. Start it by running the following command:

      \`\`\`bash
      xcrun simctl boot "${targetDevice}"
      \`\`\`
    `;
  }

  private generateTargetDeviceReadyStepAndroid(state: State): string {
    return dedent`
      Navigate to the ${state.projectPath} directory and run the following commands to make sure 
      an emulator with an API level equal to or higher than the app's minimum SDK version is active.

      First, make sure an emulator is configured. If not, run the following command to create a new emulator:
      \`\`\`bash
      sf force lightning local device list -p android
      \`\`\`

      If an emulator hasn't been set up yet, use the following command to create one:
      \`\`\`bash
      sf force lightning local device create -p android -n pixel-<api-level> -d pixel -l <api-level>
      \`\`\`

      Replace <api-level> with the value of minSdk from the application's build gradle file.

      Second, get the emulator to use by running the following command:
      \`\`\`bash
      sf force lightning local device list -p android
      \`\`\`
      
      Third, start the emulator by running the following command:
      \`\`\`bash
      sf force lightning local device start -p android -t <emulator-name>
      \`\`\`
    `;
  }

  private generateDeploymentStep(
    stepNumber: number,
    state: State,
    packageName: string,
    targetDevice: string
  ): string {
    return dedent`
      ## Step ${stepNumber}: Deploy application to ${state.platform === 'iOS' ? 'iOS Simulator' : 'Android Emulator'}

      Deploy the application to the target device using:

      \`\`\`bash
      ${this.generateDeploymentCommand(state, packageName, targetDevice)}
      \`\`\`
    `;
  }

  private generateDeploymentCommand(
    state: State,
    packageName: string,
    targetDevice: string
  ): string {
    return state.platform === 'iOS'
      ? `xcrun simctl install "${targetDevice}" "${this.tempDirManager.getAppArtifactPath(state.projectName, 'iOS')}"`
      : `./gradlew install${state.buildType === 'release' ? 'Release' : 'Debug'}`;
  }

  private generateNextStep(state: State, packageName: string, targetDevice: string): string {
    return dedent`
      ## Next Steps

      Once the app is deployed successfully, you MUST launch the app on the target device by running the following command:
      ${this.generateLaunchCommand(state, packageName, targetDevice)}
    `;
  }

  private generateLaunchCommand(state: State, packageName: string, targetDevice: string): string {
    return state.platform === 'iOS'
      ? dedent`
        \`\`\`bash
        xcrun simctl launch "${targetDevice}" "${packageName}.${state.projectName}"
        \`\`\`
      `
      : dedent`
        \`\`\`bash
        adb shell monkey -p <application-id> -c android.intent.category.LAUNCHER 1
        \`\`\`
        Replace <application-id> with the value of applicationId from the application's build gradle file.
      `;
  }
}
