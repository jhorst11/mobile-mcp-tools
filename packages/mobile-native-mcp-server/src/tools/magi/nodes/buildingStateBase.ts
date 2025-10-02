/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { promises as fs } from 'fs';
import dedent from 'dedent';
import path from 'path';
import { MagiStateHandler, MagiStateContext, MagiStateResult } from './base.js';
import { processTemplate, createTemplateContext } from '../utils/templateProcessor.js';

export interface DocumentConfig {
  name: string;
  currentPath: string;
  nextPath?: string;
  currentState: string;
  nextState?: string;
  instructionsFile: string;
  nextInstructionsFile?: string;
}

export abstract class BuildingStateBase extends MagiStateHandler {
  protected async loadInstructions(
    instructionsPath: string,
    context: MagiStateContext,
    documentType: string
  ): Promise<string> {
    try {
      const template = await fs.readFile(instructionsPath, 'utf8');
      const templateContext = createTemplateContext(context);
      return processTemplate(template, templateContext);
    } catch (error) {
      throw new Error(`Failed to read ${documentType} instructions: ${error}`);
    }
  }

  protected async handleFinalize(
    context: MagiStateContext,
    config: DocumentConfig
  ): Promise<MagiStateResult> {
    const { featureId, projectPath, magiDirectory, prdPath, tddPath, tasksPath } = context;

    // Finalize current document
    await this.markDocumentAsFinalized(config.currentPath, config.name);

    if (config.nextPath && config.nextState && config.nextInstructionsFile) {
      // Create placeholder for next document
      await this.createPlaceholderFile(
        config.nextPath,
        config.nextState.replace('building', '').toUpperCase()
      );

      // Load next instructions
      const nextInstructions = await this.loadInstructions(
        config.nextInstructionsFile,
        context,
        config.nextState.replace('building', '').toUpperCase()
      );

      const nextDocumentType = config.nextState.replace('building', '').toUpperCase();
      const saveInstruction = `The model MUST save the ${nextDocumentType} ${nextDocumentType === 'TASKS' ? 'document' : ''} to the specified file path.`;
      const replacedInstructions = nextInstructions.replace(
        saveInstruction,
        `The model MUST save the ${nextDocumentType} ${nextDocumentType === 'TASKS' ? 'document' : ''} to: ${config.nextPath}`
      );

      return {
        success: true,
        featureId,
        projectPath,
        magiDirectory,
        currentState: config.nextState,
        nextAction: dedent`
          ${config.name} finalized! I've created a placeholder ${nextDocumentType} document. Here's comprehensive guidance on creating a complete ${nextDocumentType.toLowerCase()}:

          ${replacedInstructions}
        `,
        documents: this.getDocumentStatuses(prdPath, tddPath, tasksPath, config),
      };
    } else {
      // Workflow complete
      return {
        success: true,
        featureId,
        projectPath,
        magiDirectory,
        currentState: 'completed',
        nextAction: 'All documents have been finalized! The magi workflow is complete.',
        documents: {
          prd: { status: 'finalized', path: prdPath },
          tdd: { status: 'finalized', path: tddPath },
          tasks: { status: 'finalized', path: tasksPath },
        },
      };
    }
  }

  protected async handleContinue(
    context: MagiStateContext,
    config: DocumentConfig
  ): Promise<MagiStateResult> {
    const { featureId, projectPath, magiDirectory, prdPath, tddPath, tasksPath } = context;

    // Load current instructions
    const instructions = await this.loadInstructions(config.instructionsFile, context, config.name);

    const saveInstruction = `The model MUST save the ${config.name} ${config.name === 'Tasks' ? 'document' : ''} to the specified file path.`;
    const replacedInstructions = instructions.replace(
      saveInstruction,
      `The model MUST save the ${config.name} ${config.name === 'Tasks' ? 'document' : ''} to: ${path.relative(projectPath, config.currentPath)}`
    );

    return {
      success: true,
      featureId,
      projectPath,
      magiDirectory,
      currentState: config.currentState,
      nextAction: dedent`
        You are currently building the ${config.name} ${config.name === 'PRD' ? '(Product Requirements Document)' : config.name === 'TDD' ? '(Technical Design Document)' : 'document'}. Here's comprehensive guidance on creating a complete${config.name === 'PRD' ? ', clear PRD' : config.name === 'TDD' ? ' TDD' : ' task breakdown'}:

        ${replacedInstructions}
      `,
      documents: this.getDocumentStatuses(prdPath, tddPath, tasksPath, config),
    };
  }

  private getDocumentStatuses(
    prdPath: string,
    tddPath: string,
    tasksPath: string,
    config: DocumentConfig
  ) {
    const statuses: {
      prd: { status: 'init' | 'in_progress' | 'finalized'; path: string };
      tdd: { status: 'init' | 'in_progress' | 'finalized'; path: string };
      tasks: { status: 'init' | 'in_progress' | 'finalized'; path: string };
    } = {
      prd: { status: 'init', path: prdPath },
      tdd: { status: 'init', path: tddPath },
      tasks: { status: 'init', path: tasksPath },
    };

    // Set statuses based on current state
    switch (config.currentState) {
      case 'buildingPrd':
        statuses.prd.status = 'in_progress';
        break;
      case 'buildingTdd':
        statuses.prd.status = 'finalized';
        statuses.tdd.status = 'in_progress';
        break;
      case 'buildingTasks':
        statuses.prd.status = 'finalized';
        statuses.tdd.status = 'finalized';
        statuses.tasks.status = 'in_progress';
        break;
    }

    return statuses;
  }

  async handle(context: MagiStateContext): Promise<MagiStateResult> {
    const config = this.getDocumentConfig(context);

    if (context.userInput === 'finalize') {
      return this.handleFinalize(context, config);
    } else {
      return this.handleContinue(context, config);
    }
  }

  protected abstract getDocumentConfig(context: MagiStateContext): DocumentConfig;
}
