/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Logger } from '../../../logging/logger.js';
import { MagiOutput } from '../metadata.js';
import { promises as fs } from 'fs';
import dedent from 'dedent';

export interface MagiStateContext {
  featureId: string;
  projectPath: string;
  magiDirectory: string;
  prdPath: string;
  tddPath: string;
  tasksPath: string;
  userInput?: string;
  logger: Logger;
}

export type MagiStateResult = MagiOutput;

export abstract class MagiStateHandler {
  abstract handle(context: MagiStateContext): Promise<MagiStateResult>;

  protected async createPlaceholderFile(filePath: string, docType: string): Promise<void> {
    const content = dedent`
      # ${docType} Document

      ## Overview
      This is a placeholder ${docType} document. Please replace this content with your actual ${docType}.

      ## Instructions
      - Edit this file with your ${docType} content
      - Once complete, call magi with userInput: "finalize" to move to the next phase

      ---
      *This file was created by the magi workflow system.*
    `;

    try {
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to create ${docType} placeholder file: ${error}`);
    }
  }

  protected async markDocumentAsFinalized(filePath: string, docType: string): Promise<void> {
    try {
      // Read existing content
      const existingContent = await fs.readFile(filePath, 'utf8');

      // Add finalization marker to existing content
      const finalizedContent =
        existingContent +
        '\n\n---\n\n## Finalization Status\n\n✅ **FINALIZED** - This document is complete and approved for the next phase.\n\n*This document was finalized by the magi workflow system.*';

      await fs.writeFile(filePath, finalizedContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to mark ${docType} document as finalized: ${error}`);
    }
  }
}
