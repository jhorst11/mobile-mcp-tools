/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import type { TemplateInfo, TemplateMetadata, Platform, ValidationResult } from '../types/index.js';
import { TemplateValidator } from '../validation/TemplateValidator.js';

export class TemplateRegistry {
  private templatesPath: string;
  private validator: TemplateValidator;
  private cache: Map<string, TemplateMetadata> = new Map();

  constructor(templatesPath?: string) {
    // Default to templates directory relative to package
    this.templatesPath = templatesPath || path.join(__dirname, '../../templates');
    this.validator = new TemplateValidator();
  }

  /**
   * Discover all available templates.
   * Returns lightweight TemplateInfo for browsing/filtering.
   * Hidden templates (e.g., test-only) are excluded by default.
   * @param includeHidden - If true, includes hidden templates in results
   */
  async discoverTemplates(includeHidden = false): Promise<TemplateInfo[]> {
    const templatePaths = await this.findTemplateDirectories();
    const templates: TemplateInfo[] = [];

    for (const templatePath of templatePaths) {
      try {
        const metadata = await this.loadTemplateMetadata(templatePath);
        // Skip hidden templates unless explicitly requested
        if (metadata.hidden && !includeHidden) {
          continue;
        }
        templates.push(this.extractTemplateInfo(metadata));
      } catch (error) {
        console.warn(
          `Failed to load template at ${templatePath}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return templates;
  }

  /**
   * Get complete template metadata by ID.
   * Returns full TemplateMetadata including extension points, requirements, etc.
   */
  async getMetadata(templateId: string): Promise<TemplateMetadata> {
    // Check cache first
    if (this.cache.has(templateId)) {
      return this.cache.get(templateId)!;
    }

    const templatePath = await this.findTemplateById(templateId);
    if (!templatePath) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const metadata = await this.loadTemplateMetadata(templatePath);
    this.cache.set(templateId, metadata);
    return metadata;
  }

  /**
   * Search templates by capabilities.
   * Returns lightweight TemplateInfo for matching templates.
   */
  async searchByCapabilities(capabilities: string[]): Promise<TemplateInfo[]> {
    const allTemplates = await this.discoverTemplates();
    return allTemplates.filter(template =>
      capabilities.some(cap => template.capabilities.includes(cap))
    );
  }

  /**
   * Search templates by platform.
   * Returns lightweight TemplateInfo for the specified platform.
   */
  async searchByPlatform(platform: Platform): Promise<TemplateInfo[]> {
    const allTemplates = await this.discoverTemplates();
    return allTemplates.filter(template => template.platform.type === platform);
  }

  /**
   * Search templates by tags.
   */
  async searchByTags(tags: string[]): Promise<TemplateInfo[]> {
    const allTemplates = await this.discoverTemplates();
    return allTemplates.filter(template => tags.some(tag => template.tags.includes(tag)));
  }

  /**
   * Validate template structure and metadata.
   */
  async validateTemplate(templateId: string): Promise<ValidationResult> {
    const templatePath = await this.findTemplateById(templateId);
    if (!templatePath) {
      return {
        valid: false,
        errors: [
          {
            type: 'not-found',
            message: `Template not found: ${templateId}`,
          },
        ],
        warnings: [],
      };
    }

    return this.validator.validate(templatePath);
  }

  /**
   * Get the file system path for a template
   */
  async getTemplatePath(templateId: string): Promise<string> {
    const templatePath = await this.findTemplateById(templateId);
    if (!templatePath) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return templatePath;
  }

  /**
   * Clear the metadata cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private helper methods

  private async findTemplateDirectories(): Promise<string[]> {
    const pattern = path.join(this.templatesPath, '*/template.json');
    const files = await glob(pattern);
    return files.map(file => path.dirname(file));
  }

  private async findTemplateById(templateId: string): Promise<string | null> {
    const templatePaths = await this.findTemplateDirectories();
    for (const templatePath of templatePaths) {
      const metadata = await this.loadTemplateMetadata(templatePath);
      if (metadata.id === templateId) {
        return templatePath;
      }
    }
    return null;
  }

  private async loadTemplateMetadata(templatePath: string): Promise<TemplateMetadata> {
    const metadataPath = path.join(templatePath, 'template.json');
    if (!(await fs.pathExists(metadataPath))) {
      throw new Error(`Template metadata not found at ${metadataPath}`);
    }

    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content) as TemplateMetadata;

    // Validate basic structure
    if (!metadata.id || !metadata.displayName || !metadata.platform) {
      throw new Error(`Invalid template metadata at ${metadataPath}`);
    }

    return metadata;
  }

  private extractTemplateInfo(metadata: TemplateMetadata): TemplateInfo {
    return {
      id: metadata.id,
      displayName: metadata.displayName,
      description: metadata.description,
      platform: metadata.platform,
      capabilities: metadata.capabilities,
      complexity: metadata.complexity,
      tags: metadata.tags,
      version: metadata.version,
      useCase: metadata.useCase,
    };
  }
}
