#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  const packageJsonPath = join(__dirname, '../../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
}

function showHelp(): void {
  console.log(`
magen-template - Layered, platform-agnostic app templating engine

Usage:
  magen-template <command> [options]

Commands:
  list                                List available templates
  show <name>                         Show template metadata and schema
  generate <template>                 Generate a concrete app from template
  template create <name> --from <base>  Create authoring instance
  template dev <name>                 Re-enter authoring mode
  template finalize <name>            Extract schema, rewrite, compute patch
  template validate <name>            Validate template structure

Options:
  --help                              Show this help message
  --version                           Show version number

Examples:
  magen-template list
  magen-template show ios-base
  magen-template generate ios-salesforce --out ./my-app

For more information, visit: https://github.com/forcedotcom/mobile-mcp-tools
`);
}

function showVersion(): void {
  console.log(`magen-template v${getVersion()}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
  }

  // Future: Implement command routing here
  console.error(`Command not yet implemented: ${args[0]}`);
  console.error('Run "magen-template --help" for usage information.');
  process.exit(1);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
