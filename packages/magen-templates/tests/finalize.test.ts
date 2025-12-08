import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { finalizeTemplate } from '../src/core/finalize.js';

describe('Template Finalization', () => {
  let testDir: string;
  let workDir: string;
  let templateDir: string;

  beforeEach(() => {
    // Create unique test directory for each test
    const testId = Math.random().toString(36).substring(7);
    testDir = join(__dirname, '../test-output/finalize', testId);
    workDir = join(testDir, 'work');
    templateDir = join(testDir, 'template-output');

    // Clean up and create directories for each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(workDir, { recursive: true });
    mkdirSync(templateDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('finalizeTemplate', () => {
    it('should extract variables from annotations', () => {
      // Create a simple authoring instance
      const appSwift = `
// magen:var appName string required "The application name"
let appName = "TestApp"

// magen:var bundleId string required "Bundle identifier"
let bundleId = "com.test.app"
`;

      writeFileSync(join(workDir, 'App.swift'), appSwift);

      const result = finalizeTemplate({
        workDirectory: workDir,
        templateDirectory: templateDir,
        templateName: 'test-template',
        platform: 'ios',
        version: '0.1.0',
      });

      expect(result.variables).toHaveLength(2);
      expect(result.variables.find(v => v.name === 'appName')).toMatchObject({
        name: 'appName',
        type: 'string',
        required: true,
        description: 'The application name',
        default: 'TestApp',
      });
      expect(result.variables.find(v => v.name === 'bundleId')).toMatchObject({
        name: 'bundleId',
        type: 'string',
        required: true,
        description: 'Bundle identifier',
        default: 'com.test.app',
      });
    });

    it('should rewrite literals to Handlebars', () => {
      const appSwift = `
// magen:var appName string required
let appName = "TestApp"
`;

      writeFileSync(join(workDir, 'App.swift'), appSwift);

      finalizeTemplate({
        workDirectory: workDir,
        templateDirectory: templateDir,
        templateName: 'test-template',
        platform: 'ios',
        version: '0.1.0',
      });

      const templatedFile = readFileSync(join(templateDir, 'template', 'App.swift'), 'utf-8');

      expect(templatedFile).toContain('let appName = "{{appName}}"');
      expect(templatedFile).toContain('// magen:var appName string required');
    });

    it('should handle magen:filename annotation', () => {
      const appSwift = `
// magen:filename {{appName}}App.swift
// magen:var appName string required
let appName = "TestApp"
`;

      writeFileSync(join(workDir, 'MagenDemoApp.swift'), appSwift);

      const result = finalizeTemplate({
        workDirectory: workDir,
        templateDirectory: templateDir,
        templateName: 'test-template',
        platform: 'ios',
        version: '0.1.0',
      });

      expect(result.renamedFiles.size).toBe(1);
      expect(result.renamedFiles.get('MagenDemoApp.swift')).toBe('{{appName}}App.swift');
      expect(existsSync(join(templateDir, 'template', '{{appName}}App.swift'))).toBe(true);
      expect(existsSync(join(templateDir, 'template', 'MagenDemoApp.swift'))).toBe(false);
    });

    it('should handle regex rules', () => {
      const appSwift = `
// magen:var orgId string required
// magen:regex orgId "^[0-9A-Za-z]+$"
let orgId = "ABC123"
`;

      writeFileSync(join(workDir, 'Config.swift'), appSwift);

      const result = finalizeTemplate({
        workDirectory: workDir,
        templateDirectory: templateDir,
        templateName: 'test-template',
        platform: 'ios',
        version: '0.1.0',
      });

      const orgIdVar = result.variables.find(v => v.name === 'orgId');
      expect(orgIdVar).toBeDefined();
      expect(orgIdVar!.regex).toBe('^[0-9A-Za-z]+$');
    });

    it('should handle enum rules', () => {
      const appSwift = `
// magen:var environment string required
// magen:enum environment dev staging prod
let environment = "dev"
`;

      writeFileSync(join(workDir, 'Config.swift'), appSwift);

      const result = finalizeTemplate({
        workDirectory: workDir,
        templateDirectory: templateDir,
        templateName: 'test-template',
        platform: 'ios',
        version: '0.1.0',
      });

      const envVar = result.variables.find(v => v.name === 'environment');
      expect(envVar).toBeDefined();
      expect(envVar!.enum).toEqual(['dev', 'staging', 'prod']);
    });

    it('should generate valid template.json', () => {
      const appSwift = `
// magen:var appName string required "App name"
let appName = "TestApp"
`;

      writeFileSync(join(workDir, 'App.swift'), appSwift);

      finalizeTemplate({
        workDirectory: workDir,
        templateDirectory: templateDir,
        templateName: 'my-template',
        platform: 'ios',
        version: '1.0.0',
        description: 'A test template',
        tags: ['test', 'demo'],
      });

      const templateJsonPath = join(templateDir, 'template.json');
      expect(existsSync(templateJsonPath)).toBe(true);

      const templateJson = JSON.parse(readFileSync(templateJsonPath, 'utf-8'));
      expect(templateJson).toMatchObject({
        name: 'my-template',
        platform: 'ios',
        version: '1.0.0',
        description: 'A test template',
        tags: ['test', 'demo'],
      });
      expect(templateJson.variables).toHaveLength(1);
      expect(templateJson.variables[0].name).toBe('appName');
    });

    it('should handle nested directory structures', () => {
      mkdirSync(join(workDir, 'src', 'utils'), { recursive: true });

      const mainSwift = `
// magen:var appName string required
let appName = "TestApp"
`;

      const utilSwift = `
// magen:var apiKey string optional
let apiKey = "default-key"
`;

      writeFileSync(join(workDir, 'src', 'Main.swift'), mainSwift);
      writeFileSync(join(workDir, 'src', 'utils', 'API.swift'), utilSwift);

      const result = finalizeTemplate({
        workDirectory: workDir,
        templateDirectory: templateDir,
        templateName: 'test-template',
        platform: 'ios',
        version: '0.1.0',
      });

      expect(result.variables).toHaveLength(2);
      expect(existsSync(join(templateDir, 'template', 'src', 'Main.swift'))).toBe(true);
      expect(existsSync(join(templateDir, 'template', 'src', 'utils', 'API.swift'))).toBe(true);
    });

    it('should merge variables from multiple files', () => {
      const file1 = `
// magen:var appName string required
let appName = "TestApp"
`;

      const file2 = `
// magen:var bundleId string required
let bundleId = "com.test.app"
`;

      writeFileSync(join(workDir, 'File1.swift'), file1);
      writeFileSync(join(workDir, 'File2.swift'), file2);

      const result = finalizeTemplate({
        workDirectory: workDir,
        templateDirectory: templateDir,
        templateName: 'test-template',
        platform: 'ios',
        version: '0.1.0',
      });

      expect(result.variables).toHaveLength(2);
      expect(result.variables.map(v => v.name).sort()).toEqual(['appName', 'bundleId']);
    });

    it('should throw error for conflicting variable types', () => {
      const file1 = `
// magen:var count number required
let count = 42
`;

      const file2 = `
// magen:var count string required
let count = "not a number"
`;

      writeFileSync(join(workDir, 'File1.swift'), file1);
      writeFileSync(join(workDir, 'File2.swift'), file2);

      expect(() => {
        finalizeTemplate({
          workDirectory: workDir,
          templateDirectory: templateDir,
          templateName: 'test-template',
          platform: 'ios',
          version: '0.1.0',
        });
      }).toThrow('conflicting types');
    });

    it('should throw error for duplicate variable definitions', () => {
      const file = `
// magen:var appName string required
let appName = "TestApp"

// magen:var appName string optional
let appName2 = "TestApp2"
`;

      writeFileSync(join(workDir, 'File.swift'), file);

      expect(() => {
        finalizeTemplate({
          workDirectory: workDir,
          templateDirectory: templateDir,
          templateName: 'test-template',
          platform: 'ios',
          version: '0.1.0',
        });
      }).toThrow('Duplicate variable definition');
    });

    it('should throw error for invalid regex pattern', () => {
      const file = `
// magen:var name string required
// magen:regex name "[invalid(regex"
let name = "test"
`;

      writeFileSync(join(workDir, 'File.swift'), file);

      expect(() => {
        finalizeTemplate({
          workDirectory: workDir,
          templateDirectory: templateDir,
          templateName: 'test-template',
          platform: 'ios',
          version: '0.1.0',
        });
      }).toThrow('Invalid regex pattern');
    });

    it('should throw error for regex referencing undefined variable', () => {
      const file = `
// magen:var appName string required
// magen:regex undefinedVar "^test$"
let appName = "TestApp"
`;

      writeFileSync(join(workDir, 'File.swift'), file);

      expect(() => {
        finalizeTemplate({
          workDirectory: workDir,
          templateDirectory: templateDir,
          templateName: 'test-template',
          platform: 'ios',
          version: '0.1.0',
        });
      }).toThrow('references undefined variable');
    });

    it('should skip node_modules and .git directories', () => {
      mkdirSync(join(workDir, 'node_modules'), { recursive: true });
      mkdirSync(join(workDir, '.git'), { recursive: true });

      const validFile = `
// magen:var appName string required
let appName = "TestApp"
`;

      const ignoreFile = `
// magen:var shouldBeIgnored string required
let shouldBeIgnored = "ignored"
`;

      writeFileSync(join(workDir, 'Valid.swift'), validFile);
      writeFileSync(join(workDir, 'node_modules', 'Ignored.swift'), ignoreFile);
      writeFileSync(join(workDir, '.git', 'Ignored.swift'), ignoreFile);

      const result = finalizeTemplate({
        workDirectory: workDir,
        templateDirectory: templateDir,
        templateName: 'test-template',
        platform: 'ios',
        version: '0.1.0',
      });

      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].name).toBe('appName');
      expect(existsSync(join(templateDir, 'template', 'node_modules'))).toBe(false);
      expect(existsSync(join(templateDir, 'template', '.git'))).toBe(false);
    });

    it('should copy non-text files as-is', () => {
      const validFile = `
// magen:var appName string required
let appName = "TestApp"
`;

      writeFileSync(join(workDir, 'App.swift'), validFile);
      writeFileSync(join(workDir, 'image.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG magic bytes

      finalizeTemplate({
        workDirectory: workDir,
        templateDirectory: templateDir,
        templateName: 'test-template',
        platform: 'ios',
        version: '0.1.0',
      });

      expect(existsSync(join(templateDir, 'template', 'image.png'))).toBe(true);
      const copiedImage = readFileSync(join(templateDir, 'template', 'image.png'));
      expect(copiedImage[0]).toBe(0x89);
    });

    it('should support basedOn option', () => {
      const file = `
// magen:var extraVar string required
let extraVar = "extra"
`;

      writeFileSync(join(workDir, 'Extra.swift'), file);

      const result = finalizeTemplate({
        workDirectory: workDir,
        templateDirectory: templateDir,
        templateName: 'child-template',
        platform: 'ios',
        version: '0.1.0',
        basedOn: 'parent-template',
      });

      expect(result.templateDescriptor.basedOn).toBe('parent-template');

      const templateJson = JSON.parse(readFileSync(join(templateDir, 'template.json'), 'utf-8'));
      expect(templateJson.basedOn).toBe('parent-template');
    });
  });
});
