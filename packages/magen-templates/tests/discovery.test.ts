/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getTemplateRoots,
  discoverTemplates,
  listTemplates,
  getTemplate,
  findTemplate,
} from '../src/core/discovery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Template Discovery', () => {
  const fixturesPath = join(__dirname, 'fixtures', 'templates');
  let originalEnv: string | undefined;

  beforeAll(() => {
    // Set environment variable to point to test fixtures
    originalEnv = process.env.MAGEN_TEMPLATES_PATH;
    process.env.MAGEN_TEMPLATES_PATH = fixturesPath;
  });

  afterAll(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.MAGEN_TEMPLATES_PATH = originalEnv;
    } else {
      delete process.env.MAGEN_TEMPLATES_PATH;
    }
  });

  describe('getTemplateRoots', () => {
    it('should discover template roots', () => {
      const roots = getTemplateRoots();
      expect(roots.length).toBeGreaterThan(0);
      expect(roots.every(r => r.path && typeof r.priority === 'number')).toBe(true);
    });

    it('should sort roots by priority (highest first)', () => {
      const roots = getTemplateRoots();
      for (let i = 1; i < roots.length; i++) {
        expect(roots[i - 1].priority).toBeGreaterThanOrEqual(roots[i].priority);
      }
    });

    it('should include environment-based template root when set', () => {
      const roots = getTemplateRoots();
      const envRoot = roots.find(r => r.type === 'env');
      expect(envRoot).toBeDefined();
      expect(envRoot?.path).toBe(fixturesPath);
    });
  });

  describe('discoverTemplates', () => {
    it('should discover all valid templates', () => {
      const templates = discoverTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(3);

      const templateNames = templates.map(t => t.descriptor.name);
      expect(templateNames).toContain('ios-base');
      expect(templateNames).toContain('ios-salesforce');
      expect(templateNames).toContain('android-base');
    });

    it('should include template path and root type', () => {
      const templates = discoverTemplates();
      expect(templates.every(t => t.templatePath && t.rootType)).toBe(true);
    });

    it('should filter by platform', () => {
      const iosTemplates = discoverTemplates({ platform: 'ios' });
      expect(iosTemplates.every(t => t.descriptor.platform === 'ios')).toBe(true);
      expect(iosTemplates.length).toBeGreaterThanOrEqual(2);

      const androidTemplates = discoverTemplates({ platform: 'android' });
      expect(androidTemplates.every(t => t.descriptor.platform === 'android')).toBe(true);
      expect(androidTemplates.length).toBeGreaterThanOrEqual(1);
    });

    it('should gracefully skip corrupt templates', () => {
      // The corrupt template should be skipped, not crash the discovery
      const templates = discoverTemplates();
      const corruptTemplate = templates.find(t => t.descriptor.name === 'corrupt');
      expect(corruptTemplate).toBeUndefined();
    });
  });

  describe('listTemplates', () => {
    it('should list all template descriptors', () => {
      const templates = listTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThanOrEqual(3);
      expect(templates.every(t => t.name && t.platform && t.version)).toBe(true);
    });

    it('should support platform filtering', () => {
      const iosTemplates = listTemplates({ platform: 'ios' });
      expect(iosTemplates.every(t => t.platform === 'ios')).toBe(true);
    });
  });

  describe('findTemplate', () => {
    it('should find template by name', () => {
      const template = findTemplate('ios-base');
      expect(template).not.toBeNull();
      expect(template?.descriptor.name).toBe('ios-base');
      expect(template?.descriptor.platform).toBe('ios');
    });

    it('should return null for non-existent template', () => {
      const template = findTemplate('non-existent-template');
      expect(template).toBeNull();
    });

    it('should find templates with layering', () => {
      const template = findTemplate('ios-salesforce');
      expect(template).not.toBeNull();
      expect(template?.descriptor.basedOn).toBe('ios-base');
      expect(template?.descriptor.layer).toBeDefined();
      expect(template?.descriptor.layer?.patchFile).toBe('layer.patch');
    });
  });

  describe('getTemplate', () => {
    it('should return template descriptor by name', () => {
      const template = getTemplate('ios-base');
      expect(template.name).toBe('ios-base');
      expect(template.platform).toBe('ios');
      expect(template.version).toBe('1.0.0');
      expect(template.variables.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent template', () => {
      expect(() => getTemplate('non-existent-template')).toThrow('Template not found');
    });

    it('should return complete template metadata', () => {
      const template = getTemplate('ios-salesforce');
      expect(template.name).toBe('ios-salesforce');
      expect(template.basedOn).toBe('ios-base');
      expect(template.tags).toContain('salesforce');
      expect(template.description).toBeDefined();
      expect(template.variables.length).toBeGreaterThan(0);
    });

    it('should include variable metadata', () => {
      const template = getTemplate('ios-salesforce');
      const orgIdVar = template.variables.find(v => v.name === 'orgId');
      expect(orgIdVar).toBeDefined();
      expect(orgIdVar?.type).toBe('string');
      expect(orgIdVar?.required).toBe(true);
      expect(orgIdVar?.regex).toBeDefined();
    });

    it('should include enum constraints', () => {
      const template = getTemplate('ios-salesforce');
      const envVar = template.variables.find(v => v.name === 'environment');
      expect(envVar).toBeDefined();
      expect(envVar?.enum).toEqual(['development', 'staging', 'production']);
    });

    it('should load variables from work/variables.json for layered templates', () => {
      // ios-salesforce is a layered template (based on ios-base)
      const template = getTemplate('ios-salesforce');

      // Should have variables (loaded from work/variables.json)
      expect(template.variables.length).toBeGreaterThan(0);

      // Should include both base variables and extended variables (with potentially overridden defaults)
      const appNameVar = template.variables.find(v => v.name === 'appName');
      expect(appNameVar).toBeDefined();
      expect(appNameVar?.default).toBe('Salesforce App'); // Overridden in layered template

      // Should include layered template's own variables
      const orgIdVar = template.variables.find(v => v.name === 'orgId');
      expect(orgIdVar).toBeDefined();
      expect(orgIdVar?.required).toBe(true);
    });
  });
});
