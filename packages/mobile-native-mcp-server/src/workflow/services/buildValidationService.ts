/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import dedent from 'dedent';
import z from 'zod';
import {
  createComponentLogger,
  LangGraphNodeExecutor,
  Logger,
  NodeExecutor,
  NodeGuidanceData,
} from '@salesforce/magen-mcp-workflow';
import { PlatformEnum } from '../../common/schemas.js';
import { TempDirectoryManager, defaultTempDirectoryManager } from '../../common.js';

/**
 * Result of a single build validation attempt
 */
export interface BuildValidationResult {
  buildSuccessful: boolean;
  buildOutputFilePath?: string;
}

/**
 * Parameters for build validation
 */
export interface BuildValidationParams {
  platform: PlatformEnum;
  projectPath: string;
  projectName: string;
}

/**
 * Provider interface for build validation service.
 * This interface allows for dependency injection and testing.
 */
export interface BuildValidationServiceProvider {
  /**
   * Executes a single build attempt.
   *
   * @param params - Build validation parameters
   * @returns Build validation result
   */
  executeBuild(params: BuildValidationParams): BuildValidationResult;
}

/**
 * Service for executing a single build validation.
 * The retry/recovery loop is handled at the workflow graph level, not in this service.
 */
export class BuildValidationService implements BuildValidationServiceProvider {
  private readonly logger: Logger;
  private readonly nodeExecutor: NodeExecutor;
  private readonly tempDirManager: TempDirectoryManager;

  /**
   * Creates a new BuildValidationService.
   *
   * @param nodeExecutor - Node executor for executing build guidance (injectable for testing)
   * @param tempDirManager - Temp directory manager for build artifacts
   * @param logger - Logger instance (injectable for testing)
   */
  constructor(nodeExecutor?: NodeExecutor, tempDirManager?: TempDirectoryManager, logger?: Logger) {
    this.nodeExecutor = nodeExecutor ?? new LangGraphNodeExecutor();
    this.tempDirManager = tempDirManager ?? defaultTempDirectoryManager;
    this.logger = logger ?? createComponentLogger('BuildValidationService');
  }

  executeBuild(params: BuildValidationParams): BuildValidationResult {
    this.logger.info('Executing build', {
      platform: params.platform,
      projectPath: params.projectPath,
    });

    const resultSchema = z.object({
      buildSuccessful: z.boolean().describe('Whether the build was successful'),
      buildOutputFilePath: z
        .string()
        .optional()
        .describe('Path to build output file if build failed'),
    });

    const guidanceData: NodeGuidanceData = {
      nodeId: 'buildValidation',
      taskPrompt: this.generateBuildGuidance(params),
      taskInput: {
        platform: params.platform,
        projectPath: params.projectPath,
        projectName: params.projectName,
      },
      resultSchema: resultSchema,
      metadata: {
        nodeName: 'BuildValidationService',
        description: `Execute build for ${params.platform}`,
      },
    };

    const rawResult = this.nodeExecutor.execute(guidanceData);
    const validatedResult = resultSchema.parse(rawResult);

    this.logger.info('Build completed', {
      buildSuccessful: validatedResult.buildSuccessful,
    });

    return validatedResult;
  }

  private generateBuildGuidance(params: BuildValidationParams): string {
    return dedent`
     # Salesforce Mobile App Build Execution for ${params.platform}

     ## IMPORTANT: Your ONLY Task
     
     Your sole responsibility is to:
     1. Execute the build command exactly as specified below
     2. Check the exit code to determine success or failure
     3. Return the result immediately
     
     **DO NOT** attempt to fix any errors or issues you encounter.
     **DO NOT** run any additional commands beyond what is specified.
     
     If the build fails, simply return the failure status. The build recovery process will handle fixes separately.

      ${params.platform === 'iOS' ? this.msdkAppBuildExecutionIOS(params.projectPath, params.projectName) : this.msdkAppBuildExecutionAndroid(params.projectPath)}
      
    `;
  }

  private msdkAppBuildExecutionIOS(projectPath: string, projectName: string) {
    return dedent`  
      ## Build Execution Steps

      **Step 1:** Navigate to the project directory:
      \`\`\`bash
      cd ${projectPath}
      \`\`\`

      **Step 2:** Execute the build command (this is the ONLY command you should run):
      \`\`\`bash
      { xcodebuild -workspace ${projectName}.xcworkspace -scheme ${projectName} -destination 'generic/platform=iOS Simulator' clean build CONFIGURATION_BUILD_DIR="${this.tempDirManager.getAppArtifactRootPath(projectName)}" > "${this.tempDirManager.getIOSBuildOutputFilePath()}" 2>&1; echo $?; }
      \`\`\`
      
      **Step 3:** Check the exit code:
      - Exit code 0 = Build succeeded
      - Any other exit code = Build failed
      
      **Step 4:** Return the result IMMEDIATELY:
      - Set \`buildSuccessful\` to \`true\` if exit code is 0, \`false\` otherwise
      - If build failed (exit code is not 0), also set \`buildOutputFilePath\` to "${this.tempDirManager.getIOSBuildOutputFilePath()}"
      
      **STOP HERE.** Do not attempt to diagnose or fix any errors. Do not run any other commands.
    `;
  }

  private msdkAppBuildExecutionAndroid(projectPath: string) {
    return dedent`  
      ## Build Execution Steps

      **Step 1:** Navigate to the project directory:
      \`\`\`bash
      cd ${projectPath}
      \`\`\`

      **Step 2:** Execute the build command (this is the ONLY command you should run):
      \`\`\`bash
      { ./gradlew build > "${this.tempDirManager.getAndroidBuildOutputFilePath()}" 2>&1; echo $?; }
      \`\`\`
      
      **Step 3:** Check the exit code:
      - Exit code 0 = Build succeeded
      - Any other exit code = Build failed
      
      **Step 4:** Return the result IMMEDIATELY:
      - Set \`buildSuccessful\` to \`true\` if exit code is 0, \`false\` otherwise
      - If build failed (exit code is not 0), also set \`buildOutputFilePath\` to "${this.tempDirManager.getAndroidBuildOutputFilePath()}"
      
      **STOP HERE.** Do not attempt to diagnose or fix any errors. Do not run any other commands.
    `;
  }
}
