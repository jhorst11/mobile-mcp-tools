/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Generates the next available feature ID in the format XXX-feature-name
 * @param projectPath Path to the project directory
 * @param featureName Base name for the feature (will be converted to kebab-case)
 * @returns The next available feature ID
 */
export async function generateNextFeatureId(
  projectPath: string,
  featureName: string
): Promise<string> {
  const magiDirectory = path.join(projectPath, 'magi-sdd');

  try {
    // Ensure magi-sdd directory exists
    await fs.mkdir(magiDirectory, { recursive: true });

    // Read all existing directories
    const entries = await fs.readdir(magiDirectory, { withFileTypes: true });
    const existingFeatureIds = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(name => /^\d{3}-/.test(name)); // Only consider directories with numeric prefix

    // Extract numeric prefixes and find the highest one
    const numericPrefixes = existingFeatureIds
      .map(id => parseInt(id.split('-')[0], 10))
      .filter(num => !isNaN(num));

    const nextPrefix = numericPrefixes.length > 0 ? Math.max(...numericPrefixes) + 1 : 1;

    // Convert feature name to kebab-case
    const kebabCaseName = featureName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Format the prefix as 3-digit number
    const formattedPrefix = nextPrefix.toString().padStart(3, '0');

    return `${formattedPrefix}-${kebabCaseName}`;
  } catch {
    // If there's an error reading the directory, start with 001
    const kebabCaseName = featureName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `001-${kebabCaseName}`;
  }
}

/**
 * Validates if a feature ID follows the correct format
 * @param featureId The feature ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidFeatureId(featureId: string): boolean {
  return /^\d{3}-[a-z0-9-]+$/.test(featureId);
}

/**
 * Extracts the numeric prefix from a feature ID
 * @param featureId The feature ID
 * @returns The numeric prefix or null if invalid
 */
export function extractFeatureIdPrefix(featureId: string): number | null {
  const match = featureId.match(/^(\d{3})-/);
  return match ? parseInt(match[1], 10) : null;
}
