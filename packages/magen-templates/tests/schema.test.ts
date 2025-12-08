/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import {
  validateTemplateDescriptor,
  safeValidateTemplateDescriptor,
  validateTemplateVariables,
} from '../src/core/schema.js';
import { ZodError } from 'zod';

describe('Template Schema Validation', () => {
  const validTemplate = {
    name: 'test-template',
    platform: 'ios',
    version: '1.0.0',
  };

  describe('validateTemplateDescriptor', () => {
    it('should validate a correct template', () => {
      const result = validateTemplateDescriptor(validTemplate);
      expect(result.name).toBe('test-template');
      expect(result.platform).toBe('ios');
      expect(result.version).toBe('1.0.0');
    });

    it('should throw ZodError for invalid template', () => {
      const invalidTemplate = { ...validTemplate, version: 'invalid' };
      expect(() => validateTemplateDescriptor(invalidTemplate)).toThrow(ZodError);
    });

    it('should validate template with optional fields', () => {
      const templateWithOptionals = {
        ...validTemplate,
        basedOn: 'base-template',
        tags: ['tag1', 'tag2'],
        description: 'A test template',
      };
      const result = validateTemplateDescriptor(templateWithOptionals);
      expect(result.basedOn).toBe('base-template');
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.description).toBe('A test template');
    });

    it('should validate template with layer config', () => {
      const templateWithLayer = {
        ...validTemplate,
        basedOn: 'base-template',
        layer: {
          patchFile: 'layer.patch',
        },
      };
      const result = validateTemplateDescriptor(templateWithLayer);
      expect(result.layer?.patchFile).toBe('layer.patch');
    });
  });

  describe('safeValidateTemplateDescriptor', () => {
    it('should return success for valid template', () => {
      const result = safeValidateTemplateDescriptor(validTemplate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('test-template');
      }
    });

    it('should return errors for invalid template', () => {
      const invalidTemplate = { ...validTemplate, version: 'invalid' };
      const result = safeValidateTemplateDescriptor(invalidTemplate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('version');
      }
    });

    it('should provide clear error messages', () => {
      const invalidTemplate = { ...validTemplate, name: '' };
      const result = safeValidateTemplateDescriptor(invalidTemplate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('name');
      }
    });
  });

  describe('Version Validation', () => {
    it('should accept valid semver versions', () => {
      const validVersions = ['0.0.1', '1.0.0', '10.20.30'];
      validVersions.forEach(version => {
        const template = { ...validTemplate, version };
        const result = validateTemplateDescriptor(template);
        expect(result.version).toBe(version);
      });
    });

    it('should reject invalid version formats', () => {
      const invalidVersions = ['1.0', 'v1.0.0', '1.0.0-beta', '1.0.0.0'];
      invalidVersions.forEach(version => {
        const template = { ...validTemplate, version };
        expect(() => validateTemplateDescriptor(template)).toThrow();
      });
    });
  });

  describe('Variable Validation', () => {
    it('should validate variable types', () => {
      const types = ['string', 'number', 'boolean'] as const;
      types.forEach(type => {
        const variables = {
          variables: [
            {
              name: 'testVar',
              type,
              required: true,
              description: 'Test variable',
            },
          ],
        };
        const result = validateTemplateVariables(variables);
        expect(result.variables[0].type).toBe(type);
      });
    });

    it('should reject invalid variable types', () => {
      const variables = {
        variables: [
          {
            name: 'testVar',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: 'invalid' as any,
            required: true,
            description: 'Test',
          },
        ],
      };
      expect(() => validateTemplateVariables(variables)).toThrow();
    });

    it('should validate optional variable fields', () => {
      const variables = {
        variables: [
          {
            name: 'testVar',
            type: 'string' as const,
            required: true,
            description: 'Test',
            default: 'default value',
            regex: '^[a-z]+$',
            enum: ['option1', 'option2'],
          },
        ],
      };
      const result = validateTemplateVariables(variables);
      expect(result.variables[0].default).toBe('default value');
      expect(result.variables[0].regex).toBe('^[a-z]+$');
      expect(result.variables[0].enum).toEqual(['option1', 'option2']);
    });

    it('should require variable name', () => {
      const variables = {
        variables: [
          {
            name: '',
            type: 'string' as const,
            required: true,
            description: 'Test',
          },
        ],
      };
      expect(() => validateTemplateVariables(variables)).toThrow();
    });

    it('should require variable description', () => {
      const variables = {
        variables: [
          {
            name: 'testVar',
            type: 'string' as const,
            required: true,
            description: '',
          },
        ],
      };
      expect(() => validateTemplateVariables(variables)).toThrow();
    });
  });

  describe('Required Fields', () => {
    it('should require name field', () => {
      const { name: _name, ...template } = validTemplate;
      expect(() => validateTemplateDescriptor(template)).toThrow();
    });

    it('should require platform field', () => {
      const { platform: _platform, ...template } = validTemplate;
      expect(() => validateTemplateDescriptor(template)).toThrow();
    });

    it('should require version field', () => {
      const { version: _version, ...template } = validTemplate;
      expect(() => validateTemplateDescriptor(template)).toThrow();
    });
  });
});
