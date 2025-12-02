/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateSelector } from '../src/selection/TemplateSelector';
import { TemplateRegistry } from '../src/registry/TemplateRegistry';
import { Platform } from '../src/types';

describe('TemplateSelector', () => {
  let selector: TemplateSelector;
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
    selector = new TemplateSelector();
  });

  describe('selectTemplate', () => {
    it('should select best template matching platform', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length === 0) {
        console.log('Skipping test - no templates available');
        return;
      }

      const result = await selector.selectTemplate(templates, {
        platform: templates[0].platform.type,
      });

      expect(result).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.template.platform.type).toBe(templates[0].platform.type);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when no templates match', async () => {
      const templates = await registry.discoverTemplates();
      const nonExistentPlatform = 'nonexistent' as unknown as Platform;

      await expect(
        selector.selectTemplate(templates, {
          platform: nonExistentPlatform,
        })
      ).rejects.toThrow('No templates match the requirements');
    });

    it('should consider required capabilities', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length === 0) {
        console.log('Skipping test - no templates available');
        return;
      }

      const template = templates[0];
      const capability = template.capabilities[0];

      const result = await selector.selectTemplate(templates, {
        platform: template.platform.type,
        requiredCapabilities: [capability],
      });

      expect(result.template.capabilities).toContain(capability);
    });

    it('should consider complexity level', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length === 0) {
        console.log('Skipping test - no templates available');
        return;
      }

      const template = templates[0];

      const result = await selector.selectTemplate(templates, {
        platform: template.platform.type,
        complexity: template.complexity.level,
      });

      expect(result.template.complexity.level).toBe(template.complexity.level);
    });

    it('should consider tags', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length === 0) {
        console.log('Skipping test - no templates available');
        return;
      }

      const template = templates[0];
      const tag = template.tags[0];

      const result = await selector.selectTemplate(templates, {
        platform: template.platform.type,
        tags: [tag],
      });

      expect(result.template.tags).toContain(tag);
    });
  });

  describe('rankTemplates', () => {
    it('should rank templates by relevance', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length === 0) {
        console.log('Skipping test - no templates available');
        return;
      }

      const ranked = await selector.rankTemplates(templates, {
        platform: templates[0].platform.type,
      });

      expect(ranked.length).toBeGreaterThan(0);

      // Scores should be in descending order
      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
      }
    });

    it('should return empty array when no templates match', async () => {
      const templates = await registry.discoverTemplates();
      const nonExistentPlatform = 'nonexistent' as unknown as Platform;

      const ranked = await selector.rankTemplates(templates, {
        platform: nonExistentPlatform,
      });

      expect(ranked.length).toBe(0);
    });

    it('should score templates with matching capabilities higher', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length === 0) {
        console.log('Skipping test - no templates available');
        return;
      }

      const template = templates[0];
      const capability = template.capabilities[0];

      const ranked = await selector.rankTemplates(templates, {
        platform: template.platform.type,
        requiredCapabilities: [capability],
      });

      if (ranked.length > 0) {
        expect(ranked[0].template.capabilities).toContain(capability);
      }
    });
  });

  describe('explainSelection', () => {
    it('should provide explanation for template selection', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length === 0) {
        console.log('Skipping test - no templates available');
        return;
      }

      const match = await selector.selectTemplate(templates, {
        platform: templates[0].platform.type,
      });

      const explanation = selector.explainSelection(match);

      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(0);
      expect(explanation).toContain(match.template.displayName);
    });

    it('should explain matching criteria', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length === 0) {
        console.log('Skipping test - no templates available');
        return;
      }

      const template = templates[0];
      const capability = template.capabilities[0];

      const match = await selector.selectTemplate(templates, {
        platform: template.platform.type,
        requiredCapabilities: [capability],
      });

      const explanation = selector.explainSelection(match);

      expect(explanation).toContain('Platform');
      expect(explanation).toContain(capability);
    });
  });

  describe('custom weights', () => {
    it('should allow custom scoring weights', async () => {
      const customSelector = new TemplateSelector({
        platformMatch: 1.0,
        capabilityCoverage: 0.5,
      });

      const templates = await registry.discoverTemplates();
      if (templates.length === 0) {
        console.log('Skipping test - no templates available');
        return;
      }

      const result = await customSelector.selectTemplate(templates, {
        platform: templates[0].platform.type,
      });

      expect(result).toBeDefined();
      expect(result.template).toBeDefined();
    });
  });
});
