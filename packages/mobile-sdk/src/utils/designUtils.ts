/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';

/**
 * Design document discovery and validation utilities
 */
export class DesignUtils {
  /**
   * Common design document names to look for
   */
  private static DESIGN_DOC_NAMES = [
    'DESIGN_DOCUMENT.md',
    'PROJECT_REQUIREMENTS.md',
    'DESIGN.md',
    'PRD.md',
    'REQUIREMENTS.md',
  ];

  /**
   * Discover design documents in a project directory
   */
  static findDesignDocument(projectPath: string): {
    found: boolean;
    path?: string;
    name?: string;
    content?: string;
  } {
    try {
      // Check project root first
      for (const docName of this.DESIGN_DOC_NAMES) {
        const designPath = join(projectPath, docName);
        if (existsSync(designPath)) {
          return {
            found: true,
            path: designPath,
            name: docName,
            content: readFileSync(designPath, 'utf8'),
          };
        }
      }

      // Check parent directory for temp PRD files (from create-project)
      const parentDir = dirname(projectPath);
      const projectName = basename(projectPath);

      for (const docName of this.DESIGN_DOC_NAMES) {
        const tempPrdPath = join(parentDir, `${projectName}_${docName}`);
        if (existsSync(tempPrdPath)) {
          return {
            found: true,
            path: tempPrdPath,
            name: `${projectName}_${docName}`,
            content: readFileSync(tempPrdPath, 'utf8'),
          };
        }
      }

      return { found: false };
    } catch (error) {
      console.warn('Error finding design document:', error);
      return { found: false };
    }
  }

