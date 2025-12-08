import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { testTemplate, getWorkDirectory, hasTestInstance } from '../src/core/testing.js';

describe('Template Testing', () => {
  let testDir: string;
  let templateDir: string;

  beforeEach(() => {
    // Create unique test directory
    const testId = Math.random().toString(36).substring(7);
    testDir = join(__dirname, '../test-output/testing', testId);
    templateDir = join(testDir, 'test-template');

    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Create a simple test template
    mkdirSync(join(templateDir, 'template', '{{appName}}'), { recursive: true });

    const templateJson = {
      name: 'test-template',
      platform: 'ios',
      version: '1.0.0',
      description: 'Test template',
      variables: [
        {
          name: 'appName',
          type: 'string',
          required: true,
          description: 'App name',
          default: 'TestApp',
        },
        {
          name: 'bundleId',
          type: 'string',
          required: true,
          description: 'Bundle ID',
          default: 'com.test.app',
        },
      ],
    };

    writeFileSync(join(templateDir, 'template.json'), JSON.stringify(templateJson, null, 2));

    const appFile = `
// {{appName}}App.swift
let appName = "{{appName}}"
let bundleId = "{{bundleId}}"
`;

    writeFileSync(join(templateDir, 'template', '{{appName}}', 'App.swift'), appFile);
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('testTemplate', () => {
    it('should create test instance with default variables', () => {
      const result = testTemplate({
        templateName: 'test-template',
        templateDirectory: templateDir,
      });

      expect(result.workDirectory).toBe(join(templateDir, 'work'));
      expect(result.variables.appName).toBe('TestApp');
      expect(result.variables.bundleId).toBe('com.test.app');
      expect(result.created).toBe(true);

      // Verify files were generated
      const workDir = result.workDirectory;
      const appFile = join(workDir, 'TestApp', 'App.swift');
      expect(existsSync(appFile)).toBe(true);

      const content = readFileSync(appFile, 'utf-8');
      expect(content).toContain('let appName = "TestApp"');
      expect(content).toContain('let bundleId = "com.test.app"');
    });

    it('should create test instance with custom variables', () => {
      const result = testTemplate({
        templateName: 'test-template',
        templateDirectory: templateDir,
        variables: {
          appName: 'MyCustomApp',
          bundleId: 'com.custom.app',
        },
      });

      expect(result.variables.appName).toBe('MyCustomApp');
      expect(result.variables.bundleId).toBe('com.custom.app');
      expect(result.created).toBe(true);

      const appFile = join(result.workDirectory, 'MyCustomApp', 'App.swift');
      const content = readFileSync(appFile, 'utf-8');
      expect(content).toContain('let appName = "MyCustomApp"');
      expect(content).toContain('let bundleId = "com.custom.app"');
    });

    it('should return existing test instance if already present', () => {
      // First test
      const result1 = testTemplate({
        templateName: 'test-template',
        templateDirectory: templateDir,
      });
      expect(result1.created).toBe(true);

      // Second test without regenerate
      const result2 = testTemplate({
        templateName: 'test-template',
        templateDirectory: templateDir,
      });
      expect(result2.created).toBe(false);
      expect(result2.workDirectory).toBe(result1.workDirectory);
    });

    it('should regenerate test instance when regenerate flag is true', () => {
      // First test
      const result1 = testTemplate({
        templateName: 'test-template',
        templateDirectory: templateDir,
      });
      expect(result1.created).toBe(true);

      // Add a marker file to detect regeneration
      const markerFile = join(result1.workDirectory, 'marker.txt');
      writeFileSync(markerFile, 'old');

      // Second test with regenerate
      const result2 = testTemplate({
        templateName: 'test-template',
        templateDirectory: templateDir,
        regenerate: true,
      });
      expect(result2.created).toBe(true);
      expect(existsSync(markerFile)).toBe(false); // Marker should be gone
    });

    it('should handle template not found error', () => {
      expect(() => {
        testTemplate({
          templateName: 'non-existent',
          templateDirectory: '/nonexistent/path',
        });
      }).toThrow();
    });
  });

  describe('getWorkDirectory', () => {
    it('should return correct work directory path', () => {
      const workDir = getWorkDirectory('test-template', templateDir);
      expect(workDir).toBe(join(templateDir, 'work'));
    });

    it('should use default path when no template directory provided', () => {
      const workDir = getWorkDirectory('test-template');
      expect(workDir).toContain('templates/test-template/work');
    });
  });

  describe('hasTestInstance', () => {
    it('should return false when no test instance exists', () => {
      const hasInstance = hasTestInstance('test-template', templateDir);
      expect(hasInstance).toBe(false);
    });

    it('should return true when test instance exists', () => {
      testTemplate({
        templateName: 'test-template',
        templateDirectory: templateDir,
      });

      const hasInstance = hasTestInstance('test-template', templateDir);
      expect(hasInstance).toBe(true);
    });

    it('should return false when work directory is empty', () => {
      // Create empty work directory
      mkdirSync(join(templateDir, 'work'), { recursive: true });

      const hasInstance = hasTestInstance('test-template', templateDir);
      expect(hasInstance).toBe(false);
    });
  });

  describe('Round-trip consistency', () => {
    it('should produce consistent output across multiple tests', () => {
      const result1 = testTemplate({
        templateName: 'test-template',
        templateDirectory: templateDir,
        variables: { appName: 'ConsistentApp' },
      });

      const file1 = join(result1.workDirectory, 'ConsistentApp', 'App.swift');
      const content1 = readFileSync(file1, 'utf-8');

      // Regenerate
      const result2 = testTemplate({
        templateName: 'test-template',
        templateDirectory: templateDir,
        variables: { appName: 'ConsistentApp' },
        regenerate: true,
      });

      const file2 = join(result2.workDirectory, 'ConsistentApp', 'App.swift');
      const content2 = readFileSync(file2, 'utf-8');

      expect(content1).toBe(content2);
    });
  });
});
