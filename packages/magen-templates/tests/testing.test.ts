import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  testTemplate,
  getWorkDirectory,
  hasTestInstance,
  watchTemplate,
} from '../src/core/testing.js';
import { createLayer } from '../src/core/layering.js';

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
    };

    const variablesJson = {
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
    writeFileSync(join(templateDir, 'variables.json'), JSON.stringify(variablesJson, null, 2));

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

      expect(result.workDirectory).toBe(join(templateDir, 'test'));
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
    it('should return correct test directory path', () => {
      const testDir = getWorkDirectory(templateDir);
      expect(testDir).toBe(join(templateDir, 'test'));
    });
  });

  describe('hasTestInstance', () => {
    it('should return false when no test instance exists', () => {
      const hasInstance = hasTestInstance(templateDir);
      expect(hasInstance).toBe(false);
    });

    it('should return true when test instance exists', () => {
      testTemplate({
        templateName: 'test-template',
        templateDirectory: templateDir,
      });

      const hasInstance = hasTestInstance(templateDir);
      expect(hasInstance).toBe(true);
    });

    it('should return false when test directory is empty', () => {
      // Create empty test directory
      mkdirSync(join(templateDir, 'test'), { recursive: true });

      const hasInstance = hasTestInstance(templateDir);
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

    it('should use default values for required variables in layered templates', () => {
      // Create base template with variables
      const baseDir = join(testDir, 'base-with-defaults');
      mkdirSync(join(baseDir, 'template'), { recursive: true });

      writeFileSync(
        join(baseDir, 'template.json'),
        JSON.stringify({
          name: 'base-with-defaults',
          platform: 'ios',
          version: '1.0.0',
        })
      );

      const baseVariables = {
        variables: [
          {
            name: 'appName',
            type: 'string',
            required: true,
            default: 'DefaultApp',
          },
          {
            name: 'baseFeature',
            type: 'string',
            required: true,
            default: 'BaseFeature',
          },
        ],
      };

      writeFileSync(join(baseDir, 'variables.json'), JSON.stringify(baseVariables, null, 2));
      writeFileSync(
        join(baseDir, 'template', 'App.txt'),
        'App: {{appName}}\nFeature: {{baseFeature}}'
      );

      // Create layered template
      const layeredDir = join(testDir, 'layered-with-defaults');
      mkdirSync(join(layeredDir, 'work'), { recursive: true });

      writeFileSync(
        join(layeredDir, 'template.json'),
        JSON.stringify({
          name: 'layered-with-defaults',
          platform: 'ios',
          version: '1.0.0',
          basedOn: 'base-with-defaults',
          layer: { patchFile: 'layer.patch' },
        })
      );

      const layeredVariables = {
        variables: [
          ...baseVariables.variables,
          {
            name: 'customTitle',
            type: 'string',
            required: true,
            default: 'Welcome to',
          },
        ],
      };

      writeFileSync(
        join(layeredDir, 'work', 'variables.json'),
        JSON.stringify(layeredVariables, null, 2)
      );
      writeFileSync(
        join(layeredDir, 'work', 'App.txt'),
        'App: {{appName}}\nFeature: {{baseFeature}}\nTitle: {{customTitle}}'
      );

      // Set up discovery
      process.env.MAGEN_TEMPLATES_PATH = testDir;

      // Create layer
      createLayer({
        templateName: 'layered-with-defaults',
        templateDirectory: layeredDir,
        parentTemplateName: 'base-with-defaults',
      });

      // Test the layered template without providing variables
      const result = testTemplate({
        templateName: 'layered-with-defaults',
        templateDirectory: layeredDir,
        variables: {}, // No variables provided - should use defaults
        regenerate: false,
      });

      // Verify defaults were used
      expect(result.variables.appName).toBe('DefaultApp');
      expect(result.variables.baseFeature).toBe('BaseFeature');
      expect(result.variables.customTitle).toBe('Welcome to');

      // Verify output file uses defaults
      const appContent = readFileSync(join(result.workDirectory, 'App.txt'), 'utf-8');
      expect(appContent).toBe('App: DefaultApp\nFeature: BaseFeature\nTitle: Welcome to');
    });
  });

  describe('Watch functionality', () => {
    it('should create initial test instance when watch is started', () => {
      const templateDir = join(testDir, 'watch-test');
      mkdirSync(join(templateDir, 'template'), { recursive: true });

      writeFileSync(
        join(templateDir, 'template.json'),
        JSON.stringify({
          name: 'watch-test',
          platform: 'ios',
          version: '1.0.0',
        })
      );

      const variables = {
        variables: [
          {
            name: 'appName',
            type: 'string',
            required: true,
            default: 'WatchApp',
          },
        ],
      };

      writeFileSync(join(templateDir, 'variables.json'), JSON.stringify(variables));
      writeFileSync(join(templateDir, 'template', 'App.txt'), 'App: {{appName}}');

      // Start watching
      const cleanup = watchTemplate({
        templateName: 'watch-test',
        templateDirectory: templateDir,
        variables: {},
      });

      // Verify test directory was created
      const testDirectory = join(templateDir, 'test');
      expect(existsSync(testDirectory)).toBe(true);
      expect(existsSync(join(testDirectory, 'App.txt'))).toBe(true);

      const content = readFileSync(join(testDirectory, 'App.txt'), 'utf-8');
      expect(content).toBe('App: WatchApp');

      // Cleanup
      cleanup();
    });

    it('should return cleanup function that stops watching', () => {
      const templateDir = join(testDir, 'cleanup-test');
      mkdirSync(join(templateDir, 'template'), { recursive: true });

      writeFileSync(
        join(templateDir, 'template.json'),
        JSON.stringify({
          name: 'cleanup-test',
          platform: 'ios',
          version: '1.0.0',
        })
      );

      writeFileSync(join(templateDir, 'variables.json'), JSON.stringify({ variables: [] }));
      writeFileSync(join(templateDir, 'template', 'test.txt'), 'test');

      const cleanup = watchTemplate({
        templateName: 'cleanup-test',
        templateDirectory: templateDir,
      });

      // Cleanup should be a function
      expect(typeof cleanup).toBe('function');

      // Should not throw when called
      expect(() => cleanup()).not.toThrow();
    });
  });
});
