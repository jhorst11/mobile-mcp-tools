/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  generateApp,
  validateVariables,
  mergeVariables,
  renderTemplate,
  renderPath,
} from '../src/core/generator.js';
import type { TemplateVariable } from '../src/core/schema.js';

describe('Template Generator', () => {
  const testOutputDir = join(process.cwd(), 'test-output/generator');

  beforeEach(() => {
    // Clean up before each test
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('renderTemplate', () => {
    it('should render simple variables', () => {
      const result = renderTemplate('Hello {{name}}!', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should render multiple variables', () => {
      const result = renderTemplate('{{greeting}} {{name}}!', {
        greeting: 'Hello',
        name: 'World',
      });
      expect(result).toBe('Hello World!');
    });

    it('should handle number variables', () => {
      const result = renderTemplate('Count: {{count}}', { count: 42 });
      expect(result).toBe('Count: 42');
    });

    it('should handle boolean variables', () => {
      const result = renderTemplate('Enabled: {{enabled}}', { enabled: true });
      expect(result).toBe('Enabled: true');
    });
  });

  describe('renderPath', () => {
    it('should render filename with variables', () => {
      const result = renderPath('{{projectName}}App.swift', { projectName: 'MyApp' });
      expect(result).toBe('MyAppApp.swift');
    });

    it('should handle directory names', () => {
      const result = renderPath('{{projectName}}.xcodeproj', { projectName: 'MyApp' });
      expect(result).toBe('MyApp.xcodeproj');
    });

    it('should return unchanged path if no variables', () => {
      const result = renderPath('ContentView.swift', { projectName: 'MyApp' });
      expect(result).toBe('ContentView.swift');
    });
  });

  describe('mergeVariables', () => {
    const templateVars: TemplateVariable[] = [
      {
        name: 'var1',
        type: 'string',
        required: true,
        description: 'Test',
        default: 'default1',
      },
      { name: 'var2', type: 'string', required: false, description: 'Test', default: 'default2' },
      { name: 'var3', type: 'string', required: true, description: 'Test' },
    ];

    it('should use defaults when no variables provided', () => {
      const result = mergeVariables(templateVars, {});
      expect(result.var1).toBe('default1');
      expect(result.var2).toBe('default2');
      expect(result.var3).toBeUndefined();
    });

    it('should override defaults with provided values', () => {
      const result = mergeVariables(templateVars, { var1: 'custom' });
      expect(result.var1).toBe('custom');
      expect(result.var2).toBe('default2');
    });

    it('should handle provided variables without defaults', () => {
      const result = mergeVariables(templateVars, { var3: 'provided' });
      expect(result.var3).toBe('provided');
    });
  });

  describe('validateVariables', () => {
    const templateVars: TemplateVariable[] = [
      { name: 'projectName', type: 'string', required: true, description: 'Project name' },
      { name: 'count', type: 'number', required: false, description: 'Count' },
      {
        name: 'bundleIdentifier',
        type: 'string',
        required: true,
        description: 'Bundle Identifier',
        regex: '^[a-z]+(\\.[a-z]+)+$',
      },
      {
        name: 'env',
        type: 'string',
        required: false,
        description: 'Environment',
        enum: ['dev', 'staging', 'prod'],
      },
    ];

    it('should pass validation for correct variables', () => {
      const result = validateVariables(templateVars, {
        projectName: 'MyApp',
        bundleIdentifier: 'com.example.app',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail if required variable is missing', () => {
      const result = validateVariables(templateVars, { bundleIdentifier: 'com.example.app' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain("Required variable 'projectName' is missing");
      }
    });

    it('should fail if variable has wrong type', () => {
      const result = validateVariables(templateVars, {
        projectName: 'MyApp',
        bundleIdentifier: 'com.example.app',
        count: 'not-a-number' as unknown as number,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.includes('wrong type'))).toBe(true);
      }
    });

    it('should fail if regex validation fails', () => {
      const result = validateVariables(templateVars, {
        projectName: 'MyApp',
        bundleIdentifier: 'InvalidBundleId',
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.includes('does not match pattern'))).toBe(true);
      }
    });

    it('should fail if enum validation fails', () => {
      const result = validateVariables(templateVars, {
        projectName: 'MyApp',
        bundleIdentifier: 'com.example.app',
        env: 'invalid',
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.includes('must be one of'))).toBe(true);
      }
    });

    it('should pass if enum value is valid', () => {
      const result = validateVariables(templateVars, {
        projectName: 'MyApp',
        bundleIdentifier: 'com.example.app',
        env: 'staging',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('generateApp', () => {
    it('should generate app from ios-base template', () => {
      const outputDir = join(testOutputDir, 'my-app');

      generateApp({
        templateName: 'ios-base',
        outputDirectory: outputDir,
        variables: {
          projectName: 'MyTestApp',
          bundleIdentifier: 'com.test.myapp',
          organization: 'Test Inc.',
        },
      });

      // Check files were created (in the {{projectName}} subdirectory)
      expect(existsSync(join(outputDir, 'MyTestApp', 'MyTestAppApp.swift'))).toBe(true);
      expect(existsSync(join(outputDir, 'MyTestApp', 'ContentView.swift'))).toBe(true);
      expect(existsSync(join(outputDir, 'MyTestApp', 'Info.plist'))).toBe(true);
      expect(existsSync(join(outputDir, 'MyTestApp', 'Assets.xcassets'))).toBe(true);

      // Check content was rendered
      const appFile = readFileSync(join(outputDir, 'MyTestApp', 'MyTestAppApp.swift'), 'utf-8');
      expect(appFile).toContain('struct MyTestAppApp: App');
      expect(appFile).toContain('MyTestApp');

      const contentView = readFileSync(join(outputDir, 'MyTestApp', 'ContentView.swift'), 'utf-8');
      expect(contentView).toContain('Welcome to MyTestApp');
      expect(contentView).toContain('Built by Test Inc.');

      const infoPlist = readFileSync(join(outputDir, 'MyTestApp', 'Info.plist'), 'utf-8');
      expect(infoPlist).toContain('<string>MyTestApp</string>');
      expect(infoPlist).toContain('<string>com.test.myapp</string>');
    });

    it('should use default values when not provided', () => {
      const outputDir = join(testOutputDir, 'default-app');

      generateApp({
        templateName: 'ios-base',
        outputDirectory: outputDir,
        variables: {},
      });

      // Should use default projectName "MyApp"
      expect(existsSync(join(outputDir, 'MyApp', 'MyAppApp.swift'))).toBe(true);

      const appFile = readFileSync(join(outputDir, 'MyApp', 'MyAppApp.swift'), 'utf-8');
      expect(appFile).toContain('struct MyAppApp: App');
    });

    it('should throw error for missing template', () => {
      expect(() => {
        generateApp({
          templateName: 'non-existent-template',
          outputDirectory: testOutputDir,
          variables: {},
        });
      }).toThrow('Template not found');
    });

    it('should throw error for invalid regex pattern', () => {
      expect(() => {
        generateApp({
          templateName: 'ios-base',
          outputDirectory: testOutputDir,
          variables: {
            projectName: 'Test',
            bundleIdentifier: 'InvalidBundleId', // Doesn't match regex pattern
          },
        });
      }).toThrow('Variable validation failed');
    });

    it('should throw error if output directory exists and not empty (without overwrite)', () => {
      const outputDir = join(testOutputDir, 'existing-app');

      // Create directory with a file
      mkdirSync(outputDir, { recursive: true });
      writeFileSync(join(outputDir, 'existing.txt'), 'content');

      expect(() => {
        generateApp({
          templateName: 'ios-base',
          outputDirectory: outputDir,
          variables: {
            projectName: 'Test',
            bundleIdentifier: 'com.test.app',
            organization: 'Test Inc.',
          },
        });
      }).toThrow('Output directory is not empty');
    });

    it('should overwrite files when overwrite flag is set', () => {
      const outputDir = join(testOutputDir, 'overwrite-test');

      // First generation
      generateApp({
        templateName: 'ios-base',
        outputDirectory: outputDir,
        variables: {
          projectName: 'FirstApp',
          bundleIdentifier: 'com.test.first',
          organization: 'First Inc.',
        },
      });

      // Second generation with overwrite
      generateApp({
        templateName: 'ios-base',
        outputDirectory: outputDir,
        variables: {
          projectName: 'SecondApp',
          bundleIdentifier: 'com.test.second',
          organization: 'Second Inc.',
        },
        overwrite: true,
      });

      // Should have second app's content
      const appFile = readFileSync(join(outputDir, 'SecondApp', 'SecondAppApp.swift'), 'utf-8');
      expect(appFile).toContain('struct SecondAppApp: App');
    });

    it('should create nested directory structures', () => {
      const outputDir = join(testOutputDir, 'nested-app');

      generateApp({
        templateName: 'ios-base',
        outputDirectory: outputDir,
        variables: {
          projectName: 'NestedApp',
          bundleIdentifier: 'com.test.nested',
          organization: 'Test Inc.',
        },
      });

      // Check nested Assets.xcassets structure
      expect(existsSync(join(outputDir, 'NestedApp', 'Assets.xcassets', 'Contents.json'))).toBe(
        true
      );
      expect(
        existsSync(join(outputDir, 'NestedApp', 'Assets.xcassets', 'AppIcon.appiconset'))
      ).toBe(true);
    });

    it('should handle type coercion correctly', () => {
      const outputDir = join(testOutputDir, 'type-test');

      generateApp({
        templateName: 'ios-base',
        outputDirectory: outputDir,
        variables: {
          projectName: 'TypeTest',
          bundleIdentifier: 'com.test.types',
          organization: 'Test Inc.',
        },
      });

      expect(existsSync(join(outputDir, 'TypeTest', 'TypeTestApp.swift'))).toBe(true);
    });
  });
});
