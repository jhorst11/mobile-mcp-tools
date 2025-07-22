/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MobileSdkTool } from '../../../../src/tools/mobile-docs/mobile-sdk/tool.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MobileSdkTool', () => {
  let tool: MobileSdkTool;
  let server: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    tool = new MobileSdkTool();
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
    vi.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct tool properties', () => {
      expect(tool.name).toBe('Salesforce Mobile SDK for iOS');
      expect(tool.description).toContain(
        'comprehensive guidance for creating native iOS applications'
      );
      expect(tool.description).toContain('Salesforce Mobile SDK and forceios CLI');
      expect(tool.toolId).toBe('sfmobile-docs-mobile-sdk');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should have a meaningful description', () => {
      expect(tool.description).toContain('native iOS applications');
      expect(tool.description).toContain('installation');
      expect(tool.description).toContain('project setup');
      expect(tool.description).toContain('authentication patterns');
      expect(tool.description).toContain('development best practices');
    });

    it('should require no input', () => {
      const inputShape = tool.inputSchema.shape;
      expect(Object.keys(inputShape)).toHaveLength(0);
    });
  });

  describe('Tool Registration', () => {
    it('should register the tool without throwing', () => {
      const registerToolSpy = vi.spyOn(server, 'registerTool').mockImplementation(() => {
        return {} as never;
      });

      expect(() => tool.register(server, annotations)).not.toThrow();
      expect(registerToolSpy).toHaveBeenCalledWith(
        'sfmobile-docs-mobile-sdk',
        expect.objectContaining({
          description: tool.description,
          inputSchema: tool.inputSchema.shape,
          annotations: annotations,
        }),
        expect.any(Function)
      );
    });

    it('should register with correct tool ID', () => {
      const registerToolSpy = vi.spyOn(server, 'registerTool').mockImplementation(() => {
        return {} as never;
      });

      tool.register(server, annotations);

      expect(registerToolSpy).toHaveBeenCalledWith(
        'sfmobile-docs-mobile-sdk',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('Mobile SDK Content', () => {
    // Helper to access private method
    const getContent = () => {
      // Access the private method using bracket notation for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (tool as any).getMobileSdkContent() as string;
    };

    it('should return mobile SDK content', () => {
      const content = getContent();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should include overview section', () => {
      const content = getContent();
      expect(content).toContain('## Overview');
      expect(content).toContain('Salesforce Mobile SDK');
      expect(content).toContain('native iOS applications');
      expect(content).toContain('built-in authentication');
    });

    it('should include quick setup section', () => {
      const content = getContent();
      expect(content).toContain('## Quick Setup');
      expect(content).toContain('Prerequisites');
      expect(content).toContain('Xcode 14.0+');
      expect(content).toContain('Node.js 18+');
      expect(content).toContain('CocoaPods');
    });

    it('should include installation instructions', () => {
      const content = getContent();
      expect(content).toContain('Installation');
      expect(content).toContain('sudo npm install -g forceios');
      expect(content).toContain('forceios version');
    });

    it('should include project creation commands', () => {
      const content = getContent();
      expect(content).toContain('Create Project');
      expect(content).toContain('forceios create');
      expect(content).toContain('--apptype native');
      expect(content).toContain('pod install');
      expect(content).toContain('open MyApp.xcworkspace');
    });

    it('should include key configuration', () => {
      const content = getContent();
      expect(content).toContain('## Key Configuration');
      expect(content).toContain('bootconfig.plist');
      expect(content).toContain('remoteAccessConsumerKey');
      expect(content).toContain('oauthRedirectURI');
    });

    it('should include development examples', () => {
      const content = getContent();
      expect(content).toContain('## Development Examples');
      expect(content).toContain('Authentication');
      expect(content).toContain('UserAccountManager');
      expect(content).toContain('Data Access');
      expect(content).toContain('RestClient.shared');
    });

    it('should include Swift code examples', () => {
      const content = getContent();
      expect(content).toContain('import SalesforceSDKCore');
      expect(content).toContain('UserAccountManager.shared.currentUserAccount');
      expect(content).toContain('RestClient.shared.performSOQLQuery');
      expect(content).toContain('SELECT Id, Name FROM Account');
    });

    it('should include official documentation section', () => {
      const content = getContent();
      expect(content).toContain('## Official Documentation');
      expect(content).toContain('Primary Resources');
      expect(content).toContain('Technical Resources');
      expect(content).toContain('Learning Paths');
    });

    it('should include verified documentation links', () => {
      const content = getContent();
      expect(content).toContain('Mobile SDK Developer Guide');
      expect(content).toContain('developer.salesforce.com');
      expect(content).toContain('trailhead.salesforce.com');
      expect(content).toContain('github.com/forcedotcom/SalesforceMobileSDK-iOS');
    });

    it('should include help resources', () => {
      const content = getContent();
      expect(content).toContain('## Getting Help');
      expect(content).toContain('Salesforce Developer Community');
      expect(content).toContain('Stack Overflow');
      expect(content).toContain('GitHub Issues');
    });

    it('should be concise and focused on official links', () => {
      const content = getContent();

      // Should be much shorter than the original
      expect(content.split('\n').length).toBeLessThan(100);

      // Should reference official documentation multiple times
      expect(content.match(/developer\.salesforce\.com/g)?.length).toBeGreaterThanOrEqual(3);
      expect(content.match(/trailhead\.salesforce\.com/g)?.length).toBeGreaterThanOrEqual(3);
      expect(content.match(/github\.com\/forcedotcom/g)?.length).toBeGreaterThanOrEqual(2);
    });

    it('should not include extensive detailed content sections', () => {
      const content = getContent();

      // These detailed sections should no longer be present
      expect(content).not.toContain('Building and Running');
      expect(content).not.toContain('Common Commands');
      expect(content).not.toContain('Best Practices');
      expect(content).not.toContain('Connected App Configuration');
      expect(content).not.toContain('Troubleshooting');
      expect(content).not.toContain('Project Structure');
      expect(content).not.toContain('SmartStore');
      expect(content).not.toContain('xcodebuild');
      expect(content).not.toContain('pod deintegrate');
    });
  });

  describe('Error Handling', () => {
    it('should have error handling in the registration handler', () => {
      const registerToolSpy = vi.spyOn(server, 'registerTool').mockImplementation(() => {
        return {} as never;
      });

      // Test that tool registration doesn't throw
      expect(() => tool.register(server, annotations)).not.toThrow();
      expect(registerToolSpy).toHaveBeenCalled();
    });
  });
});
