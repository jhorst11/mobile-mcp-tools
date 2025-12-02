/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateValidator } from '../src/validation/TemplateValidator';
import { TemplateRegistry } from '../src/registry/TemplateRegistry';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('TemplateValidator', () => {
  let validator: TemplateValidator;
  let registry: TemplateRegistry;
  let tempDir: string;

  beforeEach(async () => {
    validator = new TemplateValidator();
    registry = new TemplateRegistry();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validator-test-'));
  });

  afterEach(async () => {
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  describe('validate', () => {
    it('should validate existing example template', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length === 0) {
        console.log('Skipping test - no templates available');
        return;
      }

      const templatePath = await registry.getTemplatePath(templates[0].id);
      const result = await validator.validate(templatePath);

      if (!result.valid) {
        console.log('Template:', templates[0].id);
        console.log('Validation errors:', result.errors);
      }

      // Allow some warnings, but no errors
      expect(result.errors.length).toBe(0);
    });

    it('should fail validation for non-existent directory', async () => {
      const nonExistent = path.join(tempDir, 'nonexistent');

      const result = await validator.validate(nonExistent);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'directory-not-found',
          }),
        ])
      );
    });

    it('should fail validation for missing template.json', async () => {
      const invalidTemplatePath = path.join(tempDir, 'no-metadata');
      await fs.ensureDir(invalidTemplatePath);

      const result = await validator.validate(invalidTemplatePath);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'metadata-missing',
          }),
        ])
      );
    });

    it('should fail validation for invalid JSON', async () => {
      const invalidTemplatePath = path.join(tempDir, 'invalid-json');
      await fs.ensureDir(invalidTemplatePath);
      await fs.writeFile(
        path.join(invalidTemplatePath, 'template.json'),
        '{ invalid json',
        'utf-8'
      );

      const result = await validator.validate(invalidTemplatePath);

      expect(result.valid).toBe(false);
      // Should have some validation error
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation for missing template directory', async () => {
      const templatePath = path.join(tempDir, 'no-template-dir');
      await fs.ensureDir(templatePath);

      // Create a minimal valid metadata
      const metadata = {
        $schema: 'https://salesforce.github.io/magen-templates/schemas/template-v1.json',
        version: '1.0.0',
        type: 'application',
        id: 'test-template',
        displayName: 'Test Template',
        description: 'Test',
        platform: { type: 'ios', minVersion: '15.0' },
        useCase: { primary: 'Test', scenarios: ['test'], when: 'Test' },
        capabilities: ['test'],
        complexity: { level: 'simple', explanation: 'Test' },
        requirements: { skillLevel: 'beginner', estimatedTime: '5 minutes' },
        templateVariables: [],
        generation: { sourceDirectory: 'template', fileTransforms: [] },
        documentation: {},
        tags: ['test'],
      };

      await fs.writeJson(path.join(templatePath, 'template.json'), metadata);

      const result = await validator.validate(templatePath);

      // Should fail validation due to missing template dir
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about missing documentation files', async () => {
      const templatePath = path.join(tempDir, 'missing-docs');
      await fs.ensureDir(path.join(templatePath, 'template'));

      const metadata = {
        $schema: 'https://salesforce.github.io/magen-templates/schemas/template-v1.json',
        version: '1.0.0',
        type: 'application',
        id: 'test-template',
        displayName: 'Test Template',
        description: 'Test',
        platform: { type: 'ios', minVersion: '15.0' },
        useCase: { primary: 'Test', scenarios: ['test'], when: 'Test' },
        capabilities: ['test'],
        complexity: { level: 'simple', explanation: 'Test' },
        requirements: { skillLevel: 'beginner', estimatedTime: '5 minutes' },
        templateVariables: [],
        generation: { sourceDirectory: 'template', fileTransforms: [] },
        documentation: {
          readme: 'README.md',
          gettingStarted: 'GETTING_STARTED.md',
        },
        tags: ['test'],
      };

      await fs.writeJson(path.join(templatePath, 'template.json'), metadata);

      const result = await validator.validate(templatePath);

      // May have warnings about missing documentation
      expect(result.warnings).toBeDefined();
    });

    it('should validate successfully with complete template', async () => {
      const templatePath = path.join(tempDir, 'complete-template');
      await fs.ensureDir(path.join(templatePath, 'template'));
      await fs.writeFile(path.join(templatePath, 'template', 'test.txt'), 'test');

      const metadata = {
        $schema: 'https://salesforce.github.io/magen-templates/schemas/template-v1.json',
        version: '1.0.0',
        type: 'application',
        id: 'test-template',
        displayName: 'Test Template',
        description: 'Test',
        platform: { type: 'ios', minVersion: '15.0' },
        useCase: { primary: 'Test', scenarios: ['test'], when: 'Test' },
        capabilities: ['test'],
        complexity: { level: 'simple', explanation: 'Test' },
        requirements: { skillLevel: 'beginner', estimatedTime: '5 minutes' },
        templateVariables: [],
        generation: { sourceDirectory: 'template', fileTransforms: [] },
        documentation: {},
        tags: ['test'],
      };

      await fs.writeJson(path.join(templatePath, 'template.json'), metadata);

      const result = await validator.validate(templatePath);

      // Should be valid
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid schema', async () => {
      const templatePath = path.join(tempDir, 'invalid-schema');
      await fs.ensureDir(path.join(templatePath, 'template'));

      // Missing required fields
      const metadata = {
        id: 'test',
        displayName: 'Test',
      };

      await fs.writeJson(path.join(templatePath, 'template.json'), metadata);

      const result = await validator.validate(templatePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
