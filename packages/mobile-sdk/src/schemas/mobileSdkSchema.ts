/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';

// Empty schema for tools that don't need input parameters
export const EmptySchema = z.object({});

// Environment prerequisite check result
export const PrerequisiteCheckResult = z.object({
  tool: z.string(),
  status: z.enum(['found', 'missing', 'outdated']),
  version: z.string().optional(),
  required: z.string().optional(),
  message: z.string(),
});

export const EnvironmentCheckResponse = z.object({
  success: z.boolean(),
  details: z.array(PrerequisiteCheckResult),
});

// Salesforce login schemas
export const SalesforceLoginRequest = z.object({
  instanceUrl: z.string().url().optional().default('https://login.salesforce.com'),
  alias: z.string().optional(),
});

export const SalesforceLoginResponse = z.object({
  success: z.boolean(),
  username: z.string().optional(),
  orgId: z.string().optional(),
  alias: z.string().optional(),
  error: z.string().optional(),
});

// Connected App guidance schemas
export const ConnectedAppGuidanceRequest = z.object({
  consumerKey: z.string().min(1, 'Consumer Key is required').optional(),
  callbackUrl: z.string().default('sfdc://success').optional(),
  loginUrl: z.string().default('https://login.salesforce.com').optional(),
});

export const ConnectedAppGuidanceResponse = z.object({
  success: z.boolean(),
  consumerKey: z.string().optional(),
  callbackUrl: z.string().optional(),
  loginUrl: z.string().optional(),
  guidance: z.string().optional(),
  error: z.string().optional(),
});

// Project scaffolding guidance schemas
export const ProjectScaffoldGuidanceRequest = z.object({
  platform: z
    .enum(['ios', 'android', 'react-native'], {
      required_error: 'Platform must be ios, android, or react-native',
    })
    .optional(),
  appName: z.string().min(1, 'App name is required').optional(),
  packageId: z
    .string()
    .min(1, 'Package ID is required')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/,
      'Package ID must be in reverse domain format (e.g., com.company.app)'
    )
    .optional(),
  organization: z.string().min(1, 'Organization name is required').optional(),

  // Template selection criteria
  appType: z
    .enum(['basic', 'data-heavy', 'enterprise', 'custom-auth', 'sso'], {
      description:
        'Type of application: basic (simple app), data-heavy (offline sync), enterprise (advanced features), custom-auth (custom login), sso (identity provider)',
    })
    .optional(),
  uiFramework: z
    .enum(['modern', 'traditional'], {
      description:
        'UI framework preference: modern (SwiftUI/Jetpack Compose/TypeScript) or traditional (UIKit/Java/JavaScript)',
    })
    .optional(),
  authStrategy: z
    .enum(['standard', 'custom-native', 'deferred', 'sso-provider'], {
      description:
        'Authentication strategy: standard (Salesforce web login), custom-native (native login screen), deferred (optional login), sso-provider (identity provider)',
    })
    .optional(),
  features: z
    .array(z.enum(['push-notifications', 'offline-sync', 'package-manager']))
    .optional()
    .describe(
      'Special features needed: push-notifications, offline-sync, package-manager (iOS Swift Package Manager)'
    ),
  language: z
    .enum(['default', 'typescript', 'kotlin', 'swift', 'java', 'objc'], {
      description: 'Preferred language (overrides platform defaults)',
    })
    .optional(),
});

export const ProjectScaffoldGuidanceResponse = z.object({
  success: z.boolean(),
  guidance: z.string().optional(),
  commands: z.array(z.string()).optional(),
  projectPath: z.string().optional(),
  recommendedTemplate: z.string().optional(),
  templateReason: z.string().optional(),
  alternativeTemplates: z.array(z.string()).optional(),
  error: z.string().optional(),
});

// Project configuration schemas
export const ProjectConfigurationRequest = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  consumerKey: z.string().min(1, 'Consumer key is required'),
  callbackUrl: z.string().default('sfdc://success'),
  loginUrl: z.string().optional(),
});

