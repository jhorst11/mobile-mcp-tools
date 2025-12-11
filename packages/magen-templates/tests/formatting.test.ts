/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import { getTemplateInfo } from '../src/api/index.js';
import { formatTemplateInfo } from '../src/cli/formatting.js';

describe('CLI Formatting', () => {
  describe('formatTemplateInfo', () => {
    it('should include all required variables without defaults in example usage', () => {
      const info = getTemplateInfo('ios-mobilesdk');
      expect(info).toBeDefined();

      const formatted = formatTemplateInfo(info!);

      // Find all required variables without defaults
      const requiredWithoutDefaults = info!.descriptor.variables.filter(
        v => v.required && v.default === undefined
      );

      expect(requiredWithoutDefaults.length).toBeGreaterThan(0);

      // Verify each required variable without a default appears in the example usage
      requiredWithoutDefaults.forEach(v => {
        expect(formatted).toContain(`--var ${v.name}=`);
      });

      // Specifically check for the known required vars in ios-mobilesdk
      expect(formatted).toContain('--var salesforceConsumerKey=');
      expect(formatted).toContain('--var salesforceCallbackUrl=');
    });

    it('should show default values for templates with all defaults', () => {
      const info = getTemplateInfo('ios-base');
      expect(info).toBeDefined();

      const formatted = formatTemplateInfo(info!);

      // ios-base has all required variables with defaults
      const requiredWithoutDefaults = info!.descriptor.variables.filter(
        v => v.required && v.default === undefined
      );

      expect(requiredWithoutDefaults.length).toBe(0);

      // Should show example with default values
      expect(formatted).toContain('Example Usage:');
      expect(formatted).toContain('--var');
    });

    it('should format inheritance chain correctly', () => {
      const info = getTemplateInfo('ios-mobilesdk-login');
      expect(info).toBeDefined();

      const formatted = formatTemplateInfo(info!);

      // Should show the full inheritance chain
      expect(formatted).toContain('Inheritance Chain:');
      expect(formatted).toContain('ios-mobilesdk-login@1.0.0');
      expect(formatted).toContain('└─ ios-mobilesdk@1.0.0');
      expect(formatted).toContain('└─ ios-base@1.0.0');
    });

    it('should categorize required and optional variables', () => {
      const info = getTemplateInfo('ios-base');
      expect(info).toBeDefined();

      const formatted = formatTemplateInfo(info!);

      // Should have a "Required Variables:" section
      expect(formatted).toContain('Required Variables:');

      // Should list variable names
      expect(formatted).toContain('projectName');
      expect(formatted).toContain('bundleIdentifier');
      expect(formatted).toContain('organization');
    });

    it('should include template description', () => {
      const info = getTemplateInfo('ios-mobilesdk');
      expect(info).toBeDefined();

      const formatted = formatTemplateInfo(info!);

      expect(formatted).toContain('Description:');
      expect(formatted).toContain(info!.descriptor.description || '');
    });

    it('should show tags', () => {
      const info = getTemplateInfo('ios-mobilesdk');
      expect(info).toBeDefined();

      const formatted = formatTemplateInfo(info!);

      expect(formatted).toContain('Tags:');
      expect(formatted).toContain('ios');
      expect(formatted).toContain('mobile-sdk');
    });

    it('should generate placeholder values for required vars without defaults', () => {
      const info = getTemplateInfo('ios-mobilesdk');
      expect(info).toBeDefined();

      const formatted = formatTemplateInfo(info!);

      // Should use placeholder format like "<variableName>" for required vars without defaults
      expect(formatted).toContain('"<salesforceConsumerKey>"');
      expect(formatted).toContain('"<salesforceCallbackUrl>"');
    });

    it('should show both base and extended required variables in example usage', () => {
      const info = getTemplateInfo('ios-mobilesdk');
      expect(info).toBeDefined();

      const formatted = formatTemplateInfo(info!);

      // Should include required vars WITHOUT defaults (from the extended template)
      expect(formatted).toContain('--var salesforceConsumerKey=');
      expect(formatted).toContain('--var salesforceCallbackUrl=');

      // Should ALSO include required vars WITH defaults (from the base template)
      // At least some of them should be shown
      const hasBaseVars =
        formatted.includes('--var projectName=') ||
        formatted.includes('--var bundleIdentifier=') ||
        formatted.includes('--var organization=');

      expect(hasBaseVars).toBe(true);
    });

    it('should prioritize vars without defaults in example usage', () => {
      const info = getTemplateInfo('ios-mobilesdk');
      expect(info).toBeDefined();

      const formatted = formatTemplateInfo(info!);

      // Extract the example usage section
      const exampleStart = formatted.indexOf('Example Usage:');
      const exampleSection = formatted.substring(exampleStart);

      // Find positions of vars without defaults vs vars with defaults
      const consumerKeyPos = exampleSection.indexOf('salesforceConsumerKey');
      const callbackUrlPos = exampleSection.indexOf('salesforceCallbackUrl');
      const projectNamePos = exampleSection.indexOf('projectName');

      // Vars without defaults should come before vars with defaults
      expect(consumerKeyPos).toBeGreaterThan(-1);
      expect(callbackUrlPos).toBeGreaterThan(-1);

      // If projectName is shown, it should come after the vars without defaults
      if (projectNamePos > -1) {
        expect(projectNamePos).toBeGreaterThan(consumerKeyPos);
        expect(projectNamePos).toBeGreaterThan(callbackUrlPos);
      }
    });
  });
});
