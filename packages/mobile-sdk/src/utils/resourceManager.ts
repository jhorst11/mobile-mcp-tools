/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { FileUtils } from './fileUtils.js';
import { promises as fs } from 'fs';

export interface ResourceContent {
  content: string;
  mimeType: string;
  size?: number;
}

export class ResourceManager {
  /**
   * Read a resource from a file URI
   */
  static async readResource(uri: string, offset = 0, length?: number): Promise<ResourceContent> {
    // Parse the file URI
    if (!uri.startsWith('file://')) {
      throw new Error('Only file:// URIs are supported');
    }

    const filePath = uri.slice(7); // Remove 'file://' prefix

    // Security check: ensure the file path is safe
    if (filePath.includes('..') || filePath.startsWith('/etc/') || filePath.startsWith('/usr/')) {
      throw new Error('Access to this file path is not allowed');
    }

    // Check if file exists
    if (!(await FileUtils.exists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;

    // Determine mime type based on file extension
    const mimeType = this.getMimeType(filePath);

    // Read the file content
    let content: string;

    if (offset === 0 && length === undefined) {
      // Read entire file
      content = await FileUtils.readFile(filePath);
    } else {
      // Read partial file
      const buffer = Buffer.alloc(length || fileSize - offset);
      const fileHandle = await fs.open(filePath, 'r');

      try {
        const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, offset);
        content = buffer.slice(0, bytesRead).toString('utf-8');
      } finally {
        await fileHandle.close();
      }
    }

    return {
      content,
      mimeType,
      size: fileSize,
    };
  }

  /**
   * Stream a resource (useful for large log files)
   */
  static async *streamResource(uri: string, chunkSize = 1024): AsyncGenerator<string> {
    if (!uri.startsWith('file://')) {
      throw new Error('Only file:// URIs are supported');
    }

    const filePath = uri.slice(7);

    // Security check
    if (filePath.includes('..') || filePath.startsWith('/etc/') || filePath.startsWith('/usr/')) {
      throw new Error('Access to this file path is not allowed');
    }

    if (!(await FileUtils.exists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileHandle = await fs.open(filePath, 'r');
    let position = 0;

    try {
      while (true) {
        const buffer = Buffer.alloc(chunkSize);
        const { bytesRead } = await fileHandle.read(buffer, 0, chunkSize, position);

        if (bytesRead === 0) {
          break; // End of file
        }

        yield buffer.slice(0, bytesRead).toString('utf-8');
        position += bytesRead;
      }
    } finally {
      await fileHandle.close();
    }
  }

  /**
   * Get the last N lines of a log file (useful for tailing logs)
   */
  static async getTailLines(uri: string, numLines = 50): Promise<string[]> {
    if (!uri.startsWith('file://')) {
      throw new Error('Only file:// URIs are supported');
    }

    const filePath = uri.slice(7);

    // Security check
    if (filePath.includes('..') || filePath.startsWith('/etc/') || filePath.startsWith('/usr/')) {
      throw new Error('Access to this file path is not allowed');
    }

    if (!(await FileUtils.exists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = await FileUtils.readFile(filePath);
    const lines = content.split('\n');

    // Return the last N lines (excluding empty last line if file ends with newline)
    const endIndex = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
    const startIndex = Math.max(0, endIndex - numLines);

    return lines.slice(startIndex, endIndex);
  }

  /**
   * Watch a file for changes and return new content
   */
  static async watchFile(
    uri: string,
    callback: (newContent: string) => void,
    pollInterval = 1000
  ): Promise<() => void> {
    if (!uri.startsWith('file://')) {
      throw new Error('Only file:// URIs are supported');
    }

    const filePath = uri.slice(7);
    let lastSize = 0;
    let isWatching = true;

    // Get initial file size
    try {
      const stats = await fs.stat(filePath);
      lastSize = stats.size;
    } catch {
      // File doesn't exist yet, start with size 0
    }

    const poll = async () => {
      if (!isWatching) return;

      try {
        const stats = await fs.stat(filePath);

        if (stats.size > lastSize) {
          // File has grown, read the new content
          const fileHandle = await fs.open(filePath, 'r');
          const buffer = Buffer.alloc(stats.size - lastSize);

          try {
            const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, lastSize);
            const newContent = buffer.slice(0, bytesRead).toString('utf-8');
            callback(newContent);
            lastSize = stats.size;
          } finally {
            await fileHandle.close();
          }
        }
      } catch {
        // File might not exist yet, continue polling
      }

      setTimeout(poll, pollInterval);
    };

    // Start polling
    setTimeout(poll, pollInterval);

    // Return stop function
    return () => {
      isWatching = false;
    };
  }

  /**
   * Determine MIME type based on file extension
   */
  private static getMimeType(filePath: string): string {
    const extension = filePath.toLowerCase().split('.').pop();

    switch (extension) {
      case 'txt':
      case 'log':
        return 'text/plain';
      case 'json':
        return 'application/json';
      case 'xml':
        return 'application/xml';
      case 'html':
      case 'htm':
        return 'text/html';
      case 'css':
        return 'text/css';
      case 'js':
        return 'text/javascript';
      case 'ts':
        return 'text/typescript';
      case 'md':
        return 'text/markdown';
      case 'yaml':
      case 'yml':
        return 'text/yaml';
      default:
        return 'text/plain';
    }
  }

  /**
   * List available resources in a directory
   */
  static async listResources(
    directoryUri: string
  ): Promise<Array<{ name: string; uri: string; type: string }>> {
    if (!directoryUri.startsWith('file://')) {
      throw new Error('Only file:// URIs are supported');
    }

    const directoryPath = directoryUri.slice(7);

    // Security check
    if (
      directoryPath.includes('..') ||
      directoryPath.startsWith('/etc/') ||
      directoryPath.startsWith('/usr/')
    ) {
      throw new Error('Access to this directory path is not allowed');
    }

    if (!(await FileUtils.exists(directoryPath))) {
      throw new Error(`Directory not found: ${directoryPath}`);
    }

    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const resources = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const uri = `file://${directoryPath}/${entry.name}`;
        const mimeType = this.getMimeType(entry.name);

        resources.push({
          name: entry.name,
          uri,
          type: mimeType,
        });
      }
    }

    return resources;
  }
}
