/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Verifies that the generated JSON schema is in sync with the Zod schema definitions.
 * This script should be run as part of CI/CD and pre-commit hooks to prevent manual edits.
 *
 * Usage: npx tsx scripts/verify-schema-sync.ts
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { TemplateMetadataSchema } from '../src/types/schemas.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate the expected schema
const jsonSchema = zodToJsonSchema(TemplateMetadataSchema, {
  name: 'TemplateMetadata',
  $refStrategy: 'none', // Inline all definitions for better IDE support
});

const expectedSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://salesforce.github.io/magen-templates/schemas/template-v1.json',
  title: 'Magen Template Metadata',
  description:
    'Schema for magen-templates template.json files. Provides IDE autocomplete and validation for template authors.\n\n⚠️ WARNING: This file is AUTO-GENERATED from src/types/schemas.ts. Do NOT manually edit this file.\n   To update this schema, modify the Zod schemas and run: npm run generate:schema',
  ...jsonSchema,
};

const outputPath = path.join(__dirname, '../schemas/template-v1.json');

// Read the existing schema
if (!fs.existsSync(outputPath)) {
  console.error(`❌ Schema file not found at: ${outputPath}`);
  console.error('   Run: npm run generate:schema');
  process.exit(1);
}

const existingSchema = fs.readJsonSync(outputPath);

// Compare schemas (normalize by stringifying and parsing to handle formatting differences)
const normalizeSchema = (schema: unknown): string => {
  return JSON.stringify(schema, Object.keys(schema as Record<string, unknown>).sort());
};

const expectedNormalized = normalizeSchema(expectedSchema);
const existingNormalized = normalizeSchema(existingSchema);

if (expectedNormalized !== existingNormalized) {
  console.error('❌ Schema file is out of sync with Zod schema definitions!');
  console.error(`   File: ${outputPath}`);
  console.error('');
  console.error('   This file is AUTO-GENERATED. Do NOT manually edit it.');
  console.error('   To fix: npm run generate:schema');
  console.error('');
  console.error('   If you need to update the schema:');
  console.error('   1. Edit src/types/schemas.ts');
  console.error('   2. Run: npm run generate:schema');
  console.error('   3. Commit both files together');
  process.exit(1);
}

console.log('✅ Schema file is in sync with Zod schema definitions');
