/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import type {
  TemplateMetadata,
  TemplateVariable,
  ExtensionPoint,
  FileTransform,
  FileOperation,
  DocumentationLinks,
} from '../types/index.js';

/**
 * Handles template composition and inheritance.
 * Merges child templates with parent (base) templates according to defined merge semantics.
 */
export class TemplateComposer {
  /**
   * Merge a child template with its parent template.
   * Applies composition semantics defined in the documentation.
   */
  mergeTemplates(parent: TemplateMetadata, child: TemplateMetadata): TemplateMetadata {
    // Validate that we're not creating circular dependencies
    if (child.extends && child.extends === child.id) {
      throw new Error(`Template ${child.id} cannot extend itself`);
    }

    return {
      // Scalar fields: child overrides parent
      $schema: child.$schema,
      version: child.version,
      type: child.type,
      id: child.id,
      displayName: child.displayName,
      description: child.description,

      // extends is not propagated to merged result
      extends: undefined,

      // hidden: child can override
      hidden: child.hidden !== undefined ? child.hidden : parent.hidden,

      // platform: deep merge with child overriding specific keys
      platform: {
        ...parent.platform,
        ...child.platform,
      },

      // useCase: deep merge with special handling for scenarios
      useCase: {
        primary: child.useCase.primary,
        when: child.useCase.when,
        scenarios: [...(parent.useCase.scenarios || []), ...(child.useCase.scenarios || [])],
      },

      // capabilities: union of parent and child
      capabilities: this.mergeArrayUnique(parent.capabilities, child.capabilities),

      // tags: union of parent and child
      tags: this.mergeArrayUnique(parent.tags, child.tags),

      // templateVariables: merge by name with child overriding
      templateVariables: this.mergeVariables(parent.templateVariables, child.templateVariables),

      // extensionPoints: merge by id with child overriding
      extensionPoints: this.mergeExtensionPoints(
        parent.extensionPoints || [],
        child.extensionPoints || []
      ),

      // features: merge by id with child overriding
      features: this.mergeFeatures(parent.features || [], child.features || []),

      // generation: prepend child transforms/operations before parent's
      generation: {
        preHook: child.generation?.preHook || parent.generation?.preHook,
        postHook: child.generation?.postHook || parent.generation?.postHook,
        fileTransforms: this.mergeFileTransforms(
          parent.generation?.fileTransforms || [],
          child.generation?.fileTransforms || []
        ),
        fileOperations: this.mergeFileOperations(
          parent.generation?.fileOperations || [],
          child.generation?.fileOperations || []
        ),
      },

      // documentation: deep merge with child overriding specific keys
      documentation: this.mergeDocumentation(parent.documentation, child.documentation),
    };
  }

  /**
   * Resolve the full inheritance chain for a template.
   * Detects circular dependencies.
   */
  resolveInheritanceChain(
    templateId: string,
    loadTemplate: (id: string) => TemplateMetadata,
    visited = new Set<string>()
  ): TemplateMetadata {
    if (visited.has(templateId)) {
      const chain = Array.from(visited).concat(templateId);
      throw new Error(`Circular dependency detected: ${chain.join(' → ')}`);
    }

    visited.add(templateId);
    const template = loadTemplate(templateId);

    if (!template.extends) {
      return template;
    }

    // Recursively resolve parent
    const parent = this.resolveInheritanceChain(template.extends, loadTemplate, visited);

    // Merge current template with resolved parent
    return this.mergeTemplates(parent, template);
  }

  // Private merge helpers

  private mergeArrayUnique<T>(parent: T[], child: T[]): T[] {
    return Array.from(new Set([...parent, ...child]));
  }

  private mergeVariables(
    parent: TemplateVariable[],
    child: TemplateVariable[]
  ): TemplateVariable[] {
    const merged = new Map<string, TemplateVariable>();

    // Start with parent variables
    for (const v of parent) {
      merged.set(v.name, v);
    }

    // Child overrides or adds
    for (const v of child) {
      merged.set(v.name, v);
    }

    return Array.from(merged.values());
  }

  private mergeExtensionPoints(
    parent: ExtensionPoint[],
    child: ExtensionPoint[]
  ): ExtensionPoint[] {
    const merged = new Map<string, ExtensionPoint>();

    // Start with parent extension points
    for (const ep of parent) {
      merged.set(ep.id, ep);
    }

    // Child overrides or adds
    for (const ep of child) {
      merged.set(ep.id, ep);
    }

    return Array.from(merged.values());
  }

  private mergeFeatures(
    parent: Array<{
      id: string;
      name: string;
      description: string;
      files: string[];
      required: boolean;
    }>,
    child: Array<{
      id: string;
      name: string;
      description: string;
      files: string[];
      required: boolean;
    }>
  ): Array<{ id: string; name: string; description: string; files: string[]; required: boolean }> {
    const merged = new Map<string, (typeof parent)[0]>();

    // Start with parent features
    for (const f of parent) {
      merged.set(f.id, f);
    }

    // Child overrides or adds
    for (const f of child) {
      merged.set(f.id, f);
    }

    return Array.from(merged.values());
  }

  private mergeFileTransforms(parent: FileTransform[], child: FileTransform[]): FileTransform[] {
    // Child transforms are prepended (processed first)
    return [...child, ...parent];
  }

  private mergeFileOperations(parent: FileOperation[], child: FileOperation[]): FileOperation[] {
    // Child operations are prepended (processed first)
    return [...child, ...parent];
  }

  private mergeDocumentation(
    parent: DocumentationLinks | undefined,
    child: DocumentationLinks | undefined
  ): DocumentationLinks | undefined {
    if (!parent && !child) {
      return undefined;
    }

    if (!parent) {
      return child;
    }

    if (!child) {
      return parent;
    }

    return {
      readme: child.readme || parent.readme,
      architecture: child.architecture || parent.architecture,
      gettingStarted: child.gettingStarted || parent.gettingStarted,
      externalLinks: [...(parent.externalLinks || []), ...(child.externalLinks || [])],
    };
  }
}
