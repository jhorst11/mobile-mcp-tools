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
import { FeatureTemplatePropertiesExtractionNode } from './nodes/featureTemplatePropertiesExtraction.js';
import { CheckExistingAppConfigurationNode } from './nodes/checkExistingAppConfiguration.js';
import { FeatureTemplatePropertiesUserInputNode } from './nodes/featureTemplatePropertiesUserInput.js';
import { FeatureTemplatePropertiesExtractionFromInputNode } from './nodes/featureTemplatePropertiesExtractionFromInput.js';
import { CheckFeatureTemplatePropertiesFulfilledRouter } from './nodes/checkFeatureTemplatePropertiesFulfilledRouter.js';
import { PatchInspectionNode } from './nodes/patchInspection.js';
import { FileSystemSnapshotNode } from './nodes/fileSystemSnapshot.js';
import { FeatureIntegrationNode } from './nodes/featureIntegration.js';
import { FileSystemDiffNode } from './nodes/fileSystemDiff.js';
import { XcodeProjectSyncNode } from './nodes/xcodeProjectSync.js';
import { PodInstallNode } from './nodes/podInstall.js';
import { BuildValidationNode } from './nodes/buildValidation.js';
import { BuildRecoveryNode } from './nodes/buildRecovery.js';
import { DeploymentNode } from './nodes/deploymentNode.js';
import { CompletionNode } from './nodes/completionNode.js';
import { FailureNode } from './nodes/failureNode.js';
import { CheckProjectValidRouter } from './nodes/checkProjectValidRouter.js';
import { CheckFeatureIntegrationRouter } from './nodes/checkFeatureIntegrationRouter.js';
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
const featureTemplatePropertiesExtractionNode = new FeatureTemplatePropertiesExtractionNode();
const checkExistingAppConfigurationNode = new CheckExistingAppConfigurationNode();
const featureTemplatePropertiesUserInputNode = new FeatureTemplatePropertiesUserInputNode();
const featureTemplatePropertiesExtractionFromInputNode =
  new FeatureTemplatePropertiesExtractionFromInputNode();
const patchInspectionNode = new PatchInspectionNode();
const fileSystemSnapshotNode = new FileSystemSnapshotNode();
const featureIntegrationNode = new FeatureIntegrationNode();
const fileSystemDiffNode = new FileSystemDiffNode();
const xcodeProjectSyncNode = new XcodeProjectSyncNode();
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

const checkFeatureTemplatePropertiesFulfilledRouter =
  new CheckFeatureTemplatePropertiesFulfilledRouter(
    patchInspectionNode.name,
    featureTemplatePropertiesUserInputNode.name
  );

const checkFeatureIntegrationRouter = new CheckFeatureIntegrationRouter(
  fileSystemDiffNode.name,
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
 * 5. Template properties extraction (extract variables from selected template)
 * 6. Check existing app configuration (determine which variables are already configured)
 * 7. Collect missing template variables (prompt user for variables not already configured)
 * 8. Patch inspection (analyze the feature's layer.patch for guidance)
 * 9. File system snapshot (capture pre-integration state)
 * 10. Feature integration (LLM applies changes to project based on patch guidance)
 * 11. File system diff (compare before/after to see what actually changed)
 * 12. Xcode project sync (automated: sync project.pbxproj with actual file system)
 * 13. Pod install (if iOS and Podfile was modified)
 * 14. Build validation (ensure project still builds)
 * 15. Deployment (deploy to device/simulator)
 * 16. Completion
 */
export const addFeatureWorkflow = new StateGraph(AddFeatureWorkflowState)
  // Add all workflow nodes
  .addNode(initialUserInputExtractionNode.name, initialUserInputExtractionNode.execute)
  .addNode(userInputNode.name, userInputNode.execute)
  .addNode(projectValidationNode.name, projectValidationNode.execute)
  .addNode(featureTemplateFetchNode.name, featureTemplateFetchNode.execute)
  .addNode(featureTemplateSelectionNode.name, featureTemplateSelectionNode.execute)
  .addNode(
    featureTemplatePropertiesExtractionNode.name,
    featureTemplatePropertiesExtractionNode.execute
  )
  .addNode(checkExistingAppConfigurationNode.name, checkExistingAppConfigurationNode.execute)
  .addNode(
    featureTemplatePropertiesUserInputNode.name,
    featureTemplatePropertiesUserInputNode.execute
  )
  .addNode(
    featureTemplatePropertiesExtractionFromInputNode.name,
    featureTemplatePropertiesExtractionFromInputNode.execute
  )
  .addNode(patchInspectionNode.name, patchInspectionNode.execute)
  .addNode(fileSystemSnapshotNode.name, fileSystemSnapshotNode.execute)
  .addNode(featureIntegrationNode.name, featureIntegrationNode.execute)
  .addNode(fileSystemDiffNode.name, fileSystemDiffNode.execute)
  .addNode(xcodeProjectSyncNode.name, xcodeProjectSyncNode.execute)
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
  .addEdge(featureTemplateSelectionNode.name, featureTemplatePropertiesExtractionNode.name)
  .addEdge(featureTemplatePropertiesExtractionNode.name, checkExistingAppConfigurationNode.name)
  .addConditionalEdges(
    checkExistingAppConfigurationNode.name,
    checkFeatureTemplatePropertiesFulfilledRouter.execute
  )
  .addEdge(
    featureTemplatePropertiesUserInputNode.name,
    featureTemplatePropertiesExtractionFromInputNode.name
  )
  .addConditionalEdges(
    featureTemplatePropertiesExtractionFromInputNode.name,
    checkFeatureTemplatePropertiesFulfilledRouter.execute
  )
  .addEdge(patchInspectionNode.name, fileSystemSnapshotNode.name)
  .addEdge(fileSystemSnapshotNode.name, featureIntegrationNode.name)
  .addConditionalEdges(featureIntegrationNode.name, checkFeatureIntegrationRouter.execute)
  // Post-integration: automatically detect file changes and sync Xcode
  .addEdge(fileSystemDiffNode.name, xcodeProjectSyncNode.name)
  // After Xcode sync, check if pod install is needed
  .addConditionalEdges(xcodeProjectSyncNode.name, checkPodInstallRouter.execute)
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
