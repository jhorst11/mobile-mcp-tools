/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import dedent from 'dedent';
import {
  AbstractGuidanceNode,
  Logger,
  NodeExecutor,
  NodeGuidanceData,
} from '@salesforce/magen-mcp-workflow';
import { MOBILE_SDK_TEMPLATES_PATH } from '../../common.js';
import { State } from '../metadata.js';

export class ProjectGenerationNode extends AbstractGuidanceNode<State> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('generateProject', nodeExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    // Create guidance data (new architecture - no tool invocation)
    const guidanceData: NodeGuidanceData = {
      nodeId: 'projectGeneration',
      taskPrompt: this.generateProjectGenerationGuidance(state),
      taskInput: {
        selectedTemplate: state.selectedTemplate,
        projectName: state.projectName,
        platform: state.platform,
        packageName: state.packageName,
        organization: state.organization,
        connectedAppClientId: state.connectedAppClientId,
        connectedAppCallbackUri: state.connectedAppCallbackUri,
        loginHost: state.loginHost,
        templateProperties: state.templateProperties,
      },
      resultSchema: z.object({
        projectPath: z.string().describe('The path to the generated project'),
      }),
      metadata: {
        nodeName: this.name,
        description: 'Generate the mobile app project from template',
      },
    };

    const validatedResult = this.executeWithGuidance(guidanceData);
    return validatedResult;
  };

  /**
   * Generate the task prompt for project generation
   * This is the guidance that was previously in the MCP tool
   */
  private generateProjectGenerationGuidance(state: State): string {
    return dedent`
      # Mobile App Project Generation Guide

      You MUST follow the steps in this guide in order. Do not execute any commands that are not part of the steps in this guide.

      ## Project Configuration
      - **Template**: ${state.selectedTemplate}
      - **Project Name**: ${state.projectName}
      - **Platform**: ${state.platform}
      - **Package Name**: ${state.packageName}
      - **Organization**: ${state.organization}
      - **Login Host**: ${state.loginHost || 'Default (production)'}

      ${this.generateStepExecuteCliCommand(1, state)}

      ## Success Criteria

      ✅ Project generated successfully from template "${state.selectedTemplate}"
    `;
  }

  private generateStepExecuteCliCommand(stepNumber: number, state: State): string {
    const platformLower = state.platform.toLowerCase();

    // Build template properties flags if they exist
    let templatePropertiesFlags = '';
    if (state.templateProperties && Object.keys(state.templateProperties).length > 0) {
      const propertyFlags = Object.entries(state.templateProperties)
        .map(([key, value]) => `--template-property-${key}="${value}"`)
        .join(' ');
      templatePropertiesFlags = ` ${propertyFlags}`;
    }

    return dedent`
      ## Step ${stepNumber}: Execute Platform-Specific CLI Command

      Generate the project using the Salesforce Mobile SDK CLI:

      \`\`\`bash
      sf mobilesdk ${platformLower} createwithtemplate --templatesource="${MOBILE_SDK_TEMPLATES_PATH}" --template="${state.selectedTemplate}" --appname="${state.projectName}" --packagename="${state.packageName}" --organization="${state.organization}" --consumerkey="${state.connectedAppClientId}" --callbackurl="${state.connectedAppCallbackUri}" --loginserver="${state.loginHost}"${templatePropertiesFlags}
      \`\`\`

      **Expected Outcome**: A new ${state.platform} project directory named "${state.projectName}" will be created with the template structure. The output of the command will indicate the location of the bootconfig.plist file, take note of this for oauth configuration!

      NOTE: it is VERY IMPORTANT to use the above command EXACTLY to generate the project. Do not use any other configuration method to generate the project. If the above command fails do not try to generate the project using any other method. Instead report back error to the user.
    `;
  }
}
