/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { Tool } from '../tool.js';
import {
  ProjectScaffoldGuidanceRequest,
  ProjectScaffoldGuidanceResponse,
  type ProjectScaffoldGuidanceRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { dirname, basename } from 'path';

// Template definitions from TEMPLATE_GUIDE.md
interface Template {
  name: string;
  platform: 'ios' | 'android' | 'react-native';
  language: string;
  architecture: string;
  description: string;
  useCases: string[];
  keyFeatures: string[];
  cli: string;
  templateId: string;
  deprecated?: boolean;
}

const TEMPLATES: Template[] = [
  // iOS Templates
  {
    name: 'iOS Native Swift Template',
    platform: 'ios',
    language: 'Swift',
    architecture: 'SwiftUI + Combine',
    description:
      'Modern Swift application template using MobileSync data framework with SwiftUI for declarative UI and Combine for reactive programming.',
    useCases: [
      'Standard iOS apps with Salesforce integration',
      'Apps requiring offline data sync',
      'Modern iOS UI with reactive programming patterns',
    ],
    keyFeatures: ['MobileSync', 'SwiftUI', 'Combine framework'],
    cli: 'forceios',
    templateId: 'iOSNativeSwiftTemplate',
  },
  {
    name: 'iOS Native Swift Package Manager Template',
    platform: 'ios',
    language: 'Swift',
    architecture: 'SwiftUI + Combine + Swift Package Manager',
    description:
      'Identical to iOSNativeSwiftTemplate but uses Swift Package Manager instead of CocoaPods for dependency management.',
    useCases: [
      'Projects preferring Swift Package Manager over CocoaPods',
      'Modern iOS development workflows',
      'Teams wanting streamlined dependency management',
    ],
    keyFeatures: ['MobileSync', 'SwiftUI', 'Combine', 'Swift Package Manager'],
    cli: 'forceios',
    templateId: 'iOSNativeSwiftPackageManagerTemplate',
  },
  {
    name: 'iOS Native Swift Encrypted Notification Template',
    platform: 'ios',
    language: 'Swift',
    architecture: 'Basic Swift + Notification Service Extension',
    description:
      'Swift application template that includes a notification service extension for handling encrypted push notifications.',
    useCases: [
      'Apps requiring secure/encrypted push notifications',
      'Enterprise applications with sensitive data',
      'Apps needing custom notification processing',
    ],
    keyFeatures: ['Notification Service Extension', 'encrypted notifications'],
    cli: 'forceios',
    templateId: 'iOSNativeSwiftEncryptedNotificationTemplate',
  },
  {
    name: 'iOS Native Login Template',
    platform: 'ios',
    language: 'Swift',
    architecture: 'SwiftUI + Custom Login',
    description: 'Sample Swift application featuring a native login screen built with SwiftUI.',
    useCases: [
      'Apps requiring custom branded login experience',
      'Native login UI instead of web-based authentication',
      'Custom authentication flows',
    ],
    keyFeatures: ['SwiftUI', 'custom native login screen', 'branded authentication'],
    cli: 'forceios',
    templateId: 'iOSNativeLoginTemplate',
  },
  {
    name: 'iOS IDP Template (Authenticator)',
    platform: 'ios',
    language: 'Swift',
    architecture: 'Identity Provider pattern',
    description: 'Sample Swift application demonstrating Identity Provider (IDP) functionality.',
    useCases: [
      'Building custom authentication providers',
      'SSO implementations',
      'Enterprise identity management solutions',
      'Multi-app authentication scenarios',
    ],
    keyFeatures: ['Identity Provider functionality', 'SSO', 'authentication delegation'],
    cli: 'forceios',
    templateId: 'iOSIDPTemplate',
  },
  {
    name: 'MobileSync Explorer Swift',
    platform: 'ios',
    language: 'Swift',
    architecture: 'MobileSync + SwiftUI',
    description:
      'Comprehensive sample Swift application demonstrating MobileSync data framework capabilities.',
    useCases: [
      'Learning MobileSync framework',
      'Reference implementation for data synchronization',
      'Apps requiring robust offline capabilities',
      'Contact management applications',
    ],
    keyFeatures: ['MobileSync', 'offline sync', 'CRUD operations', 'conflict resolution'],
    cli: 'forceios',
    templateId: 'MobileSyncExplorerSwift',
  },
  {
    name: 'iOS Native Template (Objective-C)',
    platform: 'ios',
    language: 'Objective-C',
    architecture: 'UIKit + Objective-C',
    description: 'Basic Objective-C application template for iOS.',
    useCases: [
      'Legacy Objective-C projects',
      'Teams with existing Objective-C expertise',
      'Gradual migration from Objective-C to Swift',
    ],
    keyFeatures: ['UIKit', 'Objective-C', 'basic Salesforce SDK integration'],
    cli: 'forceios',
    templateId: 'iOSNativeTemplate',
  },

  // Android Templates
  {
    name: 'Android Native Kotlin Template',
    platform: 'android',
    language: 'Kotlin',
    architecture: 'Basic Kotlin',
    description: 'Basic Kotlin application template for Android.',
    useCases: [
      'Standard Android apps with Salesforce integration',
      'Modern Android development with Kotlin',
      'Basic mobile app requirements',
    ],
    keyFeatures: ['Kotlin', 'basic Salesforce SDK integration'],
    cli: 'forcedroid',
    templateId: 'AndroidNativeKotlinTemplate',
  },
  {
    name: 'Android Native Login Template',
    platform: 'android',
    language: 'Kotlin',
    architecture: 'Jetpack Compose + Custom Login',
    description:
      'Sample Android application featuring a native login screen created with Jetpack Compose.',
    useCases: [
      'Apps requiring custom branded login experience',
      'Modern Android UI with Jetpack Compose',
      'Native login instead of web-based authentication',
    ],
    keyFeatures: ['Jetpack Compose', 'custom native login', 'modern Android UI'],
    cli: 'forcedroid',
    templateId: 'AndroidNativeLoginTemplate',
  },
  {
    name: 'Android IDP Template',
    platform: 'android',
    language: 'Kotlin',
    architecture: 'Identity Provider pattern',
    description:
      'Sample Kotlin application demonstrating Identity Provider (IDP) functionality for Android.',
    useCases: [
      'Android SSO implementations',
      'Enterprise identity management',
      'Multi-app authentication scenarios',
      'Custom authentication providers',
    ],
    keyFeatures: ['Identity Provider functionality', 'SSO', 'Kotlin'],
    cli: 'forcedroid',
    templateId: 'AndroidIDPTemplate',
  },
  {
    name: 'MobileSync Explorer Kotlin Template',
    platform: 'android',
    language: 'Kotlin',
    architecture: 'Modern Android Architecture + MobileSync + Jetpack Compose',
    description:
      'Advanced Android template demonstrating modern architecture patterns with MobileSync.',
    useCases: [
      'Enterprise Android applications',
      'Apps requiring sophisticated offline data sync',
      'Modern Android architecture reference',
      'Contact management with flexible UI',
      'Learning modern Android development patterns',
    ],
    keyFeatures: [
      'Kotlin Coroutines',
      'Jetpack Compose',
      'SObject-to-Kotlin data class framework',
      'Advanced MobileSync patterns',
      'Repository pattern implementation',
      'Flexible/responsive UI design',
    ],
    cli: 'forcedroid',
    templateId: 'MobileSyncExplorerKotlinTemplate',
  },
  {
    name: 'Android Native Template (Java)',
    platform: 'android',
    language: 'Java',
    architecture: 'Basic Java',
    description: 'Basic Java application template for Android.',
    useCases: [
      'Legacy Java Android projects',
      'Teams with existing Java expertise',
      'Gradual migration from Java to Kotlin',
    ],
    keyFeatures: ['Java', 'basic Salesforce SDK integration'],
    cli: 'forcedroid',
    templateId: 'AndroidNativeTemplate',
  },

  // React Native Templates
  {
    name: 'React Native Template',
    platform: 'react-native',
    language: 'JavaScript',
    architecture: 'React Native + React Navigation',
    description:
      'Basic React Native application template supporting both iOS and Android platforms.',
    useCases: [
      'Cross-platform mobile development',
      'Teams with React/JavaScript expertise',
      'Rapid prototyping for both platforms',
      'Shared codebase between iOS and Android',
    ],
    keyFeatures: ['React Native', 'React Navigation', 'cross-platform'],
    cli: 'forcereact',
    templateId: 'ReactNativeTemplate',
  },
  {
    name: 'React Native TypeScript Template',
    platform: 'react-native',
    language: 'TypeScript',
    architecture: 'React Native + TypeScript',
    description: 'React Native application template written in TypeScript.',
    useCases: [
      'Large-scale React Native applications',
      'Teams preferring type safety',
      'Complex applications requiring better code maintainability',
      'JavaScript teams transitioning to TypeScript',
    ],
    keyFeatures: ['TypeScript', 'React Native', 'type safety', 'cross-platform'],
    cli: 'forcereact',
    templateId: 'ReactNativeTypeScriptTemplate',
  },
  {
    name: 'React Native Deferred Template',
    platform: 'react-native',
    language: 'JavaScript',
    architecture: 'React Native + Deferred Authentication',
    description: 'React Native application template implementing deferred login pattern.',
    useCases: [
      'Apps with guest/anonymous access',
      'Gradual authentication onboarding',
      'Apps where login is not immediately required',
      'Better user experience with optional authentication',
    ],
    keyFeatures: ['Deferred authentication', 'guest access', 'React Native'],
    cli: 'forcereact',
    templateId: 'ReactNativeDeferredTemplate',
  },
  {
    name: 'MobileSync Explorer React Native',
    platform: 'react-native',
    language: 'JavaScript',
    architecture: 'React Native + MobileSync',
    description:
      'Sample React Native application demonstrating MobileSync data framework in a cross-platform context.',
    useCases: [
      'Learning MobileSync in React Native',
      'Cross-platform apps with offline sync requirements',
      'Reference implementation for React Native data sync',
      'Contact management across platforms',
    ],
    keyFeatures: ['MobileSync', 'React Native', 'offline sync', 'cross-platform'],
    cli: 'forcereact',
    templateId: 'MobileSyncExplorerReactNative',
  },
];

export class CreateProjectTool implements Tool {
  readonly name = 'Create Project';
  readonly toolId = 'create-project';
  readonly description =
    'Provides intelligent template selection and step-by-step guidance for creating Salesforce Mobile SDK projects using forceios, forcedroid, or forcereact CLIs.';
  readonly inputSchema = ProjectScaffoldGuidanceRequest;
  readonly outputSchema = ProjectScaffoldGuidanceResponse;

  private selectBestTemplate(params: ProjectScaffoldGuidanceRequestType): {
    template: Template | null;
    alternatives: Template[];
    reason: string;
  } {
    if (!params.platform) {
      return {
        template: null,
        alternatives: [],
        reason: 'No platform specified. Please specify ios, android, or react-native.',
      };
    }

    // Filter templates by platform
    const platformTemplates = TEMPLATES.filter(
      t => t.platform === params.platform && !t.deprecated
    );

    if (platformTemplates.length === 0) {
      return {
        template: null,
        alternatives: [],
        reason: `No templates available for platform: ${params.platform}`,
      };
    }

    // Template selection scoring system
    const scoreTemplate = (template: Template): number => {
      let score = 0;
      const reasons: string[] = [];

      // App Type scoring
      if (params.appType) {
        switch (params.appType) {
          case 'basic':
            if (
              template.templateId.includes('Native') &&
              !template.templateId.includes('MobileSync') &&
              !template.templateId.includes('Login') &&
              !template.templateId.includes('IDP')
            ) {
              score += 30;
              reasons.push('Basic template for standard app development');
            }
            break;
          case 'data-heavy':
          case 'enterprise':
            if (template.templateId.includes('MobileSync')) {
              score += 40;
              reasons.push('MobileSync template for offline data synchronization');
            }
            break;
          case 'custom-auth':
            if (template.templateId.includes('Login')) {
              score += 40;
              reasons.push('Custom login template for branded authentication');
            }
            break;
          case 'sso':
            if (template.templateId.includes('IDP')) {
              score += 40;
              reasons.push('Identity Provider template for SSO functionality');
            }
            break;
        }
      }

      // UI Framework scoring
      if (params.uiFramework === 'modern') {
        if (
          template.keyFeatures.some(
            f => f.includes('SwiftUI') || f.includes('Jetpack Compose') || f.includes('TypeScript')
          )
        ) {
          score += 20;
          reasons.push('Modern UI framework (SwiftUI/Jetpack Compose/TypeScript)');
        }
      } else if (params.uiFramework === 'traditional') {
        if (
          template.keyFeatures.some(
            f => f.includes('UIKit') || f.includes('Java') || f.includes('JavaScript')
          )
        ) {
          score += 20;
          reasons.push('Traditional UI framework');
        }
      }

      // Authentication Strategy scoring
      if (params.authStrategy) {
        switch (params.authStrategy) {
          case 'custom-native':
            if (template.templateId.includes('Login')) {
              score += 30;
              reasons.push('Custom native login implementation');
            }
            break;
          case 'deferred':
            if (template.templateId.includes('Deferred')) {
              score += 30;
              reasons.push('Deferred authentication pattern');
            }
            break;
          case 'sso-provider':
            if (template.templateId.includes('IDP')) {
              score += 30;
              reasons.push('SSO identity provider functionality');
            }
            break;
          case 'standard':
            if (
              !template.templateId.includes('Login') &&
              !template.templateId.includes('IDP') &&
              !template.templateId.includes('Deferred')
            ) {
              score += 15;
              reasons.push('Standard Salesforce authentication');
            }
            break;
        }
      }

      // Features scoring
      if (params.features) {
        params.features.forEach(feature => {
          switch (feature) {
            case 'push-notifications':
              if (template.templateId.includes('Notification')) {
                score += 25;
                reasons.push('Push notification support');
              }
              break;
            case 'offline-sync':
              if (template.templateId.includes('MobileSync')) {
                score += 25;
                reasons.push('Offline data synchronization');
              }
              break;
            case 'package-manager':
              if (template.templateId.includes('PackageManager')) {
                score += 15;
                reasons.push('Swift Package Manager support');
              }
              break;
          }
        });
      }

      // Language preference scoring
      if (params.language && params.language !== 'default') {
        if (template.language.toLowerCase() === params.language.toLowerCase()) {
          score += 25;
          reasons.push(`Preferred language: ${template.language}`);
        }
      }

      // Default preferences for modern development
      if (!params.language || params.language === 'default') {
        if (template.platform === 'ios' && template.language === 'Swift') {
          score += 10;
          reasons.push('Modern iOS development with Swift');
        } else if (template.platform === 'android' && template.language === 'Kotlin') {
          score += 10;
          reasons.push('Modern Android development with Kotlin');
        } else if (template.platform === 'react-native' && template.language === 'TypeScript') {
          score += 5;
          reasons.push('Type-safe React Native development');
        }
      }

      return score;
    };

    // Score all templates
    const scoredTemplates = platformTemplates
      .map(template => ({
        template,
        score: scoreTemplate(template),
      }))
      .sort((a, b) => b.score - a.score);

    const bestTemplate = scoredTemplates[0];
    const alternatives = scoredTemplates.slice(1, 4).map(st => st.template);

    // Generate reasoning
    let reason = `Selected based on your requirements: `;
    const criteria: string[] = [];
    if (params.appType) criteria.push(`app type (${params.appType})`);
    if (params.uiFramework) criteria.push(`UI framework (${params.uiFramework})`);
    if (params.authStrategy) criteria.push(`auth strategy (${params.authStrategy})`);
    if (params.features?.length) criteria.push(`features (${params.features.join(', ')})`);
    if (params.language && params.language !== 'default')
      criteria.push(`language (${params.language})`);

    if (criteria.length > 0) {
      reason += criteria.join(', ') + '. ';
    }
    reason += `This template provides ${bestTemplate.template.keyFeatures.join(', ')}.`;

    return {
      template: bestTemplate.template,
      alternatives,
      reason,
    };
  }

  private generateGeneralGuidance(): string {
    return `# Salesforce Mobile SDK Project Scaffolding Guide

## Intelligent Template Selection

This tool provides intelligent template selection based on your project requirements. The Mobile SDK offers specialized templates for different use cases:

### Quick Start - Provide Requirements
To get personalized template recommendations, specify your requirements:

\`\`\`json
{
  "platform": "ios|android|react-native",
  "appType": "basic|data-heavy|enterprise|custom-auth|sso",
  "uiFramework": "modern|traditional",
  "authStrategy": "standard|custom-native|deferred|sso-provider",
  "features": ["push-notifications", "offline-sync", "package-manager"],
  "language": "default|typescript|kotlin|swift|java|objc"
}
\`\`\`

### Template Categories

#### Basic Templates
- **iOS**: Modern Swift with SwiftUI
- **Android**: Modern Kotlin with basic features
- **React Native**: Cross-platform JavaScript/TypeScript

#### Data-Heavy/Enterprise Templates  
- **MobileSync Explorer** templates for offline data synchronization
- Advanced architecture patterns
- CRUD operations with conflict resolution

#### Custom Authentication Templates
- **Native Login** templates for branded login experiences
- **IDP (Identity Provider)** templates for SSO scenarios
- **Deferred Authentication** for optional login flows

#### Specialized Features
- **Encrypted Push Notifications** (iOS)
- **Swift Package Manager** support (iOS)
- **Jetpack Compose** modern UI (Android)

## Manual Template Selection

### Available Templates by Platform

#### iOS Templates (\`forceios\`)
1. **iOSNativeSwiftTemplate** - Basic modern Swift app
2. **iOSNativeSwiftPackageManagerTemplate** - Swift with SPM
3. **iOSNativeSwiftEncryptedNotificationTemplate** - Push notifications
4. **iOSNativeLoginTemplate** - Custom login UI
5. **iOSIDPTemplate** - SSO identity provider
6. **MobileSyncExplorerSwift** - Data sync reference
7. **iOSNativeTemplate** - Legacy Objective-C

#### Android Templates (\`forcedroid\`)
1. **AndroidNativeKotlinTemplate** - Basic modern Kotlin app  
2. **AndroidNativeLoginTemplate** - Custom login with Jetpack Compose
3. **AndroidIDPTemplate** - SSO identity provider
4. **MobileSyncExplorerKotlinTemplate** - Enterprise data sync
5. **AndroidNativeTemplate** - Legacy Java

#### React Native Templates (\`forcereact\`)
1. **ReactNativeTemplate** - Basic cross-platform JavaScript
2. **ReactNativeTypeScriptTemplate** - Type-safe TypeScript
3. **ReactNativeDeferredTemplate** - Optional authentication
4. **MobileSyncExplorerReactNative** - Cross-platform data sync

### Example Commands

#### Using Templates (Recommended)
\`\`\`bash
# iOS with template
forceios createWithTemplate \\
  --templaterepouri=iOSNativeSwiftTemplate \\
  --appname="My App" \\
  --packagename=com.company.myapp \\
  --organization="My Company" \\
  --outputdir=MyApp

# Android with template  
forcedroid createWithTemplate \\
  --templaterepouri=AndroidNativeKotlinTemplate \\
  --appname="My App" \\
  --packagename=com.company.myapp \\
  --organization="My Company" \\
  --outputdir=MyApp

# React Native with template
forcereact createWithTemplate \\
  --templaterepouri=ReactNativeTypeScriptTemplate \\
  --appname="My App" \\
  --packagename=com.company.myapp \\
  --organization="My Company" \\
  --outputdir=MyApp
\`\`\`

#### Basic Creation (Fallback)
\`\`\`bash
# Basic iOS project
forceios create \\
  --apptype=native_swift \\
  --appname="My App" \\
  --packagename=com.company.myapp \\
  --organization="My Company" \\
  --outputdir=MyApp
\`\`\`

## Prerequisites
Ensure you have the correct CLI installed:
- **iOS**: \`npm install -g forceios\` (macOS only)
- **Android**: \`npm install -g forcedroid\`  
- **React Native**: \`npm install -g forcereact\`

## Next Steps
1. Run the generated commands to create your project
2. Configure Connected App credentials using \`project-configure-connection\` tool
3. Build and test using \`build-run-on-simulator\` tool

**💡 Tip**: Provide your requirements to get personalized template recommendations!`;
  }

  private generateSpecificGuidance(params: ProjectScaffoldGuidanceRequestType): {
    success: boolean;
    guidance: string;
    commands: string[];
    projectPath?: string;
    recommendedTemplate?: string;
    templateReason?: string;
    alternativeTemplates?: string[];
    error?: string;
  } {
    // If platform is specified, use template selection
    if (params.platform) {
      // Validate required parameters for project creation
      if (!params.appName || !params.packageId || !params.organization || !params.outputDir) {
        return {
          success: false,
          error:
            'When platform is specified, appName, packageId, organization, and outputDir are all required.',
          guidance: this.generateGeneralGuidance(),
          commands: [],
        };
      }

      // Validate package ID format
      const packageIdRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
      if (!packageIdRegex.test(params.packageId)) {
        return {
          success: false,
          error: 'Package ID must be in reverse domain format (e.g., com.company.app)',
          guidance: this.generateGeneralGuidance(),
          commands: [],
        };
      }

      // Platform-specific validations
      if (params.platform === 'ios' && process.platform !== 'darwin') {
        return {
          success: false,
          error: 'iOS development is only supported on macOS',
          guidance: this.generateGeneralGuidance(),
          commands: [],
        };
      }

      // Select the best template based on requirements
      const { template, alternatives, reason } = this.selectBestTemplate(params);

      // Generate specific commands
      // Intelligent directory handling: detect if user wants to create in current directory
      let workingDir: string;
      let projectDirName: string | undefined;
      let projectPath: string;

      if (params.outputDir.startsWith('/')) {
        // Absolute path specified
        const absolutePath = params.outputDir;
        const currentDir = process.cwd();

        if (absolutePath === currentDir) {
          // User wants to create in current directory
          workingDir = currentDir;
          projectDirName = undefined; // No outputdir needed
          projectPath = currentDir;
        } else {
          // User wants to create in a different absolute path
          workingDir = dirname(absolutePath);
          projectDirName = basename(absolutePath);
          projectPath = absolutePath;
        }
      } else {
        // Relative path specified - check if it matches current directory
        const currentDirName = basename(process.cwd());

        if (params.outputDir === currentDirName || params.outputDir === '.') {
          // User wants to create in current directory
          workingDir = process.cwd();
          projectDirName = undefined; // No outputdir needed
          projectPath = process.cwd();
        } else {
          // User wants to create in a subdirectory
          workingDir = process.cwd();
          projectDirName = params.outputDir;
          projectPath = `${workingDir}/${projectDirName}`;
        }
      }

      let commands: string[] = [];
      let guidance: string;

      if (template) {
        // Use template-based creation (preferred)
        if (projectDirName) {
          // Creating in a specific subdirectory
          commands = [
            `cd "${workingDir}"`,
            `${template.cli} createWithTemplate \\`,
            `  --templaterepouri=${template.templateId} \\`,
            `  --appname="${params.appName}" \\`,
            `  --packagename=${params.packageId} \\`,
            `  --organization="${params.organization}" \\`,
            `  --outputdir="${projectDirName}"`,
          ];
        } else {
          // Creating in current directory
          commands = [
            `cd "${workingDir}"`,
            `${template.cli} createWithTemplate \\`,
            `  --templaterepouri=${template.templateId} \\`,
            `  --appname="${params.appName}" \\`,
            `  --packagename=${params.packageId} \\`,
            `  --organization="${params.organization}"`,
          ];
        }

        guidance = `# ${template.name} - Recommended Template

## 🎯 Template Selection
**Selected Template**: ${template.name}
**Reason**: ${reason}

## 📋 Template Details
- **Platform**: ${template.platform}
- **Language**: ${template.language}
- **Architecture**: ${template.architecture}
- **Key Features**: ${template.keyFeatures.join(', ')}

## 🚀 Create Your Project

Run these commands to create your project with the recommended template:

\`\`\`bash
${commands.join('\n')}
\`\`\`

## 📁 Project Location
Your project will be created at: \`${projectPath}\`

## 🔄 Alternative Templates
${
  alternatives.length > 0
    ? alternatives
        .map(
          alt => `- **${alt.name}** (${alt.templateId}) - ${alt.description.substring(0, 100)}...`
        )
        .join('\n')
    : 'No alternative templates available for your requirements.'
}

## 📖 Template Use Cases
${template.useCases.map(useCase => `- ${useCase}`).join('\n')}

## ⚡ Next Steps
1. Run the commands above to create your project
2. Navigate to project: \`cd "${projectPath}"\`
3. Configure Connected App credentials using \`project-configure-connection\` tool
4. Build and test using \`build-run-on-simulator\` tool

${template.platform === 'ios' ? `5. Open in Xcode: \`open "${projectPath}/${params.appName}.xcworkspace"\`` : ''}
${template.platform === 'android' ? `5. Open in Android Studio: \`open "${projectPath}"\`` : ''}
${template.platform === 'react-native' ? `5. Install dependencies: \`cd "${projectPath}" && npm install\`` : ''}

## 💡 Why This Template?
${template.description}`;
      } else {
        // Fallback to basic creation
        let appType: string;
        switch (params.platform.toLowerCase()) {
          case 'ios':
            appType = 'native_swift';
            break;
          case 'android':
            appType = 'native_kotlin';
            break;
          case 'react-native':
            appType = 'react_native';
            break;
          default:
            return {
              success: false,
              error: `Unsupported platform: ${params.platform}`,
              guidance: this.generateGeneralGuidance(),
              commands: [],
            };
        }

        const cliMap = {
          ios: 'forceios',
          android: 'forcedroid',
          'react-native': 'forcereact',
        };

        const cliName = cliMap[params.platform as keyof typeof cliMap];

        if (projectDirName) {
          // Creating in a specific subdirectory
          commands = [
            `cd "${workingDir}"`,
            `${cliName} create \\`,
            `  --apptype=${appType} \\`,
            `  --appname="${params.appName}" \\`,
            `  --packagename=${params.packageId} \\`,
            `  --organization="${params.organization}" \\`,
            `  --outputdir="${projectDirName}"`,
          ];
        } else {
          // Creating in current directory
          commands = [
            `cd "${workingDir}"`,
            `${cliName} create \\`,
            `  --apptype=${appType} \\`,
            `  --appname="${params.appName}" \\`,
            `  --packagename=${params.packageId} \\`,
            `  --organization="${params.organization}"`,
          ];
        }

        guidance = `# Basic ${params.platform.toUpperCase()} Project Creation

## ⚠️ Fallback Mode
No suitable template was found for your requirements. Using basic project creation.

## 🚀 Create Your Project

\`\`\`bash
${commands.join('\n')}
\`\`\`

## 📁 Project Location
Your project will be created at: \`${projectPath}\`

## ⚡ Next Steps
1. Run the commands above to create your project
2. Navigate to project: \`cd "${projectPath}"\`
3. Configure Connected App credentials using \`project-configure-connection\` tool
4. Build and test using \`build-run-on-simulator\` tool

## 💡 Consider Specifying Requirements
For better template recommendations, consider specifying:
- \`appType\`: basic, data-heavy, enterprise, custom-auth, sso
- \`uiFramework\`: modern, traditional
- \`authStrategy\`: standard, custom-native, deferred, sso-provider
- \`features\`: push-notifications, offline-sync, package-manager`;
      }

      return {
        success: true,
        guidance,
        commands,
        projectPath,
        recommendedTemplate: template?.templateId,
        templateReason: template ? reason : undefined,
        alternativeTemplates: alternatives.map(alt => alt.templateId),
      };
    }

    // No platform specified, return general guidance with template selection info
    return {
      success: true,
      guidance: this.generateGeneralGuidance(),
      commands: [],
    };
  }

  private async handleRequest(params: ProjectScaffoldGuidanceRequestType) {
    try {
      const result = this.generateSpecificGuidance(params);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error generating project guidance: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  public register(server: McpServer, annotations: ToolAnnotations): void {
    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      annotations,
      this.handleRequest.bind(this)
    );
  }
}
