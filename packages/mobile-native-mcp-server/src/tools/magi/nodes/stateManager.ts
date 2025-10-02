/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { promises as fs } from 'fs';

export type MagiState = 'init' | 'buildingPrd' | 'buildingTdd' | 'buildingTasks' | 'completed';

export class MagiStateManager {
  async determineCurrentState(
    prdPath: string,
    tddPath: string,
    tasksPath: string
  ): Promise<MagiState> {
    const prdExists = await this.fileExists(prdPath);
    const tddExists = await this.fileExists(tddPath);
    const tasksExists = await this.fileExists(tasksPath);

    // If no files exist, we're in init state
    if (!prdExists && !tddExists && !tasksExists) return 'init';

    // Check if files are finalized
    const prdIsFinalized = prdExists && (await this.isFinalizedFile(prdPath));
    const tddIsFinalized = tddExists && (await this.isFinalizedFile(tddPath));
    const tasksIsFinalized = tasksExists && (await this.isFinalizedFile(tasksPath));

    // If all documents are finalized, workflow is complete
    if (prdIsFinalized && tddIsFinalized && tasksIsFinalized) return 'completed';

    // Determine current state based on what's finalized
    if (!prdIsFinalized) return 'buildingPrd';
    if (!tddIsFinalized) return 'buildingTdd';
    if (!tasksIsFinalized) return 'buildingTasks';

    return 'completed';
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async isFinalizedFile(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return (
        content.includes('✅ **FINALIZED**') ||
        content.includes('*This document was finalized by the magi workflow system.*')
      );
    } catch {
      return false;
    }
  }
}
