/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import {
  AbstractGuidanceNode,
  Logger,
  NodeExecutor,
  NodeGuidanceData,
} from '@salesforce/magen-mcp-workflow';
import { PRDState } from '../metadata.js';
import { evaluationToScore } from '../../../utils/gapAnalysisScoring.js';
import { getMagiPath, MAGI_ARTIFACTS } from '../../../utils/magiDirectory.js';

export class PRDGapAnalysisNode extends AbstractGuidanceNode<PRDState> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('gapAnalysis', nodeExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const featureBriefPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF
    );

    const requirementsPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS
    );

    const resultSchema = z.object({
      gapAnalysisEvaluation: z.enum(['Excellent', 'Good', 'Fair', 'Poor']),
      identifiedGaps: z.array(
        z.object({
          category: z.string(),
          severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
          description: z.string(),
          suggestedRequirement: z.string().optional(),
        })
      ),
    });

    const guidanceData: NodeGuidanceData = {
      nodeId: 'gapAnalysis',
      taskPrompt: this.generateGapAnalysisGuidance(featureBriefPath, requirementsPath),
      taskInput: {
        featureBriefPath: featureBriefPath,
        requirementsPath: requirementsPath,
      },
      resultSchema: resultSchema,
      metadata: {
        nodeName: this.name,
        description: 'Analyze requirements for gaps against the feature brief',
      },
    };

    const validatedResult = this.executeWithGuidance(guidanceData);

    // Convert textual evaluation to numeric score
    const gapAnalysisScore = evaluationToScore(validatedResult.gapAnalysisEvaluation);

    return {
      gapAnalysisScore,
      identifiedGaps: validatedResult.identifiedGaps,
    };
  };

  private generateGapAnalysisGuidance(featureBriefPath: string, requirementsPath: string): string {
    return `
You are a requirements analysis expert conducting a gap analysis for a Salesforce mobile native app. Analyze the current functional requirements against the feature brief to identify gaps and provide recommendations.

## Feature Brief

**File Path**: ${featureBriefPath}

Please read the feature brief file from the path above.

## Current Functional Requirements

**File Path**: ${requirementsPath}

Please read the requirements file from the path above.

## Your Task

Conduct a comprehensive gap analysis examining:

1. **Coverage**: Does each aspect of the feature brief have corresponding requirements?
2. **Completeness**: Are all necessary components, flows, and edge cases covered?
3. **Clarity**: Are requirements specific, measurable, and actionable?
4. **Feasibility**: Are requirements realistic for a mobile native app?
5. **Salesforce Integration**: Are Salesforce-specific capabilities properly addressed?
6. **User Experience**: Are user flows and interactions properly defined?

**Important**: When analyzing requirements, focus on **approved requirements** and **modified requirements**. Ignore **rejected requirements** and **out-of-scope requirements** as they have been explicitly excluded from the feature scope.

## Analysis Guidelines

### Severity Assessment
- **Critical**: Fundamental functionality missing
- **High**: Important functionality missing that significantly impacts user experience
- **Medium**: Nice-to-have functionality missing
- **Low**: Minor enhancements missing

### Gap Analysis Evaluation
Provide a textual evaluation of the overall requirements quality based on:
- **Coverage**: How well requirements cover the feature brief
- **Completeness**: Whether all necessary components and flows are covered
- **Clarity**: Whether requirements are specific, measurable, and actionable
- **Feasibility**: Whether requirements are realistic for mobile native app

**Evaluation Levels:**
- **Excellent**: Requirements are comprehensive and well-defined, covering all aspects of the feature brief with clarity and feasibility
- **Good**: Requirements are mostly complete with minor gaps or areas that could be improved
- **Fair**: Requirements have some notable gaps but are workable and address the core functionality
- **Poor**: Requirements have significant gaps that need substantial attention before proceeding

Provide detailed, actionable feedback to improve requirements quality and completeness.
`;
  }
}
