/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { join } from 'path';

/**
 * Gets the .magen directory path for a project
 * @param projectPath The project root path
 * @returns The .magen directory path
 */
export function getMagenDir(projectPath: string): string {
  return join(projectPath, '.magen');
}

/**
 * Gets the .instructions directory path for a project
 * @param projectPath The project root path
 * @returns The .instructions directory path
 */
export function getInstructionsDir(projectPath: string): string {
  return join(getMagenDir(projectPath), '.instructions');
}

/**
 * Gets a feature directory path
 * @param projectPath The project root path
 * @param featureId The feature ID
 * @returns The feature directory path
 */
export function getFeatureDir(projectPath: string, featureId: string): string {
  return join(getMagenDir(projectPath), featureId);
}

/**
 * Gets the state.json file path for a feature
 * @param projectPath The project root path
 * @param featureId The feature ID
 * @returns The state.json file path
 */
export function getStateJsonPath(projectPath: string, featureId: string): string {
  return join(getFeatureDir(projectPath, featureId), 'state.json');
}

/**
 * Gets the PRD file path for a feature
 * @param projectPath The project root path
 * @param featureId The feature ID
 * @returns The PRD file path
 */
export function getPrdPath(projectPath: string, featureId: string): string {
  return join(getFeatureDir(projectPath, featureId), 'prd.md');
}

/**
 * Gets the requirements file path for a feature
 * @param projectPath The project root path
 * @param featureId The feature ID
 * @returns The requirements file path
 */
export function getRequirementsPath(projectPath: string, featureId: string): string {
  return join(getFeatureDir(projectPath, featureId), 'requirements.md');
}

/**
 * Gets the tasks file path for a feature
 * @param projectPath The project root path
 * @param featureId The feature ID
 * @returns The tasks file path
 */
export function getTasksPath(projectPath: string, featureId: string): string {
  return join(getFeatureDir(projectPath, featureId), 'tasks.md');
}
