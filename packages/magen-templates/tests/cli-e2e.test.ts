/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_PATH = join(__dirname, '../dist/cli/index.js');

/**
 * End-to-End CLI Tests
 *
 * These tests simulate realistic user workflows from start to finish,
 * including template discovery via the `list` command.
 */
describe('CLI End-to-End Workflows', () => {
  let testDir: string;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Create unique test directory
    const randomId = Math.random().toString(36).substring(2, 8);
    testDir = join(__dirname, '../test-output/cli-e2e', randomId);
    mkdirSync(testDir, { recursive: true });

    // Save original MAGEN_TEMPLATES_PATH
    originalEnv = process.env.MAGEN_TEMPLATES_PATH;

    // Set MAGEN_TEMPLATES_PATH to our test directory so CLI discovers our test templates
    process.env.MAGEN_TEMPLATES_PATH = testDir;
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.MAGEN_TEMPLATES_PATH = originalEnv;
    } else {
      delete process.env.MAGEN_TEMPLATES_PATH;
    }

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Template Creation and Discovery Workflow', () => {
    it('should create a base template and discover it via list command', () => {
      // Step 1: Create a base template using CLI
      const output = execSync(
        `node ${CLI_PATH} template create my-base --platform ios --out ${testDir}`,
        { encoding: 'utf-8' }
      );

      // Verify CLI output
      expect(output).toContain('Creating template: my-base');
      expect(output).toContain('Platform: ios');
      expect(output).toContain('Version: 1.0.0');
      expect(output).toContain('✓ Template created successfully!');

      // Step 2: Verify template structure was created correctly
      const templateDir = join(testDir, 'my-base', '1.0.0');
      expect(existsSync(templateDir)).toBe(true);
      expect(existsSync(join(templateDir, 'template.json'))).toBe(true);
      expect(existsSync(join(templateDir, 'variables.json'))).toBe(true);
      expect(existsSync(join(templateDir, 'template'))).toBe(true);
      expect(existsSync(join(templateDir, 'README.md'))).toBe(true);

      // Step 3: Verify template.json has correct structure
      const templateJson = JSON.parse(readFileSync(join(templateDir, 'template.json'), 'utf-8'));
      expect(templateJson.name).toBe('my-base');
      expect(templateJson.version).toBe('1.0.0');
      expect(templateJson.platform).toBe('ios');
      expect(templateJson.extends).toBeUndefined(); // Base template should not have extends

      // Step 4: List templates and verify our new template appears
      const listOutput = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });
      expect(listOutput).toContain('Available Templates:');
      expect(listOutput).toContain('my-base');
      expect(listOutput).toContain('(ios)');
    });

    it('should create a base template with custom version', () => {
      // Create template with custom version
      execSync(
        `node ${CLI_PATH} template create my-base --platform ios --template-version 2.5.3 --out ${testDir}`,
        { encoding: 'utf-8' }
      );

      // Verify versioned directory was created
      const templateDir = join(testDir, 'my-base', '2.5.3');
      expect(existsSync(templateDir)).toBe(true);

      // Verify template.json has correct version
      const templateJson = JSON.parse(readFileSync(join(templateDir, 'template.json'), 'utf-8'));
      expect(templateJson.version).toBe('2.5.3');

      // Verify it appears in list
      const listOutput = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });
      expect(listOutput).toContain('my-base');
    });

    it('should reject invalid version format', () => {
      expect(() => {
        execSync(
          `node ${CLI_PATH} template create my-base --platform ios --template-version 1.0 --out ${testDir}`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });
  });

  describe('Layered Template Creation and Discovery Workflow', () => {
    it('should create base template, then layered template, and discover both', () => {
      // Step 1: Create base template
      execSync(`node ${CLI_PATH} template create my-base --platform ios --out ${testDir}`, {
        encoding: 'utf-8',
      });

      // Add a simple file to the base template
      const baseTemplateDir = join(testDir, 'my-base', '1.0.0', 'template');
      writeFileSync(join(baseTemplateDir, 'App.txt'), 'Hello from {{appName}}');

      // Step 2: Create layered template based on my-base
      const layerOutput = execSync(
        `node ${CLI_PATH} template create my-layer --based-on my-base --platform ios --out ${testDir}`,
        { encoding: 'utf-8' }
      );

      // Verify CLI output
      expect(layerOutput).toContain('Creating template: my-layer');
      expect(layerOutput).toContain('Based on: my-base');
      expect(layerOutput).toContain('✓ Found parent template: my-base');
      expect(layerOutput).toContain('✓ Copied parent template files to work/ directory');
      expect(layerOutput).toContain('✓ Template created successfully!');

      // Step 3: Verify layered template structure
      const layerTemplateDir = join(testDir, 'my-layer', '1.0.0');
      expect(existsSync(layerTemplateDir)).toBe(true);
      expect(existsSync(join(layerTemplateDir, 'template.json'))).toBe(true);
      expect(existsSync(join(layerTemplateDir, 'layer.patch'))).toBe(true);
      expect(existsSync(join(layerTemplateDir, 'work'))).toBe(true);
      expect(existsSync(join(layerTemplateDir, 'work', 'App.txt'))).toBe(true);

      // Step 4: Verify template.json has extends configuration
      const layerTemplateJson = JSON.parse(
        readFileSync(join(layerTemplateDir, 'template.json'), 'utf-8')
      );
      expect(layerTemplateJson.name).toBe('my-layer');
      expect(layerTemplateJson.version).toBe('1.0.0');
      expect(layerTemplateJson.extends).toBeDefined();
      expect(layerTemplateJson.extends.template).toBe('my-base');
      expect(layerTemplateJson.extends.version).toBe('1.0.0');
      expect(layerTemplateJson.extends.patchFile).toBe('layer.patch');

      // Step 5: Modify the work directory
      writeFileSync(
        join(layerTemplateDir, 'work', 'App.txt'),
        'Hello from {{appName}} with Layer!'
      );

      // Step 6: Generate layer patch using template name (not path)
      const patchOutput = execSync(`node ${CLI_PATH} template layer my-layer`, {
        encoding: 'utf-8',
      });

      expect(patchOutput).toContain('✓ Layer patch created successfully!');
      expect(patchOutput).toContain('Parent template: my-base@1.0.0');
      expect(patchOutput).toContain('Child template: my-layer');

      // Verify patch was created
      const patchContent = readFileSync(join(layerTemplateDir, 'layer.patch'), 'utf-8');
      expect(patchContent).toContain('App.txt');
      expect(patchContent).toContain('with Layer');

      // Step 7: List templates and verify both appear with inheritance tree
      const listOutput = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });
      expect(listOutput).toContain('my-base');
      expect(listOutput).toContain('my-layer');
      expect(listOutput).toContain('Based on:');
      expect(listOutput).toContain('my-base@1.0.0');
    });

    it('should test layered template using template name', () => {
      // Create base template
      execSync(`node ${CLI_PATH} template create my-base --platform ios --out ${testDir}`, {
        encoding: 'utf-8',
      });

      const baseTemplateDir = join(testDir, 'my-base', '1.0.0', 'template');
      writeFileSync(join(baseTemplateDir, 'App.txt'), 'Base: {{appName}}');

      // Create layered template
      execSync(
        `node ${CLI_PATH} template create my-layer --based-on my-base --platform ios --out ${testDir}`,
        { encoding: 'utf-8' }
      );

      const layerTemplateDir = join(testDir, 'my-layer', '1.0.0');
      writeFileSync(join(layerTemplateDir, 'work', 'App.txt'), 'Layer: {{appName}}');

      // Generate patch
      execSync(`node ${CLI_PATH} template layer my-layer`, { encoding: 'utf-8' });

      // Test the template using just the template name (not path)
      const testCmdOutput = execSync(
        `node ${CLI_PATH} template test my-layer --var appName=TestApp`,
        { encoding: 'utf-8' }
      );

      expect(testCmdOutput).toContain('✓ Test instance created successfully!');
      expect(testCmdOutput).toContain('appName: TestApp');

      // Verify test output has the layered content
      const testOutputDir = join(layerTemplateDir, 'test');
      expect(existsSync(testOutputDir)).toBe(true);
      const testAppContent = readFileSync(join(testOutputDir, 'App.txt'), 'utf-8');
      expect(testAppContent).toBe('Layer: TestApp');
    });
  });

  describe('Multi-Layer Template Workflow', () => {
    it('should create 3-layer template hierarchy and discover all layers', () => {
      // Layer 1: Base template
      execSync(`node ${CLI_PATH} template create layer1-base --platform ios --out ${testDir}`, {
        encoding: 'utf-8',
      });

      const layer1Dir = join(testDir, 'layer1-base', '1.0.0');
      writeFileSync(join(layer1Dir, 'template', 'App.txt'), 'Layer1: {{var1}}');
      writeFileSync(
        join(layer1Dir, 'variables.json'),
        JSON.stringify({
          variables: [{ name: 'var1', type: 'string', required: true, description: 'Variable 1' }],
        })
      );

      // Layer 2: Based on Layer 1
      execSync(
        `node ${CLI_PATH} template create layer2-mid --based-on layer1-base --platform ios --out ${testDir}`,
        { encoding: 'utf-8' }
      );

      const layer2Dir = join(testDir, 'layer2-mid', '1.0.0');
      writeFileSync(join(layer2Dir, 'work', 'App.txt'), 'Layer2: {{var1}} {{var2}}');

      // Add a new variable to layer 2
      const layer2Vars = JSON.parse(
        readFileSync(join(layer2Dir, 'work', 'variables.json'), 'utf-8')
      );
      layer2Vars.variables.push({
        name: 'var2',
        type: 'string',
        required: true,
        description: 'Variable 2',
      });
      writeFileSync(join(layer2Dir, 'work', 'variables.json'), JSON.stringify(layer2Vars, null, 2));

      execSync(`node ${CLI_PATH} template layer layer2-mid`, { encoding: 'utf-8' });

      // Layer 3: Based on Layer 2
      execSync(
        `node ${CLI_PATH} template create layer3-top --based-on layer2-mid --platform ios --out ${testDir}`,
        { encoding: 'utf-8' }
      );

      const layer3Dir = join(testDir, 'layer3-top', '1.0.0');
      writeFileSync(join(layer3Dir, 'work', 'App.txt'), 'Layer3: {{var1}} {{var2}} {{var3}}');

      const layer3Vars = JSON.parse(
        readFileSync(join(layer3Dir, 'work', 'variables.json'), 'utf-8')
      );
      layer3Vars.variables.push({
        name: 'var3',
        type: 'string',
        required: true,
        description: 'Variable 3',
      });
      writeFileSync(join(layer3Dir, 'work', 'variables.json'), JSON.stringify(layer3Vars, null, 2));

      execSync(`node ${CLI_PATH} template layer layer3-top`, { encoding: 'utf-8' });

      // List templates and verify all 3 layers with full inheritance tree
      const listOutput = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });

      expect(listOutput).toContain('layer1-base');
      expect(listOutput).toContain('layer2-mid');
      expect(listOutput).toContain('layer3-top');

      // Verify layer3-top shows full inheritance chain
      // The inheritance tree is shown under "Based on:" section
      expect(listOutput).toContain('layer2-mid@1.0.0');
      expect(listOutput).toContain('layer1-base@1.0.0');

      // Generate from top layer and verify all variables are inherited
      const generateOutput = join(testDir, 'generated-app');
      execSync(
        `node ${CLI_PATH} generate layer3-top --out ${generateOutput} --var var1=V1 --var var2=V2 --var var3=V3`,
        { encoding: 'utf-8' }
      );

      const generatedContent = readFileSync(join(generateOutput, 'App.txt'), 'utf-8');
      expect(generatedContent).toBe('Layer3: V1 V2 V3');
    });
  });

  describe('Template Versioning Workflow', () => {
    it('should create multiple versions of a template and list shows latest', () => {
      // Create version 1.0.0
      execSync(
        `node ${CLI_PATH} template create my-template --platform ios --template-version 1.0.0 --out ${testDir}`,
        { encoding: 'utf-8' }
      );

      // Create version 1.1.0
      execSync(
        `node ${CLI_PATH} template create my-template --platform ios --template-version 1.1.0 --out ${testDir}`,
        { encoding: 'utf-8' }
      );

      // Create version 2.0.0
      execSync(
        `node ${CLI_PATH} template create my-template --platform ios --template-version 2.0.0 --out ${testDir}`,
        { encoding: 'utf-8' }
      );

      // Verify all versions exist
      expect(existsSync(join(testDir, 'my-template', '1.0.0'))).toBe(true);
      expect(existsSync(join(testDir, 'my-template', '1.1.0'))).toBe(true);
      expect(existsSync(join(testDir, 'my-template', '2.0.0'))).toBe(true);

      // List should show the template (uses latest version by default)
      const listOutput = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });
      expect(listOutput).toContain('my-template');

      // Show command should show latest version (2.0.0)
      const showOutput = execSync(`node ${CLI_PATH} show my-template`, { encoding: 'utf-8' });
      expect(showOutput).toContain('Version: 2.0.0');
    });
  });

  describe('Template Discovery Edge Cases', () => {
    it('should not discover templates without version directories', () => {
      // Create a template with incorrect structure (no version directory)
      const badTemplateDir = join(testDir, 'bad-template');
      mkdirSync(badTemplateDir, { recursive: true });
      writeFileSync(
        join(badTemplateDir, 'template.json'),
        JSON.stringify({ name: 'bad-template', platform: 'ios', version: '1.0.0' })
      );

      // List should not show the bad template
      const listOutput = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });
      expect(listOutput).not.toContain('bad-template');
    });

    it('should not discover templates with invalid version directory names', () => {
      // Create template with non-semver version directory
      const badVersionDir = join(testDir, 'bad-version-template', 'v1.0.0'); // Invalid: has 'v' prefix
      mkdirSync(badVersionDir, { recursive: true });
      writeFileSync(
        join(badVersionDir, 'template.json'),
        JSON.stringify({ name: 'bad-version-template', platform: 'ios', version: 'v1.0.0' })
      );

      // List should not show the template
      const listOutput = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });
      expect(listOutput).not.toContain('bad-version-template');
    });

    it('should handle empty template directories gracefully', () => {
      // Create empty directory
      mkdirSync(join(testDir, 'empty-dir'), { recursive: true });

      // List should not crash
      const listOutput = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });
      expect(listOutput).toContain('Available Templates:');
    });
  });

  describe('Complete User Journey', () => {
    it('should simulate complete template development workflow', () => {
      // 1. User creates a new base template
      console.log('Step 1: Creating base template...');
      execSync(`node ${CLI_PATH} template create my-app --platform ios --out ${testDir}`, {
        encoding: 'utf-8',
      });

      // 2. User adds content to the template
      console.log('Step 2: Adding content to template...');
      const baseTemplateDir = join(testDir, 'my-app', '1.0.0', 'template');
      writeFileSync(join(baseTemplateDir, 'README.md'), '# {{appName}}\n\nWelcome to {{appName}}!');

      // 3. User tests the template
      console.log('Step 3: Testing template...');
      execSync(`node ${CLI_PATH} template test my-app --var appName=TestApp`, {
        encoding: 'utf-8',
      });

      const testOutput = join(testDir, 'my-app', '1.0.0', 'test', 'README.md');
      expect(existsSync(testOutput)).toBe(true);
      expect(readFileSync(testOutput, 'utf-8')).toContain('# TestApp');

      // 4. User creates a feature extension
      console.log('Step 4: Creating feature layer...');
      execSync(
        `node ${CLI_PATH} template create my-app-auth --based-on my-app --platform ios --out ${testDir}`,
        { encoding: 'utf-8' }
      );

      // 5. User modifies the feature layer
      console.log('Step 5: Modifying feature layer...');
      const featureWorkDir = join(testDir, 'my-app-auth', '1.0.0', 'work');
      writeFileSync(
        join(featureWorkDir, 'README.md'),
        '# {{appName}}\n\nWelcome to {{appName}}!\n\n## Authentication\n\nThis app has auth!'
      );

      // 6. User generates the patch
      console.log('Step 6: Generating patch...');
      execSync(`node ${CLI_PATH} template layer my-app-auth`, { encoding: 'utf-8' });

      // 7. User tests the layered template
      console.log('Step 7: Testing layered template...');
      execSync(`node ${CLI_PATH} template test my-app-auth --regenerate --var appName=AuthApp`, {
        encoding: 'utf-8',
      });

      const layerTestOutput = join(testDir, 'my-app-auth', '1.0.0', 'test', 'README.md');
      const layerTestContent = readFileSync(layerTestOutput, 'utf-8');
      expect(layerTestContent).toContain('# AuthApp');
      expect(layerTestContent).toContain('Authentication');

      // 8. User lists templates to verify both are available
      console.log('Step 8: Listing all templates...');
      const listOutput = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });
      expect(listOutput).toContain('my-app');
      expect(listOutput).toContain('my-app-auth');
      expect(listOutput).toContain('Based on:');

      // 9. User generates a real app from the layered template
      console.log('Step 9: Generating final app...');
      const finalOutput = join(testDir, 'MyAuthApp');
      execSync(
        `node ${CLI_PATH} generate my-app-auth --out ${finalOutput} --var appName=MyAuthApp`,
        { encoding: 'utf-8' }
      );

      expect(existsSync(join(finalOutput, 'README.md'))).toBe(true);
      const finalContent = readFileSync(join(finalOutput, 'README.md'), 'utf-8');
      expect(finalContent).toContain('# MyAuthApp');
      expect(finalContent).toContain('Authentication');

      console.log('✓ Complete workflow successful!');
    });
  });
});
