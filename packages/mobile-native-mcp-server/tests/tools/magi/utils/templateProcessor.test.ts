/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import {
  processTemplate,
  createTemplateContext,
  TemplateContext,
} from '../../../../src/tools/magi/utils/templateProcessor.js';

describe('templateProcessor', () => {
  const mockContext: TemplateContext = {
    projectPath: '/test/project',
    featureId: '001-user-authentication',
    magiDirectory: '/test/project/magi-sdd/001-user-authentication',
    prdPath: '/test/project/magi-sdd/001-user-authentication/prd.md',
    tddPath: '/test/project/magi-sdd/001-user-authentication/tdd.md',
    tasksPath: '/test/project/magi-sdd/001-user-authentication/tasks.md',
  };

  describe('processTemplate', () => {
    it('should replace project_path placeholder', () => {
      const template = 'Project is located at <project_path>';
      const result = processTemplate(template, mockContext);
      expect(result).toBe('Project is located at .');
    });

    it('should replace feature_id placeholder', () => {
      const template = 'Working on feature: <feature_id>';
      const result = processTemplate(template, mockContext);
      expect(result).toBe('Working on feature: 001-user-authentication');
    });

    it('should replace feature_name placeholder (without numeric prefix)', () => {
      const template = 'Feature name: <feature_name>';
      const result = processTemplate(template, mockContext);
      expect(result).toBe('Feature name: user-authentication');
    });

    it('should replace magi_directory placeholder with relative path', () => {
      const template = 'Magi directory: <magi_directory>';
      const result = processTemplate(template, mockContext);
      expect(result).toBe('Magi directory: magi-sdd/001-user-authentication');
    });

    it('should replace file path placeholders with relative paths', () => {
      const template = 'PRD: <prd_path>, TDD: <tdd_path>, Tasks: <tasks_path>';
      const result = processTemplate(template, mockContext);
      expect(result).toBe(
        'PRD: magi-sdd/001-user-authentication/prd.md, TDD: magi-sdd/001-user-authentication/tdd.md, Tasks: magi-sdd/001-user-authentication/tasks.md'
      );
    });

    it('should replace multiple occurrences of the same placeholder', () => {
      const template = '<feature_id> is the ID for <feature_id> feature';
      const result = processTemplate(template, mockContext);
      expect(result).toBe('001-user-authentication is the ID for 001-user-authentication feature');
    });

    it('should handle template with no placeholders', () => {
      const template = 'This is a plain text template';
      const result = processTemplate(template, mockContext);
      expect(result).toBe('This is a plain text template');
    });

    it('should handle empty template', () => {
      const template = '';
      const result = processTemplate(template, mockContext);
      expect(result).toBe('');
    });

    it('should handle template with all placeholders', () => {
      const template = `
        Project: <project_path>
        Feature ID: <feature_id>
        Feature Name: <feature_name>
        Magi Dir: <magi_directory>
        PRD: <prd_path>
        TDD: <tdd_path>
        Tasks: <tasks_path>
      `;
      const result = processTemplate(template, mockContext);
      expect(result).toContain('Project: .');
      expect(result).toContain('Feature ID: 001-user-authentication');
      expect(result).toContain('Feature Name: user-authentication');
      expect(result).toContain('Magi Dir: magi-sdd/001-user-authentication');
      expect(result).toContain('PRD: magi-sdd/001-user-authentication/prd.md');
      expect(result).toContain('TDD: magi-sdd/001-user-authentication/tdd.md');
      expect(result).toContain('Tasks: magi-sdd/001-user-authentication/tasks.md');
    });

    it('should handle placeholders with special regex characters', () => {
      // Test that our regex escaping works correctly
      const template = 'Path: <project_path>';
      const result = processTemplate(template, mockContext);
      expect(result).toBe('Path: .');
    });

    it('should handle feature ID without numeric prefix', () => {
      const contextWithoutPrefix: TemplateContext = {
        ...mockContext,
        featureId: 'simple-feature',
      };
      const template = 'Feature name: <feature_name>';
      const result = processTemplate(template, contextWithoutPrefix);
      expect(result).toBe('Feature name: simple-feature');
    });

    it('should handle feature ID with only numeric prefix', () => {
      const contextOnlyPrefix: TemplateContext = {
        ...mockContext,
        featureId: '001-',
      };
      const template = 'Feature name: <feature_name>';
      const result = processTemplate(template, contextOnlyPrefix);
      expect(result).toBe('Feature name: ');
    });
  });

  describe('createTemplateContext', () => {
    it('should create template context from magi state context', () => {
      const magiStateContext = {
        projectPath: '/test/project',
        featureId: '002-payment-system',
        magiDirectory: '/test/project/magi-sdd/002-payment-system',
        prdPath: '/test/project/magi-sdd/002-payment-system/prd.md',
        tddPath: '/test/project/magi-sdd/002-payment-system/tdd.md',
        tasksPath: '/test/project/magi-sdd/002-payment-system/tasks.md',
      };

      const result = createTemplateContext(magiStateContext);

      expect(result).toEqual({
        projectPath: '/test/project',
        featureId: '002-payment-system',
        magiDirectory: '/test/project/magi-sdd/002-payment-system',
        prdPath: '/test/project/magi-sdd/002-payment-system/prd.md',
        tddPath: '/test/project/magi-sdd/002-payment-system/tdd.md',
        tasksPath: '/test/project/magi-sdd/002-payment-system/tasks.md',
      });
    });

    it('should preserve all properties from input context', () => {
      const inputContext = {
        projectPath: '/different/path',
        featureId: '999-test-feature',
        magiDirectory: '/different/path/magi-sdd/999-test-feature',
        prdPath: '/different/path/magi-sdd/999-test-feature/prd.md',
        tddPath: '/different/path/magi-sdd/999-test-feature/tdd.md',
        tasksPath: '/different/path/magi-sdd/999-test-feature/tasks.md',
      };

      const result = createTemplateContext(inputContext);

      expect(result).toEqual(inputContext);
    });
  });
});


