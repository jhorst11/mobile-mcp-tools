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
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_PATH = join(__dirname, '../dist/cli/index.js');

describe('CLI Bootstrap', () => {
  it('should show help with --help flag', () => {
    const output = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });
    expect(output).toContain('magen-template');
    expect(output).toContain('Usage:');
    expect(output).toContain('Commands:');
    expect(output).toContain('list');
    expect(output).toContain('show');
    expect(output).toContain('generate');
  });

  it('should show help with -h flag', () => {
    const output = execSync(`node ${CLI_PATH} -h`, { encoding: 'utf-8' });
    expect(output).toContain('magen-template');
    expect(output).toContain('Usage:');
  });

  it('should show help when no arguments provided', () => {
    const output = execSync(`node ${CLI_PATH}`, { encoding: 'utf-8' });
    expect(output).toContain('magen-template');
    expect(output).toContain('Usage:');
  });

  it('should show version with --version flag', () => {
    const output = execSync(`node ${CLI_PATH} --version`, { encoding: 'utf-8' });
    expect(output).toMatch(/magen-template v\d+\.\d+\.\d+/);
  });

  it('should show version with -v flag', () => {
    const output = execSync(`node ${CLI_PATH} -v`, { encoding: 'utf-8' });
    expect(output).toMatch(/magen-template v\d+\.\d+\.\d+/);
  });

  it('should exit with code 0 for --help', () => {
    expect(() => {
      execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });
    }).not.toThrow();
  });

  it('should exit with code 0 for --version', () => {
    expect(() => {
      execSync(`node ${CLI_PATH} --version`, { encoding: 'utf-8' });
    }).not.toThrow();
  });

  it('should exit with code 1 for unknown command', () => {
    expect(() => {
      execSync(`node ${CLI_PATH} unknown-command`, { encoding: 'utf-8', stdio: 'pipe' });
    }).toThrow();
  });
});

describe('List Command', () => {
  it('should list all templates', () => {
    const output = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });
    expect(output).toContain('Available Templates:');
    expect(output).toContain('ios-base');
  });

  it('should show template names in color (ANSI codes)', () => {
    const output = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });
    // Check for cyan color code (36m) around template names
    expect(output).toMatch(/\[36m.*\[0m/);
  });

  it('should show inheritance tree with connectors', () => {
    const output = execSync(`node ${CLI_PATH} list`, { encoding: 'utf-8' });
    expect(output).toContain('Based on:');
    expect(output).toContain('└─');
  });

  it('should filter by platform', () => {
    const output = execSync(`node ${CLI_PATH} list --platform ios`, { encoding: 'utf-8' });
    expect(output).toContain('ios-base');
  });

  it('should filter by single tag', () => {
    const output = execSync(`node ${CLI_PATH} list --tag salesforce`, { encoding: 'utf-8' });
    expect(output).toContain('ios-mobilesdk');
    // Count how many times ios-base appears as a top-level template heading
    // It should appear in tree but not as "  ios-base (ios)"
    const lines = output.split('\n');
    const baseAsMainTemplate = lines.some(line => line.match(/^\s{2}.*ios-base.*\(ios\)/));
    expect(baseAsMainTemplate).toBe(false);
  });

  it('should filter by multiple tags using comma-separated values', () => {
    const output = execSync(`node ${CLI_PATH} list --tag ios,mobile-sdk`, { encoding: 'utf-8' });
    expect(output).toContain('ios-mobilesdk');
    expect(output).toContain('ios-mobilesdk-login');
    // Verify ios-base is NOT shown as a main template (only in tree)
    const lines = output.split('\n');
    const baseAsMainTemplate = lines.some(line => line.match(/^\s{2}.*ios-base.*\(ios\)/));
    expect(baseAsMainTemplate).toBe(false);
  });

  it('should filter by multiple tags using multiple --tag flags', () => {
    const output = execSync(`node ${CLI_PATH} list --tag ios --tag swift --tag salesforce`, {
      encoding: 'utf-8',
    });
    expect(output).toContain('ios-mobilesdk');
    // Verify ios-base is NOT shown as a main template
    const lines = output.split('\n');
    const baseAsMainTemplate = lines.some(line => line.match(/^\s{2}.*ios-base.*\(ios\)/));
    expect(baseAsMainTemplate).toBe(false);
  });

  it('should handle whitespace in comma-separated tags', () => {
    const output = execSync(`node ${CLI_PATH} list --tag "ios, mobile-sdk"`, { encoding: 'utf-8' });
    expect(output).toContain('ios-mobilesdk');
  });

  it('should show full inheritance tree even when parent does not match filter', () => {
    const output = execSync(`node ${CLI_PATH} list --tag login-customization`, {
      encoding: 'utf-8',
    });
    expect(output).toContain('ios-mobilesdk-login');
    // Should show full tree including ios-mobilesdk and ios-base
    expect(output).toContain('└─');
    expect(output).toContain('ios-mobilesdk');
    expect(output).toContain('ios-base');
  });

  it('should combine platform and tag filters', () => {
    const output = execSync(`node ${CLI_PATH} list --platform ios --tag salesforce`, {
      encoding: 'utf-8',
    });
    expect(output).toContain('ios-mobilesdk');
  });

  it('should show "No templates found" when filters match nothing', () => {
    const output = execSync(`node ${CLI_PATH} list --tag nonexistent-tag`, { encoding: 'utf-8' });
    expect(output).toContain('No templates found');
  });

  it('should show help for list command', () => {
    const output = execSync(`node ${CLI_PATH} list --help`, { encoding: 'utf-8' });
    expect(output).toContain('List available templates');
    expect(output).toContain('--platform');
    expect(output).toContain('--tag');
  });
});

