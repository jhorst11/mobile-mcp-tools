/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Generates a JSON Schema from the Zod schema definitions.
 * This provides IDE autocomplete and validation for template authors.
 *
 * Usage: npx tsx scripts/generate-json-schema.ts
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { TemplateMetadataSchema } from '../src/types/schemas.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonSchema = zodToJsonSchema(TemplateMetadataSchema, {
  name: 'TemplateMetadata',
  $refStrategy: 'none', // Inline all definitions for better IDE support
});

// Add metadata to the schema
const schemaWithMeta = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://salesforce.github.io/magen-templates/schemas/template-v1.json',
  title: 'Magen Template Metadata',
  description:
    'Schema for magen-templates template.json files. Provides IDE autocomplete and validation for template authors.\n\n⚠️ WARNING: This file is AUTO-GENERATED from src/types/schemas.ts. Do NOT manually edit this file.\n   To update this schema, modify the Zod schemas and run: npm run generate:schema',
  ...jsonSchema,
};

const outputPath = path.join(__dirname, '../schemas/template-v1.json');
fs.outputJsonSync(outputPath, schemaWithMeta, { spaces: 2 });

console.log(`✅ Generated JSON Schema at: ${outputPath}`);
