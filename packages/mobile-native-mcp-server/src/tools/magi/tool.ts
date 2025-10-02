/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger, createComponentLogger } from '../../logging/logger.js';
import { AbstractTool } from '../base/abstractTool.js';
import { promises as fs } from 'fs';
import path from 'path';
import z from 'zod';
import { ToolMetadata } from '../../common/metadata.js';

// Import state handlers
import { InitStateHandler } from './nodes/initState.js';
import { BuildingPrdStateHandler } from './nodes/prd/buildingPrdState.js';
import { BuildingTddStateHandler } from './nodes/tdd/buildingTddState.js';
import { BuildingTasksStateHandler } from './nodes/tasks/buildingTasksState.js';
import { CompletedStateHandler } from './nodes/completedState.js';
import { MagiStateManager, MagiState } from './nodes/stateManager.js';
import { MagiStateContext, MagiStateHandler } from './nodes/base.js';
import { generateNextFeatureId, isValidFeatureId } from './utils/featureIdGenerator.js';

/**
 * Magi Tool Input Schema
 */
const MAGI_INPUT_SCHEMA = z.object({
  projectPath: z.string().describe('Path to the project where magi-sdd directory will be created'),
  featureId: z.string().describe('Unique identifier for the feature being developed'),
  userInput: z
    .string()
    .optional()
    .describe('User input for finalizing documents (only accepted in appropriate states)'),
});

/**
 * Magi Tool Output Schema
 */
const MAGI_OUTPUT_SCHEMA = z.object({
  success: z.boolean().describe('Whether the operation was successful'),
  featureId: z.string().describe('The feature ID that was processed'),
  projectPath: z.string().describe('The project path where documents were created'),
  magiDirectory: z.string().describe('Path to the created magi-sdd directory'),
  currentState: z.string().describe('Current state of the workflow'),
  nextAction: z.string().describe('Recommended next action'),
  documents: z
    .object({
      prd: z.object({
        status: z.string().describe('PRD document status'),
        path: z.string().describe('Path to the PRD document'),
      }),
      tdd: z.object({
        status: z.string().describe('TDD document status'),
        path: z.string().describe('Path to the TDD document'),
      }),
      tasks: z.object({
        status: z.string().describe('Tasks document status'),
        path: z.string().describe('Path to the tasks document'),
      }),
    })
    .describe('Status of all generated documents'),
});

export type MagiInput = z.infer<typeof MAGI_INPUT_SCHEMA>;
export type MagiOutput = z.infer<typeof MAGI_OUTPUT_SCHEMA>;

/**
 * Magi Tool Metadata
 */
const MAGI_TOOL: ToolMetadata<typeof MAGI_INPUT_SCHEMA, typeof MAGI_OUTPUT_SCHEMA> = {
  toolId: 'magi',
  title: 'Magi Workflow Tool',
  description: 'Simplified magi workflow that handles all states in one tool',
  inputSchema: MAGI_INPUT_SCHEMA,
  outputSchema: MAGI_OUTPUT_SCHEMA,
} as const;

/**
 * Magi Tool - Feature Development Workflow Orchestrator
 *
 * Implements a simplified workflow for generating feature development documents:
 * 1. PRD (Product Requirements Document)
 * 2. TDD (Technical Design Document)
 * 3. Tasks (Task breakdown document)
 *
 * Each document goes through states: init -> in_progress -> finalized
 * Workflow only progresses to next document when previous is finalized
 */
export class MagiTool extends AbstractTool<typeof MAGI_TOOL> {
  private stateManager: MagiStateManager;
  private stateHandlers: Map<MagiState, MagiStateHandler>;

  constructor(server: McpServer, logger?: Logger) {
    const effectiveLogger = logger || createComponentLogger('MagiTool');
    super(server, MAGI_TOOL, 'MagiTool', effectiveLogger);

    // TODO: Langgraph should be used instead of the state manager
    this.stateManager = new MagiStateManager();
    this.stateHandlers = new Map([
      ['init', new InitStateHandler()],
      ['buildingPrd', new BuildingPrdStateHandler()],
      ['buildingTdd', new BuildingTddStateHandler()],
      ['buildingTasks', new BuildingTasksStateHandler()],
      ['completed', new CompletedStateHandler()],
    ]);
  }

  public handleRequest = async (input: MagiInput) => {
    this.logger.debug('Magi tool called with input', input);

    try {
      const result = await this.processMagiWorkflow(input);
      this.logger.debug('Magi workflow completed', result);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result),
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      this.logError('Error in magi workflow execution', error as Error, { input });
      throw error;
    }
  };

  private async processMagiWorkflow(input: MagiInput): Promise<MagiOutput> {
    const { projectPath, featureId: inputFeatureId, userInput } = input;

    // Process featureId - generate proper format if needed
    let featureId: string;
    if (isValidFeatureId(inputFeatureId)) {
      // Already in correct format
      featureId = inputFeatureId;
    } else {
      // Generate next available feature ID
      featureId = await generateNextFeatureId(projectPath, inputFeatureId);
      this.logger.info(`Generated feature ID: ${featureId} from input: ${inputFeatureId}`);
    }

    // Create magi-sdd directory structure
    const magiDirectory = path.join(projectPath, 'magi-sdd', featureId);
    await this.ensureMagiDirectory(magiDirectory);

    const prdPath = path.join(magiDirectory, 'prd.md');
    const tddPath = path.join(magiDirectory, 'tdd.md');
    const tasksPath = path.join(magiDirectory, 'tasks.md');

    // Determine current state based on file existence and content
    const currentState = await this.stateManager.determineCurrentState(prdPath, tddPath, tasksPath);

    this.logger.info('Processing magi workflow', {
      featureId,
      projectPath,
      magiDirectory,
      currentState,
      hasUserInput: !!userInput,
    });

    // Create context for state handler
    const context: MagiStateContext = {
      featureId,
      projectPath,
      magiDirectory,
      prdPath,
      tddPath,
      tasksPath,
      userInput,
      logger: this.logger,
    };

    // Get and execute the appropriate state handler
    const stateHandler = this.stateHandlers.get(currentState);
    if (!stateHandler) {
      throw new Error(`No handler found for state: ${currentState}`);
    }

    return await stateHandler.handle(context);
  }

  private async ensureMagiDirectory(magiDirectory: string): Promise<void> {
    try {
      await fs.mkdir(magiDirectory, { recursive: true });
      this.logger.debug('Magi directory ensured', { magiDirectory });
    } catch (error) {
      this.logger.error('Failed to ensure magi directory', error as Error);
      throw error;
    }
  }
}
