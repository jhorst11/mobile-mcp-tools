/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SFMobileNativeGatherInputTool } from '../../../src/tools/plan/sfmobile-native-gather-input/tool.js';
import { GatherInputWorkflowInput } from '../../../src/tools/plan/sfmobile-native-gather-input/metadata.js';

describe('SFMobileNativeGatherInputTool', () => {
  let tool: SFMobileNativeGatherInputTool;
  let mockServer: McpServer;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test', version: '1.0.0' });
    tool = new SFMobileNativeGatherInputTool(mockServer);
  });

  describe('Single Property Strategy', () => {
    it('should generate guidance for single property', async () => {
      const input: GatherInputWorkflowInput = {
        strategy: {
          type: 'single',
          property: {
            name: 'projectName',
            friendlyName: 'project name',
            description: 'Name of your project',
            examples: ['MyApp', 'ContactManager'],
          },
        },
        purpose: 'To generate your mobile app',
        workflowStateData: {},
      };

      const result = await tool.handleRequest(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      expect(text).toContain('ROLE');
      expect(text).toContain('TASK');
      expect(text).toContain('CONTEXT');
      expect(text).toContain('project name');
      expect(text).toContain('MyApp');
    });
  });

  describe('Multiple Properties Strategy', () => {
    it('should generate guidance for multiple properties', async () => {
      const input: GatherInputWorkflowInput = {
        strategy: {
          type: 'multiple',
          properties: [
            {
              name: 'platform',
              friendlyName: 'platform',
              description: 'Mobile platform',
              examples: ['iOS', 'Android'],
            },
            {
              name: 'projectName',
              friendlyName: 'project name',
              description: 'Name of your project',
            },
          ],
          groupLabel: 'Project Information',
        },
        purpose: 'To generate your mobile app',
        workflowStateData: {},
      };

      const result = await tool.handleRequest(input);

      expect(result).toBeDefined();
      const text = result.content[0].text;
      expect(text).toContain('multiple related pieces');
      expect(text).toContain('platform');
      expect(text).toContain('project name');
      expect(text).toContain('Project Information');
    });
  });

  describe('Choice Selection Strategy', () => {
    it('should generate guidance for choice selection', async () => {
      const input: GatherInputWorkflowInput = {
        strategy: {
          type: 'choice',
          property: {
            name: 'buildType',
            friendlyName: 'build type',
            description: 'Type of build',
          },
          choices: [
            { label: 'Debug', value: 'debug', description: 'Development build' },
            { label: 'Release', value: 'release', description: 'Production build' },
          ],
          allowCustom: false,
          defaultChoice: 'Debug',
        },
        purpose: 'Select build configuration',
        workflowStateData: {},
      };

      const result = await tool.handleRequest(input);

      expect(result).toBeDefined();
      const text = result.content[0].text;
      expect(text).toContain('predefined choices');
      expect(text).toContain('Debug');
      expect(text).toContain('Release');
      expect(text).toContain('recommended');
    });

    it('should indicate when custom input is allowed', async () => {
      const input: GatherInputWorkflowInput = {
        strategy: {
          type: 'choice',
          property: {
            name: 'targetDevice',
            friendlyName: 'target device',
            description: 'Device to deploy to',
          },
          choices: [
            { label: 'iPhone 15', value: 'iphone-15' },
            { label: 'iPad Pro', value: 'ipad-pro' },
          ],
          allowCustom: true,
        },
        purpose: 'Select deployment target',
        workflowStateData: {},
      };

      const result = await tool.handleRequest(input);

      expect(result).toBeDefined();
      const text = result.content[0].text;
      expect(text).toContain('own custom value');
    });
  });

  describe('Confirmation Strategy', () => {
    it('should generate guidance for confirmation', async () => {
      const input: GatherInputWorkflowInput = {
        strategy: {
          type: 'confirmation',
          property: {
            name: 'enableAdvanced',
            friendlyName: 'advanced features',
          },
          question: 'Enable advanced features?',
          defaultValue: false,
        },
        purpose: 'Configure advanced options',
        workflowStateData: {},
      };

      const result = await tool.handleRequest(input);

      expect(result).toBeDefined();
      const text = result.content[0].text;
      expect(text).toContain('yes/no question');
      expect(text).toContain('Enable advanced features?');
      expect(text).toContain('Default answer: No');
    });
  });

  describe('Workflow Context', () => {
    it('should include workflow context in guidance', async () => {
      const input: GatherInputWorkflowInput = {
        strategy: {
          type: 'single',
          property: {
            name: 'packageName',
            friendlyName: 'package name',
            description: 'Package identifier',
          },
        },
        purpose: 'Complete project configuration',
        workflowContext: {
          platform: 'iOS',
          projectName: 'TestApp',
        },
        workflowStateData: {},
      };

      const result = await tool.handleRequest(input);

      expect(result).toBeDefined();
      const text = result.content[0].text;
      expect(text).toContain('WORKFLOW CONTEXT');
      expect(text).toContain('iOS');
      expect(text).toContain('TestApp');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Pass invalid input to trigger error handling
      const invalidInput = {} as GatherInputWorkflowInput;

      const result = await tool.handleRequest(invalidInput);

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
    });
  });
});