describe('Show Command', () => {
  it('should show template details', () => {
    const output = execSync(`node ${CLI_PATH} show ios-base`, { encoding: 'utf-8' });
    expect(output).toContain('Template: ios-base');
    expect(output).toContain('Platform: ios');
    expect(output).toContain('Variables:');
  });

  it('should show inheritance information for layered templates', () => {
    const output = execSync(`node ${CLI_PATH} show ios-mobilesdk`, { encoding: 'utf-8' });
    expect(output).toContain('Template: ios-mobilesdk');
    expect(output).toContain('Based on: ios-base');
  });

  it('should show tags if present', () => {
    const output = execSync(`node ${CLI_PATH} show ios-mobilesdk`, { encoding: 'utf-8' });
    expect(output).toContain('Tags:');
    expect(output).toContain('salesforce');
  });

  it('should error on non-existent template', () => {
    expect(() => {
      execSync(`node ${CLI_PATH} show nonexistent-template`, { encoding: 'utf-8', stdio: 'pipe' });
    }).toThrow();
  });
});

describe('Template Diff Command', () => {
  it('should show layer.patch for layered template', () => {
    const output = execSync(`node ${CLI_PATH} template diff ios-mobilesdk`, { encoding: 'utf-8' });
    expect(output).toContain('Showing layer patch for:');
    expect(output).toContain('ios-mobilesdk');
    expect(output).toContain('Based on:');
    expect(output).toContain('ios-base');
    expect(output).toContain('Patch file:');
    expect(output).toContain('layer.patch');
    expect(output).toContain('diff --git');
  });

  it('should show layer.patch for multi-level layered template', () => {
    const output = execSync(`node ${CLI_PATH} template diff ios-mobilesdk-login`, {
      encoding: 'utf-8',
    });
    expect(output).toContain('ios-mobilesdk-login');
    expect(output).toContain('Based on: ');
    expect(output).toContain('ios-mobilesdk');
  });

  it('should error on base template (not layered)', () => {
    expect(() => {
      execSync(`node ${CLI_PATH} template diff ios-base`, { encoding: 'utf-8', stdio: 'pipe' });
    }).toThrow();
  });

  it('should show help for diff command', () => {
    const output = execSync(`node ${CLI_PATH} template diff --help`, { encoding: 'utf-8' });
    expect(output).toContain('Show the layer.patch diff for a layered template');
  });
});

describe('Template Command Group', () => {
  it('should show template subcommands in help', () => {
    const output = execSync(`node ${CLI_PATH} template --help`, { encoding: 'utf-8' });
    expect(output).toContain('create');
    expect(output).toContain('test');
    expect(output).toContain('layer');
    expect(output).toContain('materialize');
    expect(output).toContain('diff');
    expect(output).toContain('validate');
  });
});

