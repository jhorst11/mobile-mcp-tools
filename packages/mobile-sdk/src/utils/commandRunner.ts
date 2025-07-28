/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { spawn } from 'child_process';

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  error?: Error;
}

export class CommandRunner {
  /**
   * Execute a shell command with proper error handling
   */
  static async run(
    command: string,
    args: string[] = [],
    options: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
      shell?: boolean;
    } = {}
  ): Promise<CommandResult> {
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;

    return new Promise(resolve => {
      let stdout = '';
      let stderr = '';

      const child = spawn(command, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        shell: options.shell || false,
      });

      if (child.stdout) {
        child.stdout.on('data', data => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', data => {
          stderr += data.toString();
        });
      }

      child.on('close', code => {
        const exitCode = code || 0;
        resolve({
          success: exitCode === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode,
          command: fullCommand,
        });
      });

      child.on('error', error => {
        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: error.message,
          exitCode: -1,
          command: fullCommand,
          error,
        });
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          child.kill();
          resolve({
            success: false,
            stdout: stdout.trim(),
            stderr: 'Command timed out',
            exitCode: -1,
            command: fullCommand,
            error: new Error('Command timed out'),
          });
        }, options.timeout);
      }
    });
  }

  /**
   * Check if a command exists in the system PATH
   */
  static async exists(command: string): Promise<boolean> {
    try {
      const result = await this.run('which', [command]);
      return result.success && result.stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get the version of a command by running it with --version flag
   */
  static async getVersion(command: string, versionFlag = '--version'): Promise<string | null> {
    try {
      const result = await this.run(command, [versionFlag]);
      if (result.success) {
        return result.stdout.trim();
      }
      return null;
    } catch {
      return null;
    }
  }
}
