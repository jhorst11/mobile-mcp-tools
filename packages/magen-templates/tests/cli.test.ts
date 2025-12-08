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
    // Create base template (layer 0)
    const baseDir = join(testDir, 'base');
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

    // Create layer 1 template based on base
    const layer1Dir = join(testDir, 'layer1');
    mkdirSync(join(layer1Dir, 'work'), { recursive: true });

    const layer1Template = {
      name: 'layer1',
      platform: 'ios',
      version: '1.0.0',
      basedOn: 'base',
      layer: { patchFile: 'layer.patch' },
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
    const layer2Dir = join(testDir, 'layer2');
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
    expect(layer2TemplateJson.basedOn).toBe('layer1');
    expect(layer2TemplateJson.layer).toEqual({ patchFile: 'layer.patch' });

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
