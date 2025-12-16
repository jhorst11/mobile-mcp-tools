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
  createComponentLogger,
} from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../add-feature-metadata.js';
import dedent from 'dedent';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import z from 'zod';

/**
 * Result schema for checking existing app configuration
 */
const CHECK_EXISTING_CONFIG_RESULT_SCHEMA = z.object({
  alreadyConfigured: z
    .array(z.string())
    .describe('List of variable names that are already configured in the app'),
  needsConfiguration: z
    .array(z.string())
    .describe('List of variable names that need to be collected from the user'),
});

/**
 * Checks which template variables are already configured in the existing app.
 * This node guides the LLM to inspect the project files and determine which
 * template variables are already set (e.g., if mobile SDK is already configured).
 */
export class CheckExistingAppConfigurationNode extends AbstractGuidanceNode<AddFeatureState> {
  protected readonly logger: Logger;

  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('checkExistingAppConfiguration', nodeExecutor, logger);
    this.logger = logger ?? createComponentLogger('CheckExistingAppConfigurationNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    if (
      !state.templatePropertiesMetadata ||
      Object.keys(state.templatePropertiesMetadata).length === 0
    ) {
      this.logger.debug('No template properties metadata, skipping configuration check');
      return { templateProperties: {} };
    }

    const guidanceData: NodeGuidanceData = {
      nodeId: 'checkExistingAppConfiguration',
      taskPrompt: this.generateConfigurationCheckGuidance(state),
      taskInput: {
        projectPath: state.projectPath,
        platform: state.platform,
        projectName: state.projectName,
        templatePropertiesMetadata: state.templatePropertiesMetadata,
      },
      resultSchema: CHECK_EXISTING_CONFIG_RESULT_SCHEMA,
      metadata: {
        nodeName: this.name,
        description: 'Check which template variables are already configured in the app',
      },
    };

    const validatedResult =
      this.executeWithGuidance<typeof CHECK_EXISTING_CONFIG_RESULT_SCHEMA>(guidanceData);

    // Filter templatePropertiesMetadata to only include variables that need configuration
    const needsConfiguration = validatedResult.needsConfiguration || [];
    const filteredMetadata: typeof state.templatePropertiesMetadata = {};

    for (const [key, value] of Object.entries(state.templatePropertiesMetadata)) {
      if (needsConfiguration.includes(key)) {
        filteredMetadata[key] = value;
      }
    }

    this.logger.info('Configuration check completed', {
      alreadyConfigured: validatedResult.alreadyConfigured?.length || 0,
      needsConfiguration: needsConfiguration.length,
    });

    return {
      templatePropertiesMetadata: filteredMetadata,
    };
  };

  private generateConfigurationCheckGuidance(state: AddFeatureState): string {
    const variablesList = Object.entries(state.templatePropertiesMetadata)
      .map(([name, metadata]) => {
        return `- **${name}**: ${metadata.description || 'No description'} (required: ${metadata.required ? 'yes' : 'no'})`;
      })
      .join('\n');

    return dedent`
      # Check Existing App Configuration

      ## Context
      You are adding a feature template (${state.selectedFeatureTemplate}) to an existing ${state.platform} app.
      
      The feature template requires the following template variables:
      
      ${variablesList}

      ## Your Task

      Inspect the existing app at ${state.projectPath} to determine which of these variables are **already configured** in the app.

      ### For iOS Apps:
      - Check **Podfile** for existing pod dependencies (e.g., if adding mobile SDK feature, check if SalesforceSDKCore is already present)
      - Check **Info.plist** or **bootconfig.plist** for configuration values
      - Check **Swift/Objective-C source files** for hardcoded configuration values
      - Check for existing **variables.json** or configuration files

      ### For Android Apps:
      - Check **build.gradle** files for existing dependencies
      - Check **AndroidManifest.xml** for configuration values
      - Check **Java/Kotlin source files** for hardcoded configuration values
      - Check for existing configuration files

      ### Common Variables to Check:
      - **salesforceMobileSDKVersion**: Check Podfile (iOS) or build.gradle (Android) for Salesforce SDK dependencies
      - **salesforceLoginHost**: Check configuration files or source code
      - **salesforceConsumerKey**: Check configuration files or source code
      - **salesforceCallbackUrl**: Check configuration files or source code
      - **organizationId**: Check configuration files or source code
      - Any other variables specific to the feature template

      ## Expected Result Format

      After inspecting the app, respond with:

      \`\`\`json
      {
        "alreadyConfigured": ["list", "of", "variable", "names", "that", "are", "already", "set"],
        "needsConfiguration": ["list", "of", "variable", "names", "that", "need", "to", "be", "collected"]
      }
      \`\`\`

      **Important**: 
      - Only include variables in \`alreadyConfigured\` if you can **definitively** find them configured in the app
      - If a variable is not found or you're unsure, include it in \`needsConfiguration\`
      - The workflow will only prompt for variables in \`needsConfiguration\`
    `;
  }
}
