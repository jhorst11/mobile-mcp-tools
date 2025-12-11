/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  searchTemplates,
  getTemplateInfo,
  findSimilarTemplates,
  apiValidateTemplateVariables,
  generate,
  createTemplateNotFoundError,
  createMissingVariablesError,
} from '../src/api/index.js';

describe('API Layer', () => {
  const testDir = join(process.cwd(), 'test-output', 'api');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('searchTemplates', () => {
    it('should search templates by platform', () => {
      const result = searchTemplates({ platform: 'ios' });
      expect(result.total).toBeGreaterThan(0);
      expect(result.templates.every(t => t.platform === 'ios')).toBe(true);
    });

    it('should search templates by tags (AND logic)', () => {
      const result = searchTemplates({ tags: ['ios', 'mobile-sdk'] });
      expect(result.total).toBeGreaterThan(0);
      result.templates.forEach(t => {
        expect(t.tags).toBeDefined();
        expect(t.tags!.includes('ios')).toBe(true);
        expect(t.tags!.includes('mobile-sdk')).toBe(true);
      });
    });

    it('should search templates by query', () => {
      const result = searchTemplates({ query: 'salesforce' });
      expect(result.total).toBeGreaterThan(0);
      expect(result.query).toBe('salesforce');
    });

    it('should search templates by name substring', () => {
      const result = searchTemplates({ name: 'base' });
      expect(result.total).toBeGreaterThan(0);
      expect(result.templates.some(t => t.name.includes('base'))).toBe(true);
    });
  });

  describe('getTemplateInfo', () => {
    it('should get detailed info for a template', () => {
      const info = getTemplateInfo('ios-base');
      expect(info).toBeDefined();
      expect(info!.descriptor.name).toBe('ios-base');
      expect(info!.inheritanceChain).toBeDefined();
      expect(info!.totalVariables).toBeGreaterThan(0);
      expect(info!.hasParent).toBe(false);
      expect(info!.isLayered).toBe(false);
    });

    it('should identify all required variables without defaults', () => {
      const info = getTemplateInfo('ios-mobilesdk');
      expect(info).toBeDefined();

      // ios-mobilesdk has required vars without defaults
      const varsWithoutDefaults = info!.descriptor.variables.filter(
        v => v.required && v.default === undefined
      );

      expect(varsWithoutDefaults.length).toBeGreaterThan(0);
      expect(varsWithoutDefaults.some(v => v.name === 'salesforceConsumerKey')).toBe(true);
      expect(varsWithoutDefaults.some(v => v.name === 'salesforceCallbackUrl')).toBe(true);
    });

    it('should show inheritance chain for layered templates', () => {
      const info = getTemplateInfo('ios-mobilesdk-login');
      expect(info).toBeDefined();
      expect(info!.inheritanceChain.length).toBeGreaterThan(1);
      expect(info!.inheritanceChain[0]).toContain('ios-mobilesdk-login');
      expect(info!.hasParent).toBe(true);
      expect(info!.isLayered).toBe(true);
    });

    it('should categorize variables', () => {
      const info = getTemplateInfo('ios-mobilesdk');
      expect(info).toBeDefined();
      expect(info!.requiredVariables).toBeDefined();
      expect(info!.optionalVariables).toBeDefined();
      expect(info!.totalVariables).toBe(
        info!.requiredVariables.length + info!.optionalVariables.length
      );
    });

    it('should return null for non-existent template', () => {
      const info = getTemplateInfo('non-existent-template');
      expect(info).toBeNull();
    });
  });

  describe('findSimilarTemplates', () => {
    it('should find similar template names', () => {
      const similar = findSimilarTemplates('ios-bas');
      expect(similar).toBeDefined();
      expect(similar.length).toBeGreaterThan(0);
      expect(similar).toContain('ios-base');
    });

    it('should limit results', () => {
      const similar = findSimilarTemplates('ios', 2);
      expect(similar.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for very dissimilar names', () => {
      const similar = findSimilarTemplates('zzzzzzz');
      expect(similar).toEqual([]);
    });

    it('should handle exact prefix match', () => {
      const similar = findSimilarTemplates('ios-mobile');
      expect(similar).toContain('ios-mobilesdk');
    });
  });

  describe('apiValidateTemplateVariables', () => {
    it('should validate with defaults applied', () => {
      const result = apiValidateTemplateVariables('ios-base', {});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate required variables without defaults', () => {
      const result = apiValidateTemplateVariables('ios-mobilesdk', {});
      expect(result.valid).toBe(false);
      expect(result.missingRequired.length).toBeGreaterThan(0);
    });

    it('should accept provided variables', () => {
      const result = apiValidateTemplateVariables('ios-mobilesdk', {
        projectName: 'TestApp',
        bundleIdentifier: 'com.test.app',
        organization: 'Test Org',
        salesforceMobileSDKVersion: '13.1',
        salesforceLoginHost: 'https://login.salesforce.com',
        salesforceConsumerKey: 'TEST_KEY',
        salesforceCallbackUrl: 'testapp://callback',
      });
      expect(result.valid).toBe(true);
    });

    it('should return error for non-existent template', () => {
      const result = apiValidateTemplateVariables('non-existent', {});
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Template not found');
    });
  });

  describe('generate', () => {
    it('should generate an app', () => {
      const outputDir = join(testDir, 'generated-app');
      const result = generate({
        templateName: 'ios-base',
        outputDirectory: outputDir,
        variables: {},
      });

      expect(result.success).toBe(true);
      expect(result.templateUsed).toBe('ios-base');
      expect(existsSync(outputDir)).toBe(true);
    });

    it('should pass variables to generation', () => {
      const outputDir = join(testDir, 'generated-app-vars');
      const result = generate({
        templateName: 'ios-base',
        outputDirectory: outputDir,
        variables: {
          projectName: 'CustomApp',
          bundleIdentifier: 'com.custom.app',
          organization: 'Custom Org',
        },
      });

      expect(result.success).toBe(true);
      expect(result.variablesUsed.projectName).toBe('CustomApp');
    });
  });

  describe('createTemplateNotFoundError', () => {
    it('should create error with suggestions', () => {
      const error = createTemplateNotFoundError('ios-bas');
      expect(error.message).toContain('ios-bas');
      expect(error.code).toBe('TEMPLATE_NOT_FOUND');
      expect(error.suggestions).toBeDefined();
      expect(error.suggestions!.length).toBeGreaterThan(0);
    });
  });

  describe('createMissingVariablesError', () => {
    it('should create error for missing variables', () => {
      const error = createMissingVariablesError('ios-base', ['projectName', 'bundleId']);
      expect(error.message).toContain('ios-base');
      expect(error.message).toContain('projectName');
      expect(error.message).toContain('bundleId');
      expect(error.code).toBe('MISSING_VARIABLES');
      expect(error.suggestions).toBeDefined();
    });
  });
});
