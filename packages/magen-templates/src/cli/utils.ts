/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

export function parseVariables(varArgs: string[]): Record<string, string | number | boolean> {
  const variables: Record<string, string | number | boolean> = {};

  for (const varArg of varArgs) {
    const [name, value] = varArg.split('=');

    if (!name || value === undefined) {
      console.error(`Error: Invalid variable format: ${varArg}`);
      console.error('Expected format: --var name=value');
      process.exit(1);
    }

    // Try to parse as number or boolean
    if (value === 'true') {
      variables[name] = true;
    } else if (value === 'false') {
      variables[name] = false;
    } else if (/^\d+$/.test(value)) {
      variables[name] = parseInt(value, 10);
    } else if (/^\d+\.\d+$/.test(value)) {
      variables[name] = parseFloat(value);
    } else {
      variables[name] = value;
    }
  }

  return variables;
}
