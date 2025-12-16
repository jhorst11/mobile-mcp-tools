/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../../add-feature-metadata.js';
import { findTemplate } from '@salesforce/magen-templates';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Inspects the layer.patch file from the selected feature template
 * to understand what changes need to be made to integrate the feature
 */
export class PatchInspectionNode extends BaseNode<AddFeatureState> {
  protected readonly logger: Logger;

  constructor(logger?: Logger) {
    super('inspectPatch');
    this.logger = logger ?? createComponentLogger('PatchInspectionNode');
  }

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    if (!state.selectedFeatureTemplate) {
      return {
        workflowFatalErrorMessages: ['No feature template selected for patch inspection'],
      };
    }

    try {
      // Find the template using magen-templates
      const templateInfo = findTemplate(state.selectedFeatureTemplate);
      if (!templateInfo) {
        return {
          workflowFatalErrorMessages: [
            `Feature template not found: ${state.selectedFeatureTemplate}`,
          ],
        };
      }

      const templateDescriptor = templateInfo.descriptor;
      const templatePath = templateInfo.templatePath;

      // Get the patch file name from the template descriptor
      const patchFile =
        templateDescriptor.extends?.patchFile ||
        templateDescriptor.layer?.patchFile ||
        'layer.patch';

      const patchPath = join(templatePath, patchFile);

      // Check if patch file exists
      if (!existsSync(patchPath)) {
        return {
          workflowFatalErrorMessages: [
            `Patch file not found for feature template ${state.selectedFeatureTemplate} at ${patchPath}`,
          ],
        };
      }

      // Read the patch content
      const patchContent = readFileSync(patchPath, 'utf-8');

      if (!patchContent || patchContent.trim().length === 0) {
        return {
          workflowFatalErrorMessages: [
            `Patch file for feature template ${state.selectedFeatureTemplate} is empty`,
          ],
        };
      }

      this.logger.info(`Successfully read patch file for ${state.selectedFeatureTemplate}`, {
        patchPath,
        patchSize: patchContent.length,
      });

      // Analyze the patch to provide context for feature integration
      const patchAnalysis = this.analyzePatch(patchContent, templateDescriptor.name);

      return {
        patchContent,
        patchAnalysis,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      const errorObj = error instanceof Error ? error : new Error(errorMessage);
      this.logger.error('Failed to inspect patch file', errorObj);
      return {
        workflowFatalErrorMessages: [`Failed to inspect patch file: ${errorMessage}`],
      };
    }
  };

  /**
   * Analyzes a patch file to extract key information about what changes it makes
   * This provides context that can help guide the LLM in applying similar changes
   * to the target project
   */
  private analyzePatch(patchContent: string, templateName: string): string {
    const lines = patchContent.split('\n');
    const filesModified = new Set<string>();
    const filesAdded = new Set<string>();
    const filesDeleted = new Set<string>();

    // Parse the patch to identify files being changed
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for file headers in unified diff format
      if (line.startsWith('diff --git')) {
        // Extract filename from "diff --git a/path b/path"
        const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
        if (match) {
          const filename = match[1];
          filesModified.add(filename);
        }
      } else if (line.startsWith('--- ')) {
        // Previous file version (deletions)
        const match = line.match(/^--- a\/(.+)$/);
        if (match && match[1] !== '/dev/null') {
          // If it's /dev/null, it means file is being added
        }
      } else if (line.startsWith('+++ ')) {
        // New file version (additions)
        const match = line.match(/^\+\+\+ b\/(.+)$/);
        if (match) {
          const filename = match[1];
          if (match[1] !== '/dev/null') {
            // Check if previous line was /dev/null (new file)
            if (i > 0 && lines[i - 1].includes('/dev/null')) {
              filesAdded.add(filename);
            }
          } else {
            // File being deleted
            if (i > 0) {
              const prevMatch = lines[i - 1].match(/^--- a\/(.+)$/);
              if (prevMatch && prevMatch[1] !== '/dev/null') {
                filesDeleted.add(prevMatch[1]);
              }
            }
          }
        }
      }
    }

    // Build analysis summary
    let analysis = `Feature Template: ${templateName}\n\n`;
    analysis += `Patch Analysis:\n`;
    analysis += `- Total patch size: ${lines.length} lines\n`;

    if (filesAdded.size > 0) {
      analysis += `\nFiles to be added (${filesAdded.size}):\n`;
      filesAdded.forEach(file => {
        analysis += `  + ${file}\n`;
      });
    }

    if (filesModified.size > 0) {
      const modifiedOnly = Array.from(filesModified).filter(
        f => !filesAdded.has(f) && !filesDeleted.has(f)
      );
      if (modifiedOnly.length > 0) {
        analysis += `\nFiles to be modified (${modifiedOnly.length}):\n`;
        modifiedOnly.forEach(file => {
          analysis += `  ~ ${file}\n`;
        });
      }
    }

    if (filesDeleted.size > 0) {
      analysis += `\nFiles to be deleted (${filesDeleted.size}):\n`;
      filesDeleted.forEach(file => {
        analysis += `  - ${file}\n`;
      });
    }

    analysis += `\nThis patch represents the minimal diff needed to add the feature to a base project.\n`;
    analysis += `The patch can be used as a guide to understand what changes need to be applied to the existing project.\n`;

    return analysis;
  }
}
