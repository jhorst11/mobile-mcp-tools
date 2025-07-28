/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import { CommandRunner } from '../../src/utils/commandRunner.js';

describe('CommandRunner', () => {
  it('should execute a simple command successfully', async () => {
    const result = await CommandRunner.run('echo', ['hello']);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe('hello');
    expect(result.exitCode).toBe(0);
    expect(result.command).toBe('echo hello');
  });

  it('should handle command failure', async () => {
    const result = await CommandRunner.run('this-command-does-not-exist');

    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toBeTruthy();
  });

  it('should check if a command exists', async () => {
    const exists = await CommandRunner.exists('echo');
    expect(exists).toBe(true);

    const notExists = await CommandRunner.exists('this-command-does-not-exist');
    expect(notExists).toBe(false);
  });

  it('should get version information', async () => {
    // Most systems have node installed for testing
    const version = await CommandRunner.getVersion('node', '--version');
    expect(version).toBeTruthy();
    expect(version).toMatch(/v?\d+\.\d+\.\d+/);
  });

  it('should handle timeout', async () => {
    const result = await CommandRunner.run('sleep', ['10'], { timeout: 100 });

    expect(result.success).toBe(false);
    expect(result.stderr).toContain('timed out');
  }, 2000);
});
