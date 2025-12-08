/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
