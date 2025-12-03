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
import { TemplateComposer } from './TemplateComposer.js';

export class TemplateRegistry {
  private templatesPath: string;
  private validator: TemplateValidator;
  private composer: TemplateComposer;
  private cache: Map<string, TemplateMetadata> = new Map();
  private rawMetadataCache: Map<string, TemplateMetadata> = new Map();

  constructor(templatesPath?: string) {
    // Default to templates directory relative to package
    this.templatesPath = templatesPath || path.join(__dirname, '../../templates');
    this.validator = new TemplateValidator();
    this.composer = new TemplateComposer();
  }

  /**
   * Discover all available templates.
   * Returns lightweight TemplateInfo for browsing/filtering.
   * Hidden templates (e.g., test-only) are excluded by default.
   * Templates are resolved (inheritance applied) before extraction.
   * @param includeHidden - If true, includes hidden templates in results
   */
  async discoverTemplates(includeHidden = false): Promise<TemplateInfo[]> {
    const templatePaths = await this.findTemplateDirectories();
    const templates: TemplateInfo[] = [];

    for (const templatePath of templatePaths) {
      try {
        const rawMetadata = await this.loadTemplateMetadata(templatePath);
        // Skip hidden templates unless explicitly requested
        if (rawMetadata.hidden && !includeHidden) {
          continue;
        }
        // Resolve template to get merged metadata with inherited fields
        const resolvedMetadata = await this.getMetadata(rawMetadata.id);
        templates.push(this.extractTemplateInfo(resolvedMetadata));
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
   * If the template extends a base template, returns the merged result.
   */
  async getMetadata(templateId: string): Promise<TemplateMetadata> {
    // Check cache first
    if (this.cache.has(templateId)) {
      return this.cache.get(templateId)!;
    }

    // Resolve inheritance chain and merge
    const metadata = await this.resolveTemplate(templateId);
    this.cache.set(templateId, metadata);
    return metadata;
  }

  /**
   * Get raw template metadata without resolving inheritance.
   * Useful for inspecting template composition structure.
   */
  async getRawMetadata(templateId: string): Promise<TemplateMetadata> {
    if (this.rawMetadataCache.has(templateId)) {
      return this.rawMetadataCache.get(templateId)!;
    }

    const templatePath = await this.findTemplateById(templateId);
    if (!templatePath) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const metadata = await this.loadTemplateMetadata(templatePath);
    this.rawMetadataCache.set(templateId, metadata);
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
    this.rawMetadataCache.clear();
  }

  /**
   * Resolve a template's inheritance chain and return merged metadata.
   */
  private async resolveTemplate(templateId: string): Promise<TemplateMetadata> {
    const loadTemplate = (id: string): TemplateMetadata => {
      // Synchronous wrapper for composer - assumes templates are already loaded
      const cached = this.rawMetadataCache.get(id);
      if (cached) {
        return cached;
      }
      throw new Error(`Template ${id} not loaded in cache during resolution`);
    };

    // Pre-load the template and its parents into raw cache
    await this.preloadInheritanceChain(templateId);

    // Resolve using composer
    return this.composer.resolveInheritanceChain(templateId, loadTemplate);
  }

  /**
   * Pre-load a template and all its parents into the raw metadata cache.
   */
  private async preloadInheritanceChain(
    templateId: string,
    visited = new Set<string>()
  ): Promise<void> {
    if (visited.has(templateId)) {
      const chain = Array.from(visited).concat(templateId);
      throw new Error(`Circular dependency detected: ${chain.join(' → ')}`);
    }

    visited.add(templateId);

    // Load this template if not already cached
    if (!this.rawMetadataCache.has(templateId)) {
      const templatePath = await this.findTemplateById(templateId);
      if (!templatePath) {
        throw new Error(`Template not found: ${templateId}`);
      }
      const metadata = await this.loadTemplateMetadata(templatePath);
      this.rawMetadataCache.set(templateId, metadata);
    }

    const metadata = this.rawMetadataCache.get(templateId)!;

    // Recursively preload parent if it extends another template
    if (metadata.extends) {
      await this.preloadInheritanceChain(metadata.extends, visited);
    }
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
    // platform is optional if template extends a base template
    if (!metadata.id || !metadata.displayName || (!metadata.platform && !metadata.extends)) {
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
      tags: metadata.tags,
      version: metadata.version,
      useCase: metadata.useCase,
    };
  }
}
