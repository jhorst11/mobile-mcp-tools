/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { MobileNativeWorkflowState } from './metadata.js';
import { EnvironmentValidationNode } from './nodes/environment.js';
import { TemplateDiscoveryNode } from './nodes/templateDiscovery.js';
import { ProjectGenerationNode } from './nodes/projectGeneration.js';
import { BuildValidationNode } from './nodes/buildValidation.js';
import { BuildRecoveryNode } from './nodes/buildRecovery.js';
import { CheckBuildSuccessfulRouter } from './nodes/checkBuildSuccessfulRouter.js';
import { DeploymentNode } from './nodes/deploymentNode.js';
import { CompletionNode } from './nodes/completionNode.js';
import { FailureNode } from './nodes/failureNode.js';
import { CheckEnvironmentValidatedRouter } from './nodes/checkEnvironmentValidated.js';
import { InputGatheringSetupNode } from './nodes/inputGatheringSetupNode.js';
import { InputOrchestratorNode } from './nodes/inputOrchestratorNode.js';
import { CheckInputGatheringCompleteRouter } from './nodes/checkInputGatheringCompleteRouter.js';

// Flexible input gathering nodes
const inputGatheringSetupNode = new InputGatheringSetupNode();
const inputOrchestratorNode = new InputOrchestratorNode();

// Core workflow nodes
const environmentValidationNode = new EnvironmentValidationNode();
const templateDiscoveryNode = new TemplateDiscoveryNode();
const projectGenerationNode = new ProjectGenerationNode();
const buildValidationNode = new BuildValidationNode();
const buildRecoveryNode = new BuildRecoveryNode();
const deploymentNode = new DeploymentNode();
const completionNode = new CompletionNode();
const failureNode = new FailureNode();

// Routers
const checkInputGatheringCompleteRouter = new CheckInputGatheringCompleteRouter(
  templateDiscoveryNode.name,
  inputOrchestratorNode.name,
  failureNode.name,
  5 // maxRounds
);
const checkEnvironmentValidatedRouter = new CheckEnvironmentValidatedRouter(
  inputGatheringSetupNode.name,
  failureNode.name
);
const checkBuildSuccessfulRouter = new CheckBuildSuccessfulRouter(
  deploymentNode.name,
  buildRecoveryNode.name,
  failureNode.name
);

/**
 * The main workflow graph for mobile native app development
 * Follows the Plan → Design/Iterate → Run three-phase architecture
 * Steel thread implementation starts with user input triage, then Plan → Run with basic Contact list app
 *
 * Uses the flexible input gathering system for efficient batch property collection (85% reduction in tool calls).
 */
export const mobileNativeWorkflow = new StateGraph(MobileNativeWorkflowState)
  // Add all workflow nodes
  .addNode(environmentValidationNode.name, environmentValidationNode.execute)
  .addNode(inputGatheringSetupNode.name, inputGatheringSetupNode.execute)
  .addNode(inputOrchestratorNode.name, inputOrchestratorNode.execute)
  .addNode(templateDiscoveryNode.name, templateDiscoveryNode.execute)
  .addNode(projectGenerationNode.name, projectGenerationNode.execute)
  .addNode(buildValidationNode.name, buildValidationNode.execute)
  .addNode(buildRecoveryNode.name, buildRecoveryNode.execute)
  .addNode(deploymentNode.name, deploymentNode.execute)
  .addNode(completionNode.name, completionNode.execute)
  .addNode(failureNode.name, failureNode.execute)

  // Define workflow edges - streamlined with flexible input system
  .addEdge(START, environmentValidationNode.name)
  .addConditionalEdges(environmentValidationNode.name, checkEnvironmentValidatedRouter.execute)
  .addEdge(inputGatheringSetupNode.name, inputOrchestratorNode.name)
  .addConditionalEdges(inputOrchestratorNode.name, checkInputGatheringCompleteRouter.execute)
  .addEdge(templateDiscoveryNode.name, projectGenerationNode.name)
  .addEdge(projectGenerationNode.name, buildValidationNode.name)
  // Build validation with recovery loop
  .addConditionalEdges(buildValidationNode.name, checkBuildSuccessfulRouter.execute)
  .addEdge(buildRecoveryNode.name, buildValidationNode.name)
  // Continue to deployment and completion
  .addEdge(deploymentNode.name, completionNode.name)
  .addEdge(completionNode.name, END)
  .addEdge(failureNode.name, END);
