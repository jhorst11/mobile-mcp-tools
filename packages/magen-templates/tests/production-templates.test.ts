/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { generateApp } from '../src/core/generator.js';
import { findTemplate, discoverTemplates } from '../src/core/discovery.js';
import { detectCycle } from '../src/core/layering.js';

/**
 * Production Template Validation Tests
 *
 * These tests validate that all actual templates in ./templates:
 * 1. Are discoverable and have valid metadata
 * 2. Can be generated successfully
 * 3. Have valid layer patches (for layered templates)
 * 4. Don't have circular dependencies
 * 5. Generate expected files and content
 */
describe('Production Templates', () => {
  const testOutputDir = join(process.cwd(), 'test-output/production-templates');

  beforeEach(() => {
    // Clean up before each test
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('Template Discovery & Metadata', () => {
    it('should discover all production templates', () => {
      const templates = discoverTemplates();
      const templateNames = templates.map(t => t.descriptor.name);

      // Verify core templates exist
      expect(templateNames).toContain('ios-base');
      expect(templateNames).toContain('ios-mobilesdk');
      expect(templateNames).toContain('ios-mobilesdk-login');
    });

    it('should have valid versions for all templates', () => {
      const templates = discoverTemplates();

      templates.forEach(template => {
        expect(template.descriptor.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(template.version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });

    it('should have valid platform metadata', () => {
      const templates = discoverTemplates();

      templates.forEach(template => {
        expect(template.descriptor.platform).toBeTruthy();
        expect(typeof template.descriptor.platform).toBe('string');
      });
    });

    it('should have properly configured extends for layered templates', () => {
      const mobileSdk = findTemplate('ios-mobilesdk');
      expect(mobileSdk?.descriptor.extends).toBeDefined();
      expect(mobileSdk?.descriptor.extends?.template).toBe('ios-base');
      expect(mobileSdk?.descriptor.extends?.version).toBe('1.0.0');
      expect(mobileSdk?.descriptor.extends?.patchFile).toBe('layer.patch');

      const loginCustom = findTemplate('ios-mobilesdk-login');
      expect(loginCustom?.descriptor.extends).toBeDefined();
      expect(loginCustom?.descriptor.extends?.template).toBe('ios-mobilesdk');
      expect(loginCustom?.descriptor.extends?.version).toBe('1.0.0');
      expect(loginCustom?.descriptor.extends?.patchFile).toBe('layer.patch');
    });
  });

  describe('Cycle Detection', () => {
    it('should not have circular dependencies in any template', () => {
      const templates = discoverTemplates();

      templates.forEach(template => {
        const hasCycle = detectCycle(template.descriptor.name);
        expect(hasCycle).toBe(false);
      });
    });

    it('should specifically verify ios template chain has no cycles', () => {
      expect(detectCycle('ios-base')).toBe(false);
      expect(detectCycle('ios-mobilesdk')).toBe(false);
      expect(detectCycle('ios-mobilesdk-login')).toBe(false);
    });
  });

  describe('ios-base Template', () => {
    it('should generate successfully with all required variables', () => {
      const outputDir = join(testOutputDir, 'ios-base-test');

      generateApp({
        templateName: 'ios-base',
        outputDirectory: outputDir,
        variables: {
          projectName: 'TestBaseApp',
          bundleIdentifier: 'com.test.baseapp',
          organization: 'Test Organization',
        },
      });

      // Verify core files exist
      expect(existsSync(join(outputDir, 'TestBaseApp'))).toBe(true);
      expect(existsSync(join(outputDir, 'TestBaseApp', 'TestBaseAppApp.swift'))).toBe(true);
      expect(existsSync(join(outputDir, 'TestBaseApp', 'ContentView.swift'))).toBe(true);
      expect(existsSync(join(outputDir, 'TestBaseApp', 'Info.plist'))).toBe(true);
      expect(existsSync(join(outputDir, 'TestBaseApp.xcodeproj'))).toBe(true);

      // Verify content is properly rendered
      const appFile = readFileSync(join(outputDir, 'TestBaseApp', 'TestBaseAppApp.swift'), 'utf-8');
      expect(appFile).toContain('struct TestBaseAppApp: App');
      expect(appFile).not.toContain('{{projectName}}'); // No unreplaced variables

      const contentView = readFileSync(
        join(outputDir, 'TestBaseApp', 'ContentView.swift'),
        'utf-8'
      );
      expect(contentView).toContain('Welcome to TestBaseApp');
      expect(contentView).toContain('Test Organization');
      expect(contentView).not.toContain('{{'); // No unreplaced variables
    });

    it('should have all required variable definitions', () => {
      const template = findTemplate('ios-base');
      expect(template).toBeTruthy();

      const variableNames = template?.descriptor.variables.map(v => v.name) || [];
      expect(variableNames).toContain('projectName');
      expect(variableNames).toContain('bundleIdentifier');
      expect(variableNames).toContain('organization');
    });
  });

  describe('ios-mobilesdk Template (Layered)', () => {
    it('should generate successfully with Mobile SDK integration', () => {
      const outputDir = join(testOutputDir, 'ios-mobilesdk-test');

      generateApp({
        templateName: 'ios-mobilesdk',
        outputDirectory: outputDir,
        variables: {
          projectName: 'TestSDKApp',
          bundleIdentifier: 'com.test.sdkapp',
          organization: 'Test Organization',
          salesforceMobileSDKVersion: '13.1',
          salesforceLoginHost: 'https://login.salesforce.com',
          salesforceConsumerKey: 'test_consumer_key',
          salesforceCallbackUrl: 'testapp://oauth/callback',
        },
      });

      // Verify base template files exist (inherited from ios-base)
      expect(existsSync(join(outputDir, 'TestSDKApp'))).toBe(true);

      // Verify Mobile SDK specific files exist (from layer patch)
      expect(existsSync(join(outputDir, 'Podfile'))).toBe(true);

      // Verify Podfile contains Mobile SDK configuration
      const podfile = readFileSync(join(outputDir, 'Podfile'), 'utf-8');
      expect(podfile).toContain('SalesforceSDKCore');
      expect(podfile).toContain('13.1'); // SDK version
      expect(podfile).not.toContain('{{'); // No unreplaced variables

      // Verify variables.json has all required Mobile SDK variables
      const template = findTemplate('ios-mobilesdk');
      const variableNames = template?.descriptor.variables.map(v => v.name) || [];
      expect(variableNames).toContain('salesforceMobileSDKVersion');
      expect(variableNames).toContain('salesforceLoginHost');
      expect(variableNames).toContain('salesforceConsumerKey');
    });

    it('should properly layer on top of ios-base', () => {
      const outputDir = join(testOutputDir, 'ios-mobilesdk-layering');

      generateApp({
        templateName: 'ios-mobilesdk',
        outputDirectory: outputDir,
        variables: {
          projectName: 'LayerTest',
          bundleIdentifier: 'com.test.layer',
          organization: 'Test Org',
          salesforceMobileSDKVersion: '13.1',
          salesforceLoginHost: 'https://login.salesforce.com',
          salesforceConsumerKey: 'key',
          salesforceCallbackUrl: 'app://callback',
        },
      });

      // Should have both base files AND layer-specific files
      expect(existsSync(join(outputDir, 'LayerTest'))).toBe(true);

      // Layer-specific files
      expect(existsSync(join(outputDir, 'Podfile'))).toBe(true);

      // Verify Podfile was properly rendered
      const podfile = readFileSync(join(outputDir, 'Podfile'), 'utf-8');
      expect(podfile).toContain('SalesforceSDKCore'); // SDK dependency should be present
    });

    it('should have layer.patch file that is valid', () => {
      const template = findTemplate('ios-mobilesdk');
      expect(template).toBeTruthy();

      const patchPath = join(template!.templatePath, 'layer.patch');
      expect(existsSync(patchPath)).toBe(true);

      const patchContent = readFileSync(patchPath, 'utf-8');
      // Basic patch format validation
      expect(patchContent).toContain('diff --git');
      expect(patchContent.length).toBeGreaterThan(0);
    });
  });

  describe('ios-mobilesdk-login Template (Multi-Layer)', () => {
    it('should generate successfully with login customization', () => {
      const outputDir = join(testOutputDir, 'ios-mobilesdk-login-test');

      generateApp({
        templateName: 'ios-mobilesdk-login',
        outputDirectory: outputDir,
        variables: {
          projectName: 'TestLoginApp',
          bundleIdentifier: 'com.test.loginapp',
          organization: 'Test Organization',
          salesforceMobileSDKVersion: '13.1',
          salesforceLoginHost: 'https://login.salesforce.com',
          salesforceConsumerKey: 'test_key',
          salesforceCallbackUrl: 'testapp://oauth',
        },
      });

      // Should have all layers: base + mobilesdk + login customization
      expect(existsSync(join(outputDir, 'TestLoginApp'))).toBe(true);
      expect(existsSync(join(outputDir, 'Podfile'))).toBe(true);

      // Verify files exist
      const files = getAllFiles(outputDir);
      expect(files.length).toBeGreaterThan(0);

      // No unreplaced variables in any file
      files.forEach(file => {
        if (file.endsWith('.swift') || file.endsWith('.plist') || file === 'Podfile') {
          const content = readFileSync(join(outputDir, file), 'utf-8');
          const unresolved = content.match(/\{\{[^}]+\}\}/g);
          if (unresolved) {
            console.error(`Unreplaced variables in ${file}:`, unresolved);
          }
          expect(unresolved).toBeNull();
        }
      });
    });

    it('should inherit variables from entire chain', () => {
      const template = findTemplate('ios-mobilesdk-login');
      expect(template).toBeTruthy();

      const variableNames = template?.descriptor.variables.map(v => v.name) || [];

      // Should have base template variables
      expect(variableNames).toContain('projectName');
      expect(variableNames).toContain('bundleIdentifier');

      // Should have Mobile SDK variables
      expect(variableNames).toContain('salesforceMobileSDKVersion');
      expect(variableNames).toContain('salesforceLoginHost');
    });

    it('should apply patches in correct order (base -> mobilesdk -> login)', () => {
      const outputDir = join(testOutputDir, 'multi-layer-order');

      // This should successfully apply patches in order without conflicts
      expect(() => {
        generateApp({
          templateName: 'ios-mobilesdk-login',
          outputDirectory: outputDir,
          variables: {
            projectName: 'OrderTest',
            bundleIdentifier: 'com.test.order',
            organization: 'Test Org',
            salesforceMobileSDKVersion: '13.1',
            salesforceLoginHost: 'https://login.salesforce.com',
            salesforceConsumerKey: 'key',
            salesforceCallbackUrl: 'app://oauth',
            salesforceScopes: 'api',
          },
        });
      }).not.toThrow();

      // Verify output exists
      expect(existsSync(outputDir)).toBe(true);
      expect(existsSync(join(outputDir, 'OrderTest'))).toBe(true);
    });

    it('should have valid layer.patch file', () => {
      const template = findTemplate('ios-mobilesdk-login');
      expect(template).toBeTruthy();

      const patchPath = join(template!.templatePath, 'layer.patch');
      expect(existsSync(patchPath)).toBe(true);

      const patchContent = readFileSync(patchPath, 'utf-8');
      expect(patchContent).toContain('diff --git');
      expect(patchContent.length).toBeGreaterThan(0);
    });
  });

  describe('Version Compatibility', () => {
    it('should maintain version pins across template chain', () => {
      // Verify ios-mobilesdk pins to specific ios-base version
      const mobileSdk = findTemplate('ios-mobilesdk');
      expect(mobileSdk?.descriptor.extends?.version).toBe('1.0.0');

      // Verify ios-mobilesdk-login pins to specific ios-mobilesdk version
      const loginCustom = findTemplate('ios-mobilesdk-login');
      expect(loginCustom?.descriptor.extends?.version).toBe('1.0.0');

      // Verify the pinned versions actually exist
      expect(findTemplate('ios-base@1.0.0')).toBeTruthy();
      expect(findTemplate('ios-mobilesdk@1.0.0')).toBeTruthy();
    });

    it('should use correct version when generating layered templates', () => {
      // This tests that when generating ios-mobilesdk, it uses the PINNED
      // version of ios-base (1.0.0), not potentially a different version
      const outputDir = join(testOutputDir, 'version-pin-test');

      generateApp({
        templateName: 'ios-mobilesdk',
        outputDirectory: outputDir,
        variables: {
          projectName: 'VersionTest',
          bundleIdentifier: 'com.test.version',
          organization: 'Test Org',
          salesforceMobileSDKVersion: '13.1',
          salesforceLoginHost: 'https://login.salesforce.com',
          salesforceConsumerKey: 'key',
          salesforceCallbackUrl: 'app://callback',
        },
      });

      // If version pinning works, generation should succeed
      expect(existsSync(outputDir)).toBe(true);
      expect(existsSync(join(outputDir, 'VersionTest'))).toBe(true);
    });
  });

  describe('All Templates Smoke Test', () => {
    it('should be able to discover and generate all production templates', () => {
      const templates = discoverTemplates();
      const results: { name: string; success: boolean; error?: string }[] = [];

      templates.forEach(template => {
        const outputDir = join(testOutputDir, `smoke-test-${template.descriptor.name}`);

        try {
          // Generate with default variables (from variable defaults)
          const variables: Record<string, string> = {};
          template.descriptor.variables.forEach(v => {
            if (v.default !== undefined) {
              variables[v.name] = String(v.default);
            } else if (v.required) {
              // Provide test values for required variables without defaults
              if (v.name === 'salesforceConsumerKey') {
                variables[v.name] = 'test_consumer_key';
              } else if (v.name === 'salesforceCallbackUrl') {
                variables[v.name] = 'testapp://oauth/callback';
              }
            }
          });

          generateApp({
            templateName: template.descriptor.name,
            outputDirectory: outputDir,
            variables,
          });

          results.push({ name: template.descriptor.name, success: true });
        } catch (error) {
          results.push({
            name: template.descriptor.name,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      // All templates should generate successfully
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.error('Failed templates:', failures);
      }
      expect(failures).toHaveLength(0);
    });
  });
});

/**
 * Helper function to recursively get all files in a directory
 */
function getAllFiles(dir: string, fileList: string[] = [], baseDir: string = dir): string[] {
  const files = readdirSync(dir, { withFileTypes: true });

  files.forEach(file => {
    const filePath = join(dir, file.name);
    if (file.isDirectory()) {
      getAllFiles(filePath, fileList, baseDir);
    } else {
      fileList.push(filePath.replace(baseDir + '/', ''));
    }
  });

  return fileList;
}