describe('Generate Command', () => {
  let testDir: string;

  beforeEach(() => {
    const testId = Math.random().toString(36).substring(7);
    testDir = join(__dirname, '../test-output/cli-generate', testId);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should require --out option', () => {
    expect(() => {
      execSync(`node ${CLI_PATH} generate ios-base`, { encoding: 'utf-8', stdio: 'pipe' });
    }).toThrow();
  });

  it('should generate from base template', () => {
    const outputDir = join(testDir, 'output');
    const output = execSync(`node ${CLI_PATH} generate ios-base --out ${outputDir}`, {
      encoding: 'utf-8',
    });
    expect(output).toContain('Generating ios-base');
    expect(output).toContain('✓ App generated successfully!');
    expect(existsSync(outputDir)).toBe(true);
  });

  it('should accept variables with --var flag', () => {
    const outputDir = join(testDir, 'output-vars');
    const output = execSync(
      `node ${CLI_PATH} generate ios-base --out ${outputDir} --var appName=TestApp --var organizationName="Test Org"`,
      { encoding: 'utf-8' }
    );
    expect(output).toContain('Variables used:');
    expect(output).toContain('appName: TestApp');
    expect(output).toContain('organizationName: Test Org');
  });

  it('should parse boolean variables', () => {
    const outputDir = join(testDir, 'output-bool');
    const output = execSync(
      `node ${CLI_PATH} generate ios-base --out ${outputDir} --var appName=TestApp --var debugMode=true`,
      { encoding: 'utf-8' }
    );
    expect(output).toContain('✓ App generated successfully!');
  });

  it('should parse number variables', () => {
    const outputDir = join(testDir, 'output-num');
    const output = execSync(
      `node ${CLI_PATH} generate ios-base --out ${outputDir} --var appName=TestApp --var version=42`,
      { encoding: 'utf-8' }
    );
    expect(output).toContain('✓ App generated successfully!');
  });

  it('should support --overwrite flag', () => {
    const outputDir = join(testDir, 'output-overwrite');
    // Generate first time
    execSync(`node ${CLI_PATH} generate ios-base --out ${outputDir}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    // Generate again with overwrite
    const output = execSync(`node ${CLI_PATH} generate ios-base --out ${outputDir} --overwrite`, {
      encoding: 'utf-8',
    });
    expect(output).toContain('✓ App generated successfully!');
  });
});

describe('Template Create - Multi-Layer Inheritance', () => {
  let testDir: string;

  beforeEach(() => {
    // Create unique test directory
    const testId = Math.random().toString(36).substring(7);
    testDir = join(__dirname, '../test-output/cli-create', testId);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create layered template based on another layered template with variable inheritance', () => {
    // Create base template (layer 0) with version directory
    const baseDir = join(testDir, 'base', '1.0.0');
    mkdirSync(join(baseDir, 'template'), { recursive: true });

    const baseTemplate = {
      name: 'base',
      platform: 'ios',
      version: '1.0.0',
    };

    const baseVariables = {
      variables: [
        {
          name: 'appName',
          type: 'string',
          required: true,
          default: 'BaseApp',
        },
        {
          name: 'baseFeature',
          type: 'string',
          required: false,
          default: 'BaseFeature',
        },
      ],
    };

    writeFileSync(join(baseDir, 'template.json'), JSON.stringify(baseTemplate, null, 2));
    writeFileSync(join(baseDir, 'variables.json'), JSON.stringify(baseVariables, null, 2));
    writeFileSync(join(baseDir, 'template', 'App.txt'), 'App: {{appName}}\nBase: {{baseFeature}}');

    // Create layer 1 template based on base with version directory
    const layer1Dir = join(testDir, 'layer1', '1.0.0');
    mkdirSync(join(layer1Dir, 'work'), { recursive: true });

    const layer1Template = {
      name: 'layer1',
      platform: 'ios',
      version: '1.0.0',
      extends: {
        template: 'base',
        version: '1.0.0',
        patchFile: 'layer.patch',
      },
    };

    writeFileSync(join(layer1Dir, 'template.json'), JSON.stringify(layer1Template, null, 2));

    // Add a new variable in layer 1
    const layer1Variables = {
      variables: [
        ...baseVariables.variables,
        {
          name: 'layer1Feature',
          type: 'string',
          required: false,
          default: 'Layer1Feature',
        },
      ],
    };

    writeFileSync(
      join(layer1Dir, 'work', 'variables.json'),
      JSON.stringify(layer1Variables, null, 2)
    );
    writeFileSync(
      join(layer1Dir, 'work', 'App.txt'),
      'App: {{appName}}\nBase: {{baseFeature}}\nLayer1: {{layer1Feature}}'
    );

    // Create layer 1 patch
    process.env.MAGEN_TEMPLATES_PATH = testDir;
    execSync(`node ${CLI_PATH} template layer layer1 --out ${layer1Dir}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    // Now create layer 2 based on layer 1 using CLI
    const layer2Dir = join(testDir, 'layer2', '1.0.0');
    const output = execSync(
      `node ${CLI_PATH} template create layer2 --based-on layer1 --out ${layer2Dir}`,
      { encoding: 'utf-8' }
    );

    // Verify CLI output
    expect(output).toContain('✓ Found parent template: layer1');
    expect(output).toContain('Parent is a layered template - materializing...');
    expect(output).toContain('✓ Copied materialized parent template files to work/');
    expect(output).toContain('✓ Template created successfully!');

    // Verify template.json was created
    expect(existsSync(join(layer2Dir, 'template.json'))).toBe(true);
    const layer2TemplateJson = JSON.parse(readFileSync(join(layer2Dir, 'template.json'), 'utf-8'));
    expect(layer2TemplateJson.name).toBe('layer2');
    expect(layer2TemplateJson.extends?.template).toBe('layer1');
    expect(layer2TemplateJson.extends?.patchFile).toBe('layer.patch');

    // Verify work directory has materialized files from layer1 (which includes base + layer1)
    expect(existsSync(join(layer2Dir, 'work', 'App.txt'))).toBe(true);
    const appContent = readFileSync(join(layer2Dir, 'work', 'App.txt'), 'utf-8');
    expect(appContent).toBe('App: {{appName}}\nBase: {{baseFeature}}\nLayer1: {{layer1Feature}}');

    // Verify variables.json includes all variables from base and layer1
    expect(existsSync(join(layer2Dir, 'work', 'variables.json'))).toBe(true);
    const layer2Variables = JSON.parse(
      readFileSync(join(layer2Dir, 'work', 'variables.json'), 'utf-8')
    );
    expect(layer2Variables.variables).toHaveLength(3);
    expect(layer2Variables.variables.map((v: { name: string }) => v.name)).toEqual([
      'appName',
      'baseFeature',
      'layer1Feature',
    ]);

    // Now add a layer2 variable and create the patch
    const layer2VariablesUpdated = {
      variables: [
        ...layer2Variables.variables,
        {
          name: 'layer2Feature',
          type: 'string',
          required: false,
          default: 'Layer2Feature',
        },
      ],
    };

    writeFileSync(
      join(layer2Dir, 'work', 'variables.json'),
      JSON.stringify(layer2VariablesUpdated, null, 2)
    );
    writeFileSync(
      join(layer2Dir, 'work', 'App.txt'),
      'App: {{appName}}\nBase: {{baseFeature}}\nLayer1: {{layer1Feature}}\nLayer2: {{layer2Feature}}'
    );

    // Create layer 2 patch
    execSync(`node ${CLI_PATH} template layer layer2 --out ${layer2Dir}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    // Verify the patch was created
    expect(existsSync(join(layer2Dir, 'layer.patch'))).toBe(true);

    // Test that we can generate from layer2 and all variables work
    const outputDir = join(testDir, 'output');
    execSync(`node ${CLI_PATH} generate layer2 --out ${outputDir}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    // Verify all variables were rendered with defaults
    const generatedContent = readFileSync(join(outputDir, 'App.txt'), 'utf-8');
    expect(generatedContent).toBe(
      'App: BaseApp\nBase: BaseFeature\nLayer1: Layer1Feature\nLayer2: Layer2Feature'
    );
  });
});