export const ProjectConfigurationResponse = z.object({
  success: z.boolean(),
  configuredFiles: z.array(z.string()).optional(),
  error: z.string().optional(),
});

// Build and deploy schemas
export const BuildRequest = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  targetDevice: z.string().optional(),
  configuration: z.enum(['debug', 'release']).default('debug'),
});

export const BuildResponse = z.object({
  success: z.boolean(),
  buildLogUri: z.string().optional(),
  appPath: z.string().optional(),
  error: z.string().optional(),
});

// Simulator management schemas
export const SimulatorStartRequest = z.object({
  deviceName: z.string().min(1, 'Device name is required'),
  platform: z.enum(['ios', 'android'], {
    required_error: 'Platform must be ios or android',
  }),
  osVersion: z.string().optional(),
});

export const SimulatorStartResponse = z.object({
  success: z.boolean(),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  platform: z.string().optional(),
  status: z.string().optional(),
  error: z.string().optional(),
});

export const DeviceListRequest = z.object({
  platform: z.enum(['ios', 'android', 'all']).default('all'),
  availableOnly: z.boolean().default(true),
});

export const DeviceInfo = z.object({
  id: z.string(),
  name: z.string(),
  platform: z.enum(['ios', 'android']),
  osVersion: z.string(),
  state: z.enum(['booted', 'shutdown', 'creating', 'booting', 'shutting-down']),
  available: z.boolean(),
});

export const DeviceListResponse = z.object({
  success: z.boolean(),
  devices: z.array(DeviceInfo).optional(),
  error: z.string().optional(),
});

// Build guidance schemas
export const BuildGuidanceRequest = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  configuration: z.enum(['debug', 'release']).default('debug'),
  clean: z.boolean().default(false),
});

export const BuildGuidanceResponse = z.object({
  success: z.boolean(),
  platform: z.string().optional(),
  guidance: z.string().optional(),
  commands: z.array(z.string()).optional(),
  buildLogPath: z.string().optional(),
  expectedAppPath: z.string().optional(),
  error: z.string().optional(),
});

// Deploy guidance schemas
export const DeployGuidanceRequest = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  appPath: z.string().optional(),
  bundleId: z.string().optional(),
  targetDevice: z.string().optional(),
});

export const DeployGuidanceResponse = z.object({
  success: z.boolean(),
  platform: z.string().optional(),
  guidance: z.string().optional(),
  commands: z.array(z.string()).optional(),
  verificationCommands: z.array(z.string()).optional(),
  deviceInfo: z
    .object({
      deviceId: z.string(),
      deviceName: z.string(),
    })
    .optional(),
  error: z.string().optional(),
});

// Resource streaming schemas
export const ResourceReadRequest = z.object({
  uri: z.string().url('Valid resource URI required'),
  offset: z.number().optional().default(0),
  length: z.number().optional(),
});

export const ResourceReadResponse = z.object({
  content: z.string(),
  mimeType: z.string().default('text/plain'),
  size: z.number().optional(),
});

// Testing schemas
export const TestRequest = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  type: z.enum(['lwc', 'apex', 'e2e'], {
    required_error: 'Test type must be lwc, apex, or e2e',
  }),
});

