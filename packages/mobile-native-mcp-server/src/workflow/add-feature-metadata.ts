/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Annotation } from '@langchain/langgraph';
import z from 'zod';
import { PLATFORM_ENUM, TemplateListOutput } from '../common/schemas.js';
import { PropertyMetadata, PropertyMetadataCollection } from '@salesforce/magen-mcp-workflow';
import { TemplatePropertiesMetadata } from './metadata.js';
import { FileSnapshot } from './nodes/fileSystemSnapshot.js';

/**
 * Definition of user input properties required by the add-feature workflow.
 * Each property includes metadata for extraction, validation, and user prompting.
 */
export const ADD_FEATURE_USER_INPUT_PROPERTIES = {
  projectPath: {
    zodType: z.string().min(1),
    description: 'Absolute path to the existing iOS or Android project directory',
    friendlyName: 'project path',
  } satisfies PropertyMetadata<z.ZodString>,
  featureDescription: {
    zodType: z.string().min(1),
    description: 'Description of the feature to add to the existing application',
    friendlyName: 'feature description',
  } satisfies PropertyMetadata<z.ZodString>,
} as const satisfies PropertyMetadataCollection;

export type AddFeatureUserInputProperties = typeof ADD_FEATURE_USER_INPUT_PROPERTIES;

/**
 * Workflow state annotation for the add-feature workflow
 * Defines the structure of state that flows through the workflow nodes
 */
export const AddFeatureWorkflowState = Annotation.Root({
  // Core workflow data
  userInput: Annotation<unknown>,
  projectPath: Annotation<z.infer<typeof ADD_FEATURE_USER_INPUT_PROPERTIES.projectPath.zodType>>,
  featureDescription: Annotation<
    z.infer<typeof ADD_FEATURE_USER_INPUT_PROPERTIES.featureDescription.zodType>
  >,

  // Project validation state
  platform: Annotation<z.infer<typeof PLATFORM_ENUM>>,
  projectName: Annotation<string>,
  validProject: Annotation<boolean>,

  // Feature template discovery state
  featureTemplateOptions: Annotation<TemplateListOutput>,
  selectedFeatureTemplate: Annotation<string>,
  templatePropertiesMetadata: Annotation<TemplatePropertiesMetadata>,
  templateProperties: Annotation<Record<string, string>>,
  templatePropertiesUserInput: Annotation<unknown>,
  patchContent: Annotation<string>,
  patchAnalysis: Annotation<string>,

  // Feature integration state
  integrationSuccessful: Annotation<boolean>,
  integrationErrorMessages: Annotation<string[]>,
  filesAdded: Annotation<string[]>,
  filesRemoved: Annotation<string[]>,
  podfileModified: Annotation<boolean>,

  // File system tracking (for automated Xcode sync)
  preIntegrationFileSnapshot: Annotation<FileSnapshot>,
  filesActuallyAdded: Annotation<string[]>,
  filesActuallyRemoved: Annotation<string[]>,
  filesActuallyModified: Annotation<string[]>,

  // Xcode project sync state
  xcodeUpdateSuccessful: Annotation<boolean>,
  filesAddedToXcode: Annotation<string[]>,
  filesRemovedFromXcode: Annotation<string[]>,

  // Build and deployment state (reusing from main workflow)
  buildType: Annotation<'debug' | 'release'>,
  targetDevice: Annotation<string>,
  buildSuccessful: Annotation<boolean>,
  buildAttemptCount: Annotation<number>,
  buildErrorMessages: Annotation<string[]>,
  maxBuildRetries: Annotation<number>,
  buildOutputFilePath: Annotation<string>,
  recoveryReadyForRetry: Annotation<boolean>,
  deploymentStatus: Annotation<string>,

  // Error handling
  workflowFatalErrorMessages: Annotation<string[]>,
});

export type AddFeatureState = typeof AddFeatureWorkflowState.State;
