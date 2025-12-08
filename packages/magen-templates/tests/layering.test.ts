import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createLayer, materializeTemplate, detectCycle } from '../src/core/layering.js';
import { generateApp } from '../src/core/generator.js';

describe('Template Layering', () => {
  let testDir: string;
  let baseTemplateDir: string;
  let childTemplateDir: string;

  beforeEach(() => {
    // Create unique test directory
    const testId = Math.random().toString(36).substring(7);
    testDir = join(__dirname, '../test-output/layering', testId);

    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Create base template
    baseTemplateDir = join(testDir, 'templates', 'test-base');
    mkdirSync(join(baseTemplateDir, 'template'), { recursive: true });

    const baseTemplateJson = {
      name: 'test-base',
      platform: 'ios',
      version: '1.0.0',
      description: 'Base test template',
      variables: [
        {
          name: 'appName',
          type: 'string',
          required: true,
          description: 'App name',
          default: 'BaseApp',
        },
      ],
    };

    writeFileSync(
      join(baseTemplateDir, 'template.json'),
      JSON.stringify(baseTemplateJson, null, 2)
    );

    const baseFile = `
// Base template file
let appName = "{{appName}}"
let feature = "base"
`;

    writeFileSync(join(baseTemplateDir, 'template', 'App.swift'), baseFile);

    // Create child template directory
    // For layered templates, we use work/ instead of template/
    childTemplateDir = join(testDir, 'templates', 'test-child');
    mkdirSync(join(childTemplateDir, 'work'), { recursive: true });

    const childTemplateJson = {
      name: 'test-child',
      platform: 'ios',
      version: '1.0.0',
      description: 'Child test template',
      basedOn: 'test-base',
      layer: {
        patchFile: 'layer.patch',
      },
      variables: [
        {
          name: 'appName',
          type: 'string',
          required: true,
          description: 'App name',
          default: 'ChildApp',
        },
        {
          name: 'childFeature',
          type: 'string',
          required: false,
          description: 'Child feature',
          default: 'enhanced',
        },
      ],
    };

    writeFileSync(
      join(childTemplateDir, 'template.json'),
      JSON.stringify(childTemplateJson, null, 2)
    );

    // Child template has modified base file
    const childFile = `
// Base template file
let appName = "{{appName}}"
let feature = "child"
let childFeature = "{{childFeature}}"
`;

    writeFileSync(join(childTemplateDir, 'work', 'App.swift'), childFile);

    // Add a new file in child
    const newFile = `
// New file in child template
let newFeature = "{{childFeature}}"
`;

    writeFileSync(join(childTemplateDir, 'work', 'ChildFeature.swift'), newFile);
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('createLayer', () => {
    it('should create a patch file from child template', () => {
      // Note: This test requires base template to be discoverable
      // We'll need to set up MAGEN_TEMPLATES_PATH or copy to a discoverable location
      process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

      const result = createLayer({
        templateName: 'test-child',
        templateDirectory: childTemplateDir,
      });

      expect(result.patchPath).toBe(join(childTemplateDir, 'layer.patch'));
      expect(result.parentTemplate).toBe('test-base');
      expect(result.childTemplate).toBe('test-child');
      expect(existsSync(result.patchPath)).toBe(true);

      // Verify patch content
      const patchContent = readFileSync(result.patchPath, 'utf-8');
      expect(patchContent).toContain('diff');
      expect(patchContent).toContain('App.swift');
    });

    it('should use --based-on parameter if provided', () => {
      process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

      const result = createLayer({
        templateName: 'test-child',
        templateDirectory: childTemplateDir,
        parentTemplateName: 'test-base',
      });

      expect(result.parentTemplate).toBe('test-base');
    });

    it('should throw error if no parent specified', () => {
      // Create template without basedOn
      const standalone = join(testDir, 'templates', 'standalone');
      mkdirSync(join(standalone, 'template'), { recursive: true });
      writeFileSync(
        join(standalone, 'template.json'),
        JSON.stringify(
          { name: 'standalone', platform: 'ios', version: '1.0.0', variables: [] },
          null,
          2
        )
      );

      expect(() => {
        createLayer({
          templateName: 'standalone',
          templateDirectory: standalone,
        });
      }).toThrow('No parent template specified');
    });

    it('should throw error if parent template not found', () => {
      const orphan = join(testDir, 'templates', 'orphan');
      mkdirSync(join(orphan, 'template'), { recursive: true });
      writeFileSync(
        join(orphan, 'template.json'),
        JSON.stringify(
          {
            name: 'orphan',
            platform: 'ios',
            version: '1.0.0',
            basedOn: 'nonexistent',
            variables: [],
          },
          null,
          2
        )
      );

      expect(() => {
        createLayer({
          templateName: 'orphan',
          templateDirectory: orphan,
        });
      }).toThrow('Parent template not found');
    });
  });

  describe('materializeTemplate', () => {
    it('should materialize base template without layers', () => {
      const targetDir = join(testDir, 'materialized-base');
      const baseTemplateJson = JSON.parse(
        readFileSync(join(baseTemplateDir, 'template.json'), 'utf-8')
      );

      materializeTemplate({
        template: baseTemplateJson,
        targetDirectory: targetDir,
        templateDirectory: baseTemplateDir,
      });

      expect(existsSync(join(targetDir, 'App.swift'))).toBe(true);
      const content = readFileSync(join(targetDir, 'App.swift'), 'utf-8');
      expect(content).toContain('feature = "base"');
    });

    it('should materialize layered template with patch applied', () => {
      process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

      // First create the patch
      createLayer({
        templateName: 'test-child',
        templateDirectory: childTemplateDir,
      });

      const targetDir = join(testDir, 'materialized-child');
      const childTemplateJson = JSON.parse(
        readFileSync(join(childTemplateDir, 'template.json'), 'utf-8')
      );

      materializeTemplate({
        template: childTemplateJson,
        targetDirectory: targetDir,
        templateDirectory: childTemplateDir,
      });

      // Should have both files from base and child
      expect(existsSync(join(targetDir, 'App.swift'))).toBe(true);
      expect(existsSync(join(targetDir, 'ChildFeature.swift'))).toBe(true);

      // App.swift should have child's modifications
      const appContent = readFileSync(join(targetDir, 'App.swift'), 'utf-8');
      expect(appContent).toContain('feature = "child"');
      expect(appContent).toContain('childFeature');
    });

    it('should throw error if template files not found', () => {
      const missingTemplate = {
        name: 'missing',
        platform: 'ios' as const,
        version: '1.0.0',
        variables: [],
      };

      expect(() => {
        materializeTemplate({
          template: missingTemplate,
          targetDirectory: join(testDir, 'output'),
          templateDirectory: '/nonexistent/path',
        });
      }).toThrow('Template files not found');
    });
  });

  describe('detectCycle', () => {
    it('should detect direct cycle', () => {
      // Create self-referencing template
      process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');
      const selfRef = join(testDir, 'templates', 'self-ref');
      mkdirSync(join(selfRef, 'template'), { recursive: true });
      writeFileSync(
        join(selfRef, 'template.json'),
        JSON.stringify(
          {
            name: 'self-ref',
            platform: 'ios',
            version: '1.0.0',
            basedOn: 'self-ref',
            variables: [],
          },
          null,
          2
        )
      );

      expect(detectCycle('self-ref')).toBe(true);
    });

    it('should detect indirect cycle', () => {
      process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

      // Create A -> B -> C -> A cycle
      const templateA = join(testDir, 'templates', 'cycle-a');
      mkdirSync(join(templateA, 'template'), { recursive: true });
      writeFileSync(
        join(templateA, 'template.json'),
        JSON.stringify(
          { name: 'cycle-a', platform: 'ios', version: '1.0.0', basedOn: 'cycle-c', variables: [] },
          null,
          2
        )
      );

      const templateB = join(testDir, 'templates', 'cycle-b');
      mkdirSync(join(templateB, 'template'), { recursive: true });
      writeFileSync(
        join(templateB, 'template.json'),
        JSON.stringify(
          { name: 'cycle-b', platform: 'ios', version: '1.0.0', basedOn: 'cycle-a', variables: [] },
          null,
          2
        )
      );

      const templateC = join(testDir, 'templates', 'cycle-c');
      mkdirSync(join(templateC, 'template'), { recursive: true });
      writeFileSync(
        join(templateC, 'template.json'),
        JSON.stringify(
          { name: 'cycle-c', platform: 'ios', version: '1.0.0', basedOn: 'cycle-b', variables: [] },
          null,
          2
        )
      );

      expect(detectCycle('cycle-a')).toBe(true);
    });

    it('should return false for non-cyclic chain', () => {
      process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');
      expect(detectCycle('test-child')).toBe(false);
    });

    it('should return false for non-existent template', () => {
      expect(detectCycle('nonexistent-template')).toBe(false);
    });
  });

  describe('Integration with generateApp', () => {
    it('should generate app from layered template', () => {
      process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

      // Create patch
      createLayer({
        templateName: 'test-child',
        templateDirectory: childTemplateDir,
      });

      const outputDir = join(testDir, 'generated-app');

      generateApp({
        templateName: 'test-child',
        outputDirectory: outputDir,
        variables: {
          appName: 'MyLayeredApp',
          childFeature: 'advanced',
        },
        overwrite: false,
      });

      // Verify files exist
      expect(existsSync(join(outputDir, 'App.swift'))).toBe(true);
      expect(existsSync(join(outputDir, 'ChildFeature.swift'))).toBe(true);

      // Verify content is rendered
      const appContent = readFileSync(join(outputDir, 'App.swift'), 'utf-8');
      expect(appContent).toContain('let appName = "MyLayeredApp"');
      expect(appContent).toContain('feature = "child"');
      expect(appContent).toContain('let childFeature = "advanced"');

      const childContent = readFileSync(join(outputDir, 'ChildFeature.swift'), 'utf-8');
      expect(childContent).toContain('let newFeature = "advanced"');
    });

    it('should reject generation if cycle detected', () => {
      process.env.MAGEN_TEMPLATES_PATH = join(testDir, 'templates');

      // Create self-referencing template
      const selfRef = join(testDir, 'templates', 'self-ref');
      mkdirSync(join(selfRef, 'template'), { recursive: true });
      writeFileSync(
        join(selfRef, 'template.json'),
        JSON.stringify(
          {
            name: 'self-ref',
            platform: 'ios',
            version: '1.0.0',
            basedOn: 'self-ref',
            variables: [],
          },
          null,
          2
        )
      );

      expect(() => {
        generateApp({
          templateName: 'self-ref',
          outputDirectory: join(testDir, 'output'),
          variables: {},
          overwrite: false,
        });
      }).toThrow('Cycle detected');
    });
  });
});
