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
  callbackUrl: z.string().url('Valid callback URL required').default('sfdc://success').optional(),
  loginUrl: z
    .string()
    .url('Valid login URL required')
    .default('https://login.salesforce.com')
    .optional(),
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
  outputDir: z.string().min(1, 'Output directory is required').optional(),
});

export const ProjectScaffoldGuidanceResponse = z.object({
  success: z.boolean(),
  guidance: z.string().optional(),
  commands: z.array(z.string()).optional(),
  projectPath: z.string().optional(),
  error: z.string().optional(),
});

// Project configuration schemas
export const ProjectConfigurationRequest = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  consumerKey: z.string().min(1, 'Consumer key is required'),
  callbackUrl: z.string().url('Valid callback URL required'),
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

// Enhanced build schemas for Phase 2
export const BuildRunOnSimulatorRequest = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  targetDevice: z.string().optional(),
  configuration: z.enum(['debug', 'release']).default('debug'),
  clean: z.boolean().default(false),
  install: z.boolean().default(true),
  launch: z.boolean().default(true),
});

export const BuildRunOnSimulatorResponse = z.object({
  success: z.boolean(),
  buildLogUri: z.string().optional(),
  appPath: z.string().optional(),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  appBundleId: z.string().optional(),
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
export type BuildRunOnSimulatorRequestType = z.TypeOf<typeof BuildRunOnSimulatorRequest>;
export type BuildRunOnSimulatorResponseType = z.TypeOf<typeof BuildRunOnSimulatorResponse>;
export type ResourceReadRequestType = z.TypeOf<typeof ResourceReadRequest>;
export type ResourceReadResponseType = z.TypeOf<typeof ResourceReadResponse>;
