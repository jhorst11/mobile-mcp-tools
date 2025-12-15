/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { FEATURE_INTEGRATION_TOOL, FeatureIntegrationWorkflowInput } from './metadata.js';
import { AbstractNativeAddFeatureTool } from '../../base/abstractNativeAddFeatureTool.js';

export class SFMobileNativeFeatureIntegrationTool extends AbstractNativeAddFeatureTool<
  typeof FEATURE_INTEGRATION_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, FEATURE_INTEGRATION_TOOL, 'FeatureIntegrationTool', logger);
  }

  public handleRequest = async (input: FeatureIntegrationWorkflowInput) => {
    try {
      const guidance = this.generateIntegrationGuidance(input);

      return this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          },
        ],
      };
    }
  };

  private generateIntegrationGuidance(input: FeatureIntegrationWorkflowInput): string {
    return dedent`
      # Feature Integration Task

      ## Project Context
      - **Project**: ${input.projectName}
      - **Platform**: ${input.platform}
      - **Location**: ${input.projectPath}
      - **Feature Template**: ${input.selectedTemplate}
      - **Feature Description**: ${input.featureDescription}

      ## Patch Analysis
      ${input.patchAnalysis}

      ## Your Task: Apply the Feature Changes

      You need to apply the changes from the feature template patch to the existing project.
      The patch shows the minimal diff needed to add this feature.

      ### Integration Steps

      1. **Review the patch** (provided below) to understand what changes are needed
      
      2. **Apply changes systematically**:
         - **New files**: Create them with the content shown in the patch
         - **Modified files**: Apply the diffs to existing files
         - **Deleted files**: Remove them (if any)

      3. **Platform-specific considerations** (${input.platform}):
      ${
        input.platform === 'iOS'
          ? dedent`
         - **Xcode project (.pbxproj)**: Carefully apply file reference additions
         - **Info.plist**: Merge any new keys/values
         - **Podfile**: Add any new dependencies
         - **Swift files**: Ensure proper imports and module references
         - **Assets**: Copy any new assets to the project
      `
          : dedent`
         - **build.gradle**: Merge dependency changes
         - **AndroidManifest.xml**: Merge permissions and configuration
         - **Java/Kotlin files**: Ensure proper package structure
         - **Resources**: Copy any new resources to appropriate directories
      `
      }

      4. **Verify your work**:
         - All new files are in correct locations
         - Dependencies are properly declared
         - Imports/references are correct
         - No syntax errors introduced

      ## Complete Patch File

      Here is the complete patch showing all changes needed:

      \`\`\`diff
      ${input.patchContent}
      \`\`\`

      ## Expected Result Format

      After you've applied all the changes, respond with:
      
      \`\`\`json
      {
        "integrationComplete": true,
        "filesModified": ["list", "of", "files", "you", "modified"],
        "notes": "Brief summary of what you did"
      }
      \`\`\`

      **Important**: Do not proceed until you have actually applied all the changes to the project files.
      The next step in the workflow will build the project to verify your changes.
    `;
  }
}
