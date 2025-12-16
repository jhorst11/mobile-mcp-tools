/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import {
  AddFeatureWorkflowState,
  AddFeatureState,
  ADD_FEATURE_USER_INPUT_PROPERTIES,
} from './add-feature-metadata.js';
import { ProjectValidationNode } from './nodes/projectValidation.js';
import { FeatureTemplateFetchNode } from './nodes/featureTemplateFetch.js';
import { FeatureTemplateSelectionNode } from './nodes/featureTemplateSelection.js';
import { PatchInspectionNode } from './nodes/patchInspection.js';
import { FeatureIntegrationNode } from './nodes/featureIntegration.js';
import { XcodeProjectUpdateNode } from './nodes/xcodeProjectUpdate.js';
import { PodInstallNode } from './nodes/podInstall.js';
import { BuildValidationNode } from './nodes/buildValidation.js';
import { BuildRecoveryNode } from './nodes/buildRecovery.js';
import { DeploymentNode } from './nodes/deploymentNode.js';
import { CompletionNode } from './nodes/completionNode.js';
import { FailureNode } from './nodes/failureNode.js';
import { CheckProjectValidRouter } from './nodes/checkProjectValidRouter.js';
import { CheckFeatureIntegrationRouter } from './nodes/checkFeatureIntegrationRouter.js';
import { CheckXcodeUpdateRouter } from './nodes/checkXcodeUpdateRouter.js';
import { CheckPodInstallRouter } from './nodes/checkPodInstallRouter.js';
import { CheckAddFeatureBuildSuccessfulRouter } from './nodes/checkAddFeatureBuildSuccessfulRouter.js';
import {
  createGetUserInputNode,
  createUserInputExtractionNode,
  CheckPropertiesFulfilledRouter,
} from '@salesforce/magen-mcp-workflow';
import { SFMOBILE_NATIVE_ADD_FEATURE_GET_INPUT_TOOL_ID } from '../tools/utils/sfmobile-native-add-feature-get-input/metadata.js';
import { SFMOBILE_NATIVE_ADD_FEATURE_INPUT_EXTRACTION_TOOL_ID } from '../tools/utils/sfmobile-native-add-feature-input-extraction/metadata.js';

// Create user input nodes for the add-feature workflow
// These use add-feature-specific tools that point back to the add-feature orchestrator
const initialUserInputExtractionNode = createUserInputExtractionNode<AddFeatureState>({
  requiredProperties: ADD_FEATURE_USER_INPUT_PROPERTIES,
  toolId: SFMOBILE_NATIVE_ADD_FEATURE_INPUT_EXTRACTION_TOOL_ID,
  userInputProperty: 'userInput',
});

const userInputNode = createGetUserInputNode<AddFeatureState>({
  requiredProperties: ADD_FEATURE_USER_INPUT_PROPERTIES,
  toolId: SFMOBILE_NATIVE_ADD_FEATURE_GET_INPUT_TOOL_ID,
  userInputProperty: 'userInput',
});

// Create workflow nodes
const projectValidationNode = new ProjectValidationNode();
const featureTemplateFetchNode = new FeatureTemplateFetchNode();
const featureTemplateSelectionNode = new FeatureTemplateSelectionNode();
const patchInspectionNode = new PatchInspectionNode();
const featureIntegrationNode = new FeatureIntegrationNode();
const xcodeProjectUpdateNode = new XcodeProjectUpdateNode();
const podInstallNode = new PodInstallNode();
const buildValidationNode = new BuildValidationNode();
const buildRecoveryNode = new BuildRecoveryNode();
const deploymentNode = new DeploymentNode();
const completionNode = new CompletionNode();
const failureNode = new FailureNode();

// Create routers
const checkPropertiesFulfilledRouter = new CheckPropertiesFulfilledRouter<AddFeatureState>(
  projectValidationNode.name,
  userInputNode.name,
  ADD_FEATURE_USER_INPUT_PROPERTIES
);

