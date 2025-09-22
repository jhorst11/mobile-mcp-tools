/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

export { getInstructionFilePaths, type InstructionFilePaths } from './instructionPaths.js';
export {
  getResourcesPath,
  pathExists,
  ensureDirectory,
  ensureFile,
  copyRecursive,
  validateProjectPath,
  validateMagenDirectory,
  createFeatureDirectory,
  loadStateJsonTemplate,
  type FileSystemError,
  type FileSystemSuccess,
  type FileSystemResult,
} from './fileSystem.js';
export {
  getMagenDir,
  getInstructionsDir,
  getFeatureDir,
  getStateJsonPath,
  getPrdPath,
  getTddPath,
  getTasksPath,
} from './paths.js';
