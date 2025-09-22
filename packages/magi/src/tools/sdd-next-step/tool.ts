/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { Tool } from '../tool.js';
import { SddNextStepInputSchema, SddNextStepInputType } from '../../schemas/sddNextStepSchema.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  validateProjectPath,
  validateMagenDirectory,
  getMagenDir,
  pathExists,
} from '../../utils/index.js';

interface StateJson {
  version: string;
  state: string;
  featureId: string;
  timestamps: {
    created: string;
    lastUpdated: string;
    tddFinalized?: string;
    prdFinalized?: string;
    tasksFinalized?: string;
  };
  tdd: {
    state: string;
  };
  prd: {
    state: string;
  };
  build: {
    state: string;
  };
  changelog: Array<{
    date: string;
    action: string;
    description: string;
  }>;
}

export class SddNextStepTool implements Tool {
  public readonly name = 'Magi SDD Next Step';
  public readonly title = 'Magi SDD Next Step Tool';
  public readonly toolId = 'magi-next-step';
  public readonly description =
    'Checks the state.json to determine which step of the feature generation we are currently in and provides pointers as to what should be done';
  public readonly inputSchema = SddNextStepInputSchema;

  /**
   * Public method to get the next step for a feature
   * @param input The next step input parameters
   * @returns Result of the next step guidance
   */
  public async getNextStep(input: SddNextStepInputType) {
    return this.handleRequest(input);
  }

  /**
   * Loads and parses the state.json file for a feature
   * @param stateJsonPath Path to the state.json file
   * @returns Parsed state.json or error
   */
  private async loadStateJson(stateJsonPath: string): Promise<StateJson | null> {
    try {
      const content = await fs.readFile(stateJsonPath, 'utf8');
      return JSON.parse(content) as StateJson;
    } catch {
      return null;
    }
  }

  /**
   * Determines the current step and provides guidance
   * @param stateJson The parsed state.json object
   * @param featureId The feature ID
   * @returns Guidance text for the next step
   */
  private getStepGuidance(stateJson: StateJson, featureId: string): string {
    const { prd, tdd, build, timestamps } = stateJson;

    // Check if PRD is not finalized
    if (prd.state !== 'finalized') {
      return `## Next Step: PRD Development

**Current Status:** PRD is ${prd.state}
**Feature ID:** ${featureId}

### What to do next:
1. **Work on the PRD** - Follow the instructions in \`magi-sdd/.instructions/prd/build-prd.md\`
2. **Gather requirements** - Ask the user targeted questions to extract detailed requirements
3. **Create the PRD** - Generate a complete Product Requirements Document
4. **Finalize the PRD** - Set \`prd.state = "finalized"\` in state.json when complete

### Prerequisites:
- Feature brief (intent, users, business value, constraints) should be available
- User should be ready to provide detailed requirements

### Gating Rule:
- TDD cannot proceed until PRD is finalized
- Tasks cannot proceed until both PRD and TDD are finalized`;
    }

    // Check if TDD is not finalized
    if (tdd.state !== 'finalized') {
      return `## Next Step: TDD Development

**Current Status:** PRD is finalized, TDD is ${tdd.state}
**Feature ID:** ${featureId}

### What to do next:
1. **Work on the TDD** - Follow the instructions in \`magi-sdd/.instructions/tdd/build-tdd.md\`
2. **Derive technical requirements** - Create functional and non-functional requirements from the PRD
3. **Define technical specifications** - Document schemas, API contracts, and technical details
4. **Finalize the TDD** - Set \`tdd.state = "finalized"\` in state.json when complete

### Prerequisites:
- PRD must be finalized (✓ completed)
- PRD file must exist at \`magi-sdd/${featureId}/prd.md\`

### Gating Rule:
- Tasks cannot proceed until TDD is finalized`;
    }

    // Check if build/tasks is not finalized
    if (build.state !== 'finalized') {
      return `## Next Step: Task Development

**Current Status:** PRD and TDD are finalized, Build/Tasks is ${build.state}
**Feature ID:** ${featureId}

### What to do next:
1. **Work on the Tasks** - Follow the instructions in \`magi-sdd/.instructions/tasks/build-tasks.md\`
2. **Create implementation tasks** - Break down the TDD into actionable development tasks
3. **Define acceptance criteria** - Specify how each task will be validated
4. **Finalize the Tasks** - Set \`build.state = "finalized"\` in state.json when complete

### Prerequisites:
- PRD must be finalized (✓ completed)
- TDD must be finalized (✓ completed)
- Both PRD and TDD files must exist

### Gating Rule:
- Implementation can begin once all phases are finalized`;
    }

    // All phases are finalized
    return `## Feature Complete

**Current Status:** All phases finalized
**Feature ID:** ${featureId}

### Summary:
- ✅ PRD: ${prd.state} (finalized ${timestamps.prdFinalized || 'unknown'})
- ✅ TDD: ${tdd.state} (finalized ${timestamps.tddFinalized || 'unknown'})
- ✅ Tasks: ${build.state} (finalized ${timestamps.tasksFinalized || 'unknown'})

### What to do next:
1. **Review the deliverables** - Ensure all documents are complete and accurate
2. **Begin implementation** - Start development based on the finalized tasks
3. **Create a new feature** - Use \`magi-build-feature\` to start another feature

### All phases are complete and ready for implementation!`;
  }

  protected async handleRequest(input: SddNextStepInputType) {
    try {
      const { projectPath, featureId } = input;

      // Validate project path
      const projectValidation = await validateProjectPath(projectPath);
      if (projectValidation.isError) {
        return projectValidation;
      }

      // Validate magi-sdd directory
      const magenValidation = await validateMagenDirectory(projectPath);
      if (magenValidation.isError) {
        return magenValidation;
      }

      const magenDir = getMagenDir(projectPath);
      const featureDir = join(magenDir, featureId);
      const stateJsonPath = join(featureDir, 'state.json');

      // Check if feature directory exists
      const featureExists = await pathExists(featureDir);
      if (!featureExists) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Feature directory ${featureDir} does not exist. Please create the feature first using the sdd-build-feature tool.`,
            },
          ],
        };
      }

      // Check if state.json exists
      const stateJsonExists = await pathExists(stateJsonPath);
      if (!stateJsonExists) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: state.json file does not exist for feature ${featureId}. The feature may be corrupted. Please recreate the feature using the sdd-build-feature tool.`,
            },
          ],
        };
      }

      // Load and parse state.json
      const stateJson = await this.loadStateJson(stateJsonPath);
      if (!stateJson) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error: Failed to parse state.json for feature ${featureId}. The file may be corrupted.`,
            },
          ],
        };
      }

      // Get step guidance
      const guidance = this.getStepGuidance(stateJson, featureId);

      return {
        isError: false,
        content: [
          {
            type: 'text' as const,
            text: guidance,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error getting next step: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  public register(server: McpServer, annotations: ToolAnnotations): void {
    // Add title annotation from the tool
    const enhancedAnnotations = {
      ...annotations,
      title: this.title,
    };

    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      enhancedAnnotations,
      this.handleRequest.bind(this)
    );
  }
}
