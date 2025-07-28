/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { promises as fs } from 'fs';
import { join, dirname, resolve } from 'path';

export class FileUtils {
  /**
   * Check if a file or directory exists
   */
  static async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read a file and return its contents
   */
  static async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf-8');
  }

  /**
   * Write content to a file, creating directories if necessary
   */
  static async writeFile(path: string, content: string): Promise<void> {
    await this.ensureDirectory(dirname(path));
    await fs.writeFile(path, content, 'utf-8');
  }

  /**
   * Ensure a directory exists, creating it recursively if necessary
   */
  static async ensureDirectory(path: string): Promise<void> {
    try {
      await fs.mkdir(path, { recursive: true });
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Find a file by walking up the directory tree
   */
  static async findFileUpwards(startPath: string, filename: string): Promise<string | null> {
    let currentPath = resolve(startPath);
    const root = resolve('/');

    while (currentPath !== root) {
      const filePath = join(currentPath, filename);
      if (await this.exists(filePath)) {
        return filePath;
      }
      currentPath = dirname(currentPath);
    }

    return null;
  }

  /**
   * Read a JSON file and parse it
   */
  static async readJsonFile<T = unknown>(path: string): Promise<T> {
    const content = await this.readFile(path);
    return JSON.parse(content);
  }

  /**
   * Write an object to a JSON file
   */
  static async writeJsonFile(path: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await this.writeFile(path, content);
  }

  /**
   * Find configuration files based on platform
   */
  static getConfigFilePaths(projectPath: string, platform: string): string[] {
    const paths: string[] = [];

    switch (platform.toLowerCase()) {
      case 'ios':
        paths.push(
          join(projectPath, 'bootconfig.plist'),
          join(projectPath, 'Resources', 'bootconfig.plist')
        );
        break;
      case 'android':
        paths.push(
          join(projectPath, 'res', 'values', 'bootconfig.xml'),
          join(projectPath, 'app', 'src', 'main', 'res', 'values', 'bootconfig.xml')
        );
        break;
      case 'react-native':
      case 'hybrid':
        paths.push(
          join(projectPath, 'bootconfig.json'),
          join(projectPath, 'www', 'bootconfig.json'),
          join(projectPath, 'platforms', 'ios', 'www', 'bootconfig.json'),
          join(projectPath, 'platforms', 'android', 'assets', 'www', 'bootconfig.json')
        );
        break;
    }

    return paths;
  }
}
