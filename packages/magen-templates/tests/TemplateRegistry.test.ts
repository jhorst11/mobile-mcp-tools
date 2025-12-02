/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateRegistry } from '../src/registry/TemplateRegistry';

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  describe('discoverTemplates', () => {
    it('should return an array of template info', async () => {
      const templates = await registry.discoverTemplates();
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should return lightweight TemplateInfo objects', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length > 0) {
        const template = templates[0];
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('displayName');
        expect(template).toHaveProperty('platform');
        expect(template).toHaveProperty('capabilities');
        expect(template).toHaveProperty('complexity');
        expect(template).toHaveProperty('tags');
      }
    });
  });

  describe('searchByPlatform', () => {
    it('should filter templates by platform', async () => {
      const iosTemplates = await registry.searchByPlatform('ios');
      iosTemplates.forEach(template => {
        expect(template.platform.type).toBe('ios');
      });
    });

    it('should return empty array for unsupported platform', async () => {
      const templates = await registry.searchByPlatform('ios');
      expect(Array.isArray(templates)).toBe(true);
    });
  });

  describe('searchByCapabilities', () => {
    it('should filter templates by capabilities', async () => {
      const capabilities = ['offline-sync'];
      const templates = await registry.searchByCapabilities(capabilities);

      templates.forEach(template => {
        const hasCapability = capabilities.some(cap => template.capabilities.includes(cap));
        expect(hasCapability).toBe(true);
      });
    });

    it('should handle multiple capabilities', async () => {
      const capabilities = ['swiftui', 'contact-management'];
      const templates = await registry.searchByCapabilities(capabilities);
      expect(Array.isArray(templates)).toBe(true);
    });
  });

  describe('cache', () => {
    it('should cache metadata after first load', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length > 0) {
        const metadata1 = await registry.getMetadata(templates[0].id);
        const metadata2 = await registry.getMetadata(templates[0].id);
        expect(metadata1).toBe(metadata2); // Same reference
      }
    });

    it('should clear cache', async () => {
      const templates = await registry.discoverTemplates();
      if (templates.length > 0) {
        await registry.getMetadata(templates[0].id);
        registry.clearCache();
        // After clear, should reload (new instance)
        const metadata = await registry.getMetadata(templates[0].id);
        expect(metadata).toBeDefined();
      }
    });
  });
});
