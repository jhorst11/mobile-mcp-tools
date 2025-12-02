/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import type {
  TemplateInfo,
  TemplateRequirements,
  TemplateMatch,
  RankedTemplate,
} from '../types/index.js';

interface ScoreWeights {
  platformMatch: number;
  capabilityCoverage: number;
  complexityMatch: number;
  tagRelevance: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  platformMatch: 1.0, // Must match
  capabilityCoverage: 0.4,
  complexityMatch: 0.3,
  tagRelevance: 0.1,
};

export class TemplateSelector {
  private weights: ScoreWeights;

  constructor(weights?: Partial<ScoreWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Select the best template based on requirements.
   * Returns the top match with reasoning.
   */
  async selectTemplate(
    templates: TemplateInfo[],
    requirements: TemplateRequirements
  ): Promise<TemplateMatch> {
    const ranked = await this.rankTemplates(templates, requirements);

    if (ranked.length === 0) {
      throw new Error('No templates match the requirements');
    }

    const best = ranked[0];
    const reasoning = this.buildReasoning(best, requirements);

    return {
      template: best.template,
      score: best.score,
      reasoning,
    };
  }

  /**
   * Rank templates by fit to requirements.
   * Returns templates sorted by score (highest first).
   */
  async rankTemplates(
    templates: TemplateInfo[],
    requirements: TemplateRequirements
  ): Promise<RankedTemplate[]> {
    const ranked: RankedTemplate[] = [];

    for (const template of templates) {
      // Platform must match
      if (template.platform.type !== requirements.platform) {
        continue;
      }

      const score = this.calculateScore(template, requirements);
      const matched = this.getMatchedCapabilities(template, requirements);
      const missing = this.getMissingCapabilities(template, requirements);

      ranked.push({
        template,
        score,
        matchedCapabilities: matched,
        missingCapabilities: missing,
      });
    }

    // Sort by score (descending)
    return ranked.sort((a, b) => b.score - a.score);
  }

  /**
   * Explain why a template was selected.
   */
  explainSelection(match: TemplateMatch): string {
    const lines = [
      `Selected Template: ${match.template.displayName}`,
      `Score: ${match.score.toFixed(2)}`,
      '',
      'Reasoning:',
      ...match.reasoning.map(r => `  - ${r}`),
    ];
    return lines.join('\n');
  }

  // Private helper methods

  private calculateScore(template: TemplateInfo, requirements: TemplateRequirements): number {
    let score = 0;

    // Capability coverage score
    if (requirements.requiredCapabilities) {
      const coverage = this.calculateCapabilityCoverage(template, requirements);
      score += coverage * this.weights.capabilityCoverage;
    }

    // Complexity match score
    if (requirements.complexity) {
      const complexityScore = this.calculateComplexityScore(template, requirements);
      score += complexityScore * this.weights.complexityMatch;
    }

    // Tag relevance score
    if (requirements.tags) {
      const tagScore = this.calculateTagScore(template, requirements);
      score += tagScore * this.weights.tagRelevance;
    }

    return score;
  }

  private calculateCapabilityCoverage(
    template: TemplateInfo,
    requirements: TemplateRequirements
  ): number {
    if (!requirements.requiredCapabilities || requirements.requiredCapabilities.length === 0) {
      return 1.0;
    }

    const matched = requirements.requiredCapabilities.filter(cap =>
      template.capabilities.includes(cap)
    );

    return matched.length / requirements.requiredCapabilities.length;
  }

  private calculateComplexityScore(
    template: TemplateInfo,
    requirements: TemplateRequirements
  ): number {
    if (!requirements.complexity) {
      return 1.0;
    }

    const complexityLevels = ['simple', 'moderate', 'advanced'];
    const requiredIndex = complexityLevels.indexOf(requirements.complexity);
    const templateIndex = complexityLevels.indexOf(template.complexity.level);

    // Perfect match gets 1.0, one level off gets 0.5, two levels off gets 0.0
    const diff = Math.abs(requiredIndex - templateIndex);
    return Math.max(0, 1.0 - diff * 0.5);
  }

  private calculateTagScore(template: TemplateInfo, requirements: TemplateRequirements): number {
    if (!requirements.tags || requirements.tags.length === 0) {
      return 1.0;
    }

    const matched = requirements.tags.filter(tag => template.tags.includes(tag));
    return matched.length / requirements.tags.length;
  }

  private getMatchedCapabilities(
    template: TemplateInfo,
    requirements: TemplateRequirements
  ): string[] {
    if (!requirements.requiredCapabilities) {
      return [];
    }

    return requirements.requiredCapabilities.filter(cap => template.capabilities.includes(cap));
  }

  private getMissingCapabilities(
    template: TemplateInfo,
    requirements: TemplateRequirements
  ): string[] {
    if (!requirements.requiredCapabilities) {
      return [];
    }

    return requirements.requiredCapabilities.filter(cap => !template.capabilities.includes(cap));
  }

  private buildReasoning(ranked: RankedTemplate, requirements: TemplateRequirements): string[] {
    const reasoning: string[] = [];

    // Platform match
    reasoning.push(
      `Platform match: ${ranked.template.platform.type} (required: ${requirements.platform})`
    );

    // Capability coverage
    if (requirements.requiredCapabilities && requirements.requiredCapabilities.length > 0) {
      const coverage =
        (ranked.matchedCapabilities.length / requirements.requiredCapabilities.length) * 100;
      reasoning.push(
        `Capability coverage: ${coverage.toFixed(0)}% (${ranked.matchedCapabilities.length}/${requirements.requiredCapabilities.length})`
      );

      if (ranked.matchedCapabilities.length > 0) {
        reasoning.push(`Matched capabilities: ${ranked.matchedCapabilities.join(', ')}`);
      }

      if (ranked.missingCapabilities.length > 0) {
        reasoning.push(
          `Missing capabilities: ${ranked.missingCapabilities.join(', ')} (can be added via extension points)`
        );
      }
    }

    // Complexity match
    reasoning.push(
      `Complexity: ${ranked.template.complexity.level}${
        requirements.complexity ? ` (requested: ${requirements.complexity})` : ''
      }`
    );

    // Use case
    reasoning.push(`Use case: ${ranked.template.useCase.primary}`);

    return reasoning;
  }
}
