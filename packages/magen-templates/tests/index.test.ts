/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import * as MagenTemplates from '../src/index';

describe('Package Exports', () => {
  it('should export TemplateRegistry', () => {
    expect(MagenTemplates.TemplateRegistry).toBeDefined();
    expect(typeof MagenTemplates.TemplateRegistry).toBe('function');
  });

  it('should export TemplateGenerator', () => {
    expect(MagenTemplates.TemplateGenerator).toBeDefined();
    expect(typeof MagenTemplates.TemplateGenerator).toBe('function');
  });

  it('should export TemplateValidator', () => {
    expect(MagenTemplates.TemplateValidator).toBeDefined();
    expect(typeof MagenTemplates.TemplateValidator).toBe('function');
  });

  it('should allow instantiation of exported classes', () => {
    const registry = new MagenTemplates.TemplateRegistry();
    expect(registry).toBeInstanceOf(MagenTemplates.TemplateRegistry);

    const generator = new MagenTemplates.TemplateGenerator(registry);
    expect(generator).toBeInstanceOf(MagenTemplates.TemplateGenerator);

    const validator = new MagenTemplates.TemplateValidator();
    expect(validator).toBeInstanceOf(MagenTemplates.TemplateValidator);
  });
});