const checkProjectValidRouter = new CheckProjectValidRouter(
  featureTemplateFetchNode.name,
  failureNode.name
);

const checkFeatureIntegrationRouter = new CheckFeatureIntegrationRouter(
  xcodeProjectUpdateNode.name,
  failureNode.name
);

const checkPodInstallRouter = new CheckPodInstallRouter(
  podInstallNode.name,
  buildValidationNode.name
);

const checkBuildSuccessfulRouter = new CheckAddFeatureBuildSuccessfulRouter(
  deploymentNode.name,
  buildRecoveryNode.name,
  failureNode.name
);

/**
 * The add-feature workflow graph for adding features to existing mobile projects
 *
 * Workflow flow:
 * 1. User input extraction and validation
 * 2. Project validation (verify it's a valid iOS/Android project)
 * 3. Feature template discovery (find matching feature templates)
 * 4. Feature template selection (choose best match)
 * 5. Patch inspection (analyze the feature's layer.patch)
 * 6. Feature integration (apply changes to project)
 * 7. Xcode project update (if iOS and files were added)
 * 8. Pod install (if iOS and Podfile was modified)
 * 9. Build validation (ensure project still builds)
 * 10. Deployment (deploy to device/simulator)
 * 11. Completion
 */
export const addFeatureWorkflow = new StateGraph(AddFeatureWorkflowState)
  // Add all workflow nodes
  .addNode(initialUserInputExtractionNode.name, initialUserInputExtractionNode.execute)
  .addNode(userInputNode.name, userInputNode.execute)
  .addNode(projectValidationNode.name, projectValidationNode.execute)
  .addNode(featureTemplateFetchNode.name, featureTemplateFetchNode.execute)
  .addNode(featureTemplateSelectionNode.name, featureTemplateSelectionNode.execute)
  .addNode(patchInspectionNode.name, patchInspectionNode.execute)
  .addNode(featureIntegrationNode.name, featureIntegrationNode.execute)
  .addNode(xcodeProjectUpdateNode.name, xcodeProjectUpdateNode.execute)
  .addNode(podInstallNode.name, podInstallNode.execute)
  .addNode(buildValidationNode.name, buildValidationNode.execute)
  .addNode(buildRecoveryNode.name, buildRecoveryNode.execute)
  .addNode(deploymentNode.name, deploymentNode.execute)
  .addNode(completionNode.name, completionNode.execute)
  .addNode(failureNode.name, failureNode.execute)

  // Define workflow edges
  .addEdge(START, initialUserInputExtractionNode.name)
  .addConditionalEdges(initialUserInputExtractionNode.name, checkPropertiesFulfilledRouter.execute)
  .addEdge(userInputNode.name, initialUserInputExtractionNode.name)
  .addConditionalEdges(projectValidationNode.name, checkProjectValidRouter.execute)
  .addEdge(featureTemplateFetchNode.name, featureTemplateSelectionNode.name)
  .addEdge(featureTemplateSelectionNode.name, patchInspectionNode.name)
  .addEdge(patchInspectionNode.name, featureIntegrationNode.name)
  .addConditionalEdges(featureIntegrationNode.name, checkFeatureIntegrationRouter.execute)
  // iOS-specific post-integration steps
  // xcodeProjectUpdateNode checks internally if it should run (iOS + filesAdded)
  // After xcodeProjectUpdateNode, check if pod install is needed
  .addConditionalEdges(xcodeProjectUpdateNode.name, checkPodInstallRouter.execute)
  // podInstallNode checks internally if it should run (iOS + podfileModified)
  // After podInstallNode, proceed to build validation
  .addEdge(podInstallNode.name, buildValidationNode.name)
  // Build validation with recovery loop
  .addConditionalEdges(buildValidationNode.name, checkBuildSuccessfulRouter.execute)
  .addEdge(buildRecoveryNode.name, buildValidationNode.name)
  // Continue to deployment and completion
  .addEdge(deploymentNode.name, completionNode.name)
  .addEdge(completionNode.name, END)
  .addEdge(failureNode.name, END);
