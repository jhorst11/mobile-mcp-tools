/**
 * Template layering management for Magen Template System.
 *
 * Handles:
 * - Creating layer patches from child templates
 * - Materializing templates with layers
 * - Applying patches in correct order
 */

import { existsSync, mkdirSync, cpSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { findTemplate } from './discovery.js';
import { applyPatch } from './git.js';
import type { TemplateDescriptor } from './schema.js';

/**
 * Options for creating a layer patch
 */
export interface CreateLayerOptions {
  /** Template name to create layer for */
  templateName: string;
  /** Path to template directory */
  templateDirectory: string;
  /** Optional parent template name (if not specified in template.json) */
  parentTemplateName?: string;
}

/**
 * Result of layer creation
 */
export interface CreateLayerResult {
  /** Path to the generated patch file */
  patchPath: string;
  /** Parent template name */
  parentTemplate: string;
  /** Child template name */
  childTemplate: string;
}

/**
 * Options for materializing a template with layers
 */
export interface MaterializeOptions {
  /** Template to materialize */
  template: TemplateDescriptor;
  /** Target directory for materialized template */
  targetDirectory: string;
  /** Template directory (for resolving patches) */
  templateDirectory: string;
}

/**
 * Create a layer patch from a child template by comparing it to its parent.
 *
 * This uses git diff to create a patch file representing the differences
 * between the parent template and the child template.
 */
export function createLayer(options: CreateLayerOptions): CreateLayerResult {
  const { templateName, templateDirectory, parentTemplateName } = options;

  // Load child template descriptor
  const templateJsonPath = join(templateDirectory, 'template.json');

  if (!existsSync(templateJsonPath)) {
    throw new Error(`Template descriptor not found at ${templateJsonPath}`);
  }

  const childTemplate: TemplateDescriptor = JSON.parse(readFileSync(templateJsonPath, 'utf-8'));

  // Determine parent template
  const parentName = parentTemplateName || childTemplate.basedOn;
  if (!parentName) {
    throw new Error(`No parent template specified. Use --based-on or set basedOn in template.json`);
  }

  // Load parent template
  const parentTemplateInfo = findTemplate(parentName);
  if (!parentTemplateInfo) {
    throw new Error(`Parent template not found: ${parentName}`);
  }

  // Create temp directory for git repo
  const tempDir = join(tmpdir(), `magen-layer-${Date.now()}`);

  try {
    // We need a git repo for proper patch creation including new files
    const gitRepoDir = join(tempDir, 'repo');
    mkdirSync(gitRepoDir, { recursive: true });

    // Initialize git repository
    execSync('git init', { cwd: gitRepoDir, stdio: 'pipe' });
    execSync('git config user.email "magen@salesforce.com"', { cwd: gitRepoDir, stdio: 'pipe' });
    execSync('git config user.name "Magen Template System"', { cwd: gitRepoDir, stdio: 'pipe' });

    // Copy parent template files to repo
    // For base templates, use template/ directory
    // For layered templates, we need to materialize them first
    let parentSourceDir = join(parentTemplateInfo.templatePath, 'template');

    if (!existsSync(parentSourceDir)) {
      // Parent is a layered template - materialize it
      const tempParentDir = join(tmpdir(), `magen-parent-${Date.now()}`);
      try {
        materializeTemplate({
          template: parentTemplateInfo.descriptor,
          targetDirectory: tempParentDir,
          templateDirectory: parentTemplateInfo.templatePath,
        });
        parentSourceDir = tempParentDir;
      } catch (error) {
        // Clean up temp directory
        if (existsSync(tempParentDir)) {
          rmSync(tempParentDir, { recursive: true, force: true });
        }
        throw error;
      }
    }

    cpSync(parentSourceDir, gitRepoDir, { recursive: true });

    // Also copy parent's variables.json if it exists (for base templates)
    const parentVariablesPath = join(parentTemplateInfo.templatePath, 'variables.json');
    if (existsSync(parentVariablesPath)) {
      cpSync(parentVariablesPath, join(gitRepoDir, 'variables.json'));
    }

    // Commit parent as base
    execSync('git add -A', { cwd: gitRepoDir, stdio: 'pipe' });
    execSync('git commit -m "Base template"', { cwd: gitRepoDir, stdio: 'pipe' });

    // Copy child work directory files over (replacing/adding)
    // For layered templates, changes are made in work/ not template/
    const childSourceDir = join(templateDirectory, 'work');
    if (!existsSync(childSourceDir)) {
      throw new Error(
        `Work directory not found at ${childSourceDir}. ` +
          `For layered templates, edit files in work/ directory, not template/.`
      );
    }

    // Remove all files from git repo first (except .git)
    // This ensures deletions are properly detected
    execSync('find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +', {
      cwd: gitRepoDir,
      stdio: 'pipe',
      shell: '/bin/bash',
    });

    // Now copy child work directory
    cpSync(childSourceDir, gitRepoDir, { recursive: true });

    // Stage all changes (including new files)
    execSync('git add -A', { cwd: gitRepoDir, stdio: 'pipe' });

    // Create patch file from staged changes
    const patchPath = join(templateDirectory, 'layer.patch');
    const patch = execSync('git diff --cached', { cwd: gitRepoDir, encoding: 'utf-8' });
    writeFileSync(patchPath, patch, 'utf-8');

    return {
      patchPath,
      parentTemplate: parentName,
      childTemplate: templateName,
    };
  } finally {
    // Clean up temp directories
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Materialize a template by applying all layers in the chain.
 *
 * For a template with basedOn, this:
 * 1. Recursively materializes the parent template
 * 2. Applies the layer patch on top
 */
export function materializeTemplate(options: MaterializeOptions): void {
  const { template, targetDirectory, templateDirectory } = options;

  // Base case: no parent, just copy template files
  if (!template.basedOn) {
    const templateSourceDir = join(templateDirectory, 'template');
    if (!existsSync(templateSourceDir)) {
      throw new Error(`Template files not found at ${templateSourceDir}`);
    }

    // Ensure target directory exists
    mkdirSync(targetDirectory, { recursive: true });

    // Copy template files
    cpSync(templateSourceDir, targetDirectory, { recursive: true });

    // Also copy variables.json if it exists (for base templates)
    const variablesPath = join(templateDirectory, 'variables.json');
    if (existsSync(variablesPath)) {
      cpSync(variablesPath, join(targetDirectory, 'variables.json'));
    }

    return;
  }

  // Recursive case: materialize parent first
  const parentTemplateInfo = findTemplate(template.basedOn);
  if (!parentTemplateInfo) {
    throw new Error(`Parent template not found: ${template.basedOn}`);
  }

  // Materialize parent template to target directory
  materializeTemplate({
    template: parentTemplateInfo.descriptor,
    targetDirectory,
    templateDirectory: parentTemplateInfo.templatePath,
  });

  // Apply this layer's patch on top
  if (template.layer?.patchFile) {
    const patchPath = join(templateDirectory, template.layer.patchFile);
    if (!existsSync(patchPath)) {
      throw new Error(`Layer patch file not found at ${patchPath}`);
    }

    // Initialize git in target directory for patch application
    try {
      execSync('git init', { cwd: targetDirectory, stdio: 'pipe' });
      execSync('git config user.email "magen@salesforce.com"', {
        cwd: targetDirectory,
        stdio: 'pipe',
      });
      execSync('git config user.name "Magen Template System"', {
        cwd: targetDirectory,
        stdio: 'pipe',
      });
      execSync('git add -A', { cwd: targetDirectory, stdio: 'pipe' });
      execSync('git commit -m "Base"', { cwd: targetDirectory, stdio: 'pipe' });

      // Apply patch
      applyPatch(targetDirectory, patchPath);

      // Clean up git directory
      const gitDir = join(targetDirectory, '.git');
      if (existsSync(gitDir)) {
        rmSync(gitDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Clean up git directory even on error
      const gitDir = join(targetDirectory, '.git');
      if (existsSync(gitDir)) {
        rmSync(gitDir, { recursive: true, force: true });
      }
      throw error;
    }
  }
}

/**
 * Detect cycles in template chain to prevent infinite loops
 */
export function detectCycle(templateName: string, visited: Set<string> = new Set()): boolean {
  if (visited.has(templateName)) {
    return true; // Cycle detected
  }

  visited.add(templateName);

  try {
    const templateInfo = findTemplate(templateName);
    if (!templateInfo) {
      return false; // Template not found - not a cycle, just invalid reference
    }

    if (templateInfo.descriptor.basedOn) {
      return detectCycle(templateInfo.descriptor.basedOn, visited);
    }
  } catch (_error) {
    // Template not found - not a cycle, just invalid reference
    return false;
  }

  return false; // No cycle
}