export const TestResponse = z.object({
  success: z.boolean(),
  report: z
    .object({
      passed: z.number(),
      failed: z.number(),
      skipped: z.number(),
      coverage: z.number().optional(),
      details: z
        .array(
          z.object({
            name: z.string(),
            status: z.enum(['passed', 'failed', 'skipped']),
            message: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  error: z.string().optional(),
});

// Type exports
export type EnvironmentCheckResponseType = z.TypeOf<typeof EnvironmentCheckResponse>;
export type SalesforceLoginRequestType = z.TypeOf<typeof SalesforceLoginRequest>;
export type SalesforceLoginResponseType = z.TypeOf<typeof SalesforceLoginResponse>;
export type ConnectedAppGuidanceRequestType = z.TypeOf<typeof ConnectedAppGuidanceRequest>;
export type ConnectedAppGuidanceResponseType = z.TypeOf<typeof ConnectedAppGuidanceResponse>;
export type ProjectScaffoldGuidanceRequestType = z.TypeOf<typeof ProjectScaffoldGuidanceRequest>;
export type ProjectScaffoldGuidanceResponseType = z.TypeOf<typeof ProjectScaffoldGuidanceResponse>;
export type ProjectConfigurationRequestType = z.TypeOf<typeof ProjectConfigurationRequest>;
export type ProjectConfigurationResponseType = z.TypeOf<typeof ProjectConfigurationResponse>;
export type BuildRequestType = z.TypeOf<typeof BuildRequest>;
export type BuildResponseType = z.TypeOf<typeof BuildResponse>;
export type TestRequestType = z.TypeOf<typeof TestRequest>;
export type TestResponseType = z.TypeOf<typeof TestResponse>;

// Phase 2 type exports
export type SimulatorStartRequestType = z.TypeOf<typeof SimulatorStartRequest>;
export type SimulatorStartResponseType = z.TypeOf<typeof SimulatorStartResponse>;
export type DeviceListRequestType = z.TypeOf<typeof DeviceListRequest>;
export type DeviceInfoType = z.TypeOf<typeof DeviceInfo>;
export type DeviceListResponseType = z.TypeOf<typeof DeviceListResponse>;
export type BuildGuidanceRequestType = z.TypeOf<typeof BuildGuidanceRequest>;
export type BuildGuidanceResponseType = z.TypeOf<typeof BuildGuidanceResponse>;
export type DeployGuidanceRequestType = z.TypeOf<typeof DeployGuidanceRequest>;
export type DeployGuidanceResponseType = z.TypeOf<typeof DeployGuidanceResponse>;
export type ResourceReadRequestType = z.TypeOf<typeof ResourceReadRequest>;
export type ResourceReadResponseType = z.TypeOf<typeof ResourceReadResponse>;

// Workflow planner schemas
export const WorkflowPlannerRequest = z.object({
  goal: z.string().min(1, 'Goal description is required'),
  currentContext: z
    .object({
      projectPath: z.string().optional(),
      platform: z.enum(['ios', 'android', 'react-native']).optional(),
      hasConnectedApp: z.boolean().optional(),
      isConfigured: z.boolean().optional(),
    })
    .optional(),
  userExperience: z.enum(['beginner', 'intermediate', 'expert']).optional().default('intermediate'),
  preferences: z
    .object({
      skipValidation: z.boolean().optional().default(false),
      autoExecute: z.boolean().optional().default(false),
      includeOptionalSteps: z.boolean().optional().default(true),
    })
    .optional(),
});

export const WorkflowTodoItem = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).default('pending'),
  dependencies: z.array(z.string()).default([]),
  toolCall: z.string().optional(),
  manualStep: z.boolean().optional().default(false),
  optional: z.boolean().optional().default(false),
  estimatedMinutes: z.number().optional(),
  rationale: z.string().optional(),
});

export const WorkflowUtilityTool = z.object({
  name: z.string(),
  description: z.string(),
  toolId: z.string(),
  useCase: z.string(),
});

export const WorkflowPlannerResponse = z.object({
  success: z.boolean(),
  goal: z.string().optional(),
  summary: z.string().optional(),
  estimatedTime: z.string().optional(),
  todos: z.array(WorkflowTodoItem).optional(),
  utilityTools: z.array(WorkflowUtilityTool).optional(),
  nextAction: z.string().optional(),
  error: z.string().optional(),
});

export type WorkflowPlannerRequestType = z.TypeOf<typeof WorkflowPlannerRequest>;
export type WorkflowPlannerResponseType = z.TypeOf<typeof WorkflowPlannerResponse>;
export type WorkflowTodoItemType = z.TypeOf<typeof WorkflowTodoItem>;
export type WorkflowUtilityToolType = z.TypeOf<typeof WorkflowUtilityTool>;