  /**
   * Extract key guidance from design document
   */
  static extractKeyGuidance(designContent: string): {
    architecturePattern?: string;
    keyRequirements: string[];
    implementationPhases: string[];
    toolWorkflow: string[];
    pitfalls: string[];
  } {
    const guidance = {
      keyRequirements: [] as string[],
      implementationPhases: [] as string[],
      toolWorkflow: [] as string[],
      pitfalls: [] as string[],
    };

    try {
      // Extract architecture pattern
      const archMatch = designContent.match(/\*\*Architecture Pattern\*\*:\s*([^\n]+)/i);
      const architecturePattern = archMatch?.[1]?.trim();

      // Extract requirements from functional requirements section
      const reqSection = designContent.match(
        /##\s*🎯\s*\*\*FUNCTIONAL REQUIREMENTS\*\*([\s\S]*?)(?=##|\n---|\n\*|$)/i
      );
      if (reqSection) {
        const requirements = reqSection[1].match(/- \*\*([^*]+)\*\*/g);
        if (requirements) {
          guidance.keyRequirements = requirements.map(req =>
            req.replace(/- \*\*([^*]+)\*\*/, '$1')
          );
        }
      }

      // Extract implementation phases
      const phaseMatches = designContent.match(/###\s*\*\*Phase\s+\d+[^*]*\*\*/gi);
      if (phaseMatches) {
        guidance.implementationPhases = phaseMatches.map(phase =>
          phase.replace(/###\s*\*\*([^*]+)\*\*/, '$1')
        );
      }

      // Extract tool workflow
      const toolSection = designContent.match(
        /##\s*🛠️\s*\*\*DEVELOPMENT TOOLS[^#]*?###\s*\*\*Key Commands\*\*([\s\S]*?)(?=##|\n---|\n\*|$)/i
      );
      if (toolSection) {
        const commands = toolSection[1].match(/# [^\n]+/g);
        if (commands) {
          guidance.toolWorkflow = commands.map(cmd => cmd.replace(/# /, ''));
        }
      }

      // Extract common pitfalls
      const pitfallSection = designContent.match(/pitfall|mistake|don't|avoid/gi);
      if (pitfallSection) {
        const pitfallLines = designContent
          .split('\n')
          .filter(
            line => /pitfall|mistake|don't|avoid|❌|⚠️/i.test(line) && line.trim().length > 10
          );
        guidance.pitfalls = pitfallLines.slice(0, 5).map(line => line.trim());
      }

      return { architecturePattern, ...guidance };
    } catch (error) {
      console.warn('Error extracting guidance from design document:', error);
      return guidance;
    }
  }

  /**
   * Generate design compliance reminder for tool outputs
   */
  static generateDesignReminder(projectPath: string): string {
    const designDoc = this.findDesignDocument(projectPath);

    if (!designDoc.found) {
      return `
## 📋 **DESIGN DOCUMENT RECOMMENDATION**

No design document found in this project. Consider creating one using the \`plan-design\` tool to ensure consistent development approach and architectural decisions.
`;
    }

    const guidance = designDoc.content ? this.extractKeyGuidance(designDoc.content) : null;

    return `
## 📋 **DESIGN DOCUMENT REFERENCE**

✅ **Design document found:** \`${designDoc.path}\`

**🎯 Before proceeding, ensure your implementation follows:**
${guidance?.architecturePattern ? `- **Architecture Pattern:** ${guidance.architecturePattern}` : ''}
${guidance?.keyRequirements.length ? `- **Key Requirements:** ${guidance.keyRequirements.slice(0, 3).join(', ')}${guidance.keyRequirements.length > 3 ? '...' : ''}` : ''}
${guidance?.implementationPhases.length ? `- **Current Phase:** Check which phase you're in according to the design roadmap` : ''}

**💡 IMPORTANT:** Reference \`${designDoc.name}\` throughout development to maintain consistency with the original design vision and requirements.
`;
  }

  /**
   * Check if implementation aligns with design document phase
   */
  static checkPhaseAlignment(
    projectPath: string,
    currentActivity: string
  ): {
    aligned: boolean;
    currentPhase?: string;
    recommendation?: string;
  } {
    const designDoc = this.findDesignDocument(projectPath);

    if (!designDoc.found || !designDoc.content) {
      return { aligned: true }; // No design doc to check against
    }

    const guidance = this.extractKeyGuidance(designDoc.content);

    // Simple phase detection based on activity keywords
    const activityPhaseMap: Record<string, number> = {
      authentication: 1,
      scaffold: 1,
      oauth: 1,
      sync: 2,
      data: 2,
      offline: 2,
      ui: 3,
      interface: 3,
      view: 3,
      notification: 4,
      analytics: 4,
      advanced: 4,
      test: 5,
      deploy: 5,
      build: 5,
    };

    const detectedPhase = Object.entries(activityPhaseMap).find(([keyword]) =>
      currentActivity.toLowerCase().includes(keyword)
    )?.[1];

    if (detectedPhase && guidance.implementationPhases.length >= detectedPhase) {
      return {
        aligned: true,
        currentPhase: guidance.implementationPhases[detectedPhase - 1],
        recommendation: `You appear to be working on ${guidance.implementationPhases[detectedPhase - 1]}. Ensure you've completed the previous phase requirements.`,
      };
    }

    return { aligned: true };
  }

  /**
   * Extract next steps from design document
   */
  static extractNextSteps(projectPath: string): string[] {
    const designDoc = this.findDesignDocument(projectPath);

    if (!designDoc.found || !designDoc.content) {
      return [];
    }

    try {
      const nextStepsSection = designDoc.content.match(
        /##\s*🎯\s*\*\*NEXT STEPS\*\*([\s\S]*?)(?=##|\n---|\n\*\*|$)/i
      );
      if (nextStepsSection) {
        const steps = nextStepsSection[1].match(/\d+\.\s*[^\n]+/g);
        if (steps) {
          return steps.map(step => step.trim());
        }
      }

      // Fallback to immediate actions
      const immediateSection = designDoc.content.match(
        /###\s*\*\*Immediate Actions\*\*([\s\S]*?)(?=###|\n---|\n\*\*|$)/i
      );
      if (immediateSection) {
        const actions = immediateSection[1].match(/\d+\.\s*[^\n]+/g);
        if (actions) {
          return actions.map(action => action.trim());
        }
      }

      return [];
    } catch (error) {
      console.warn('Error extracting next steps:', error);
      return [];
    }
  }
}
