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
import { readFileSync } from 'fs';
import { join } from 'path';

// Template definitions from TEMPLATES.md - comprehensive Mobile SDK template guide
interface Template {
  name: string;
  platform: 'ios' | 'android' | 'react-native';
  language: string;
  architecture: string;
  description: string;
  technicalImplementation: string[];
  useCases: string[];
  keyFeatures: string[];
  modificationGuide: string[];
  cli: string;
  templateId: string;
  deprecated?: boolean;
  isOfflineFirst?: boolean;
  hasCustomAuth?: boolean;
  hasAdvancedFeatures?: boolean;
  dataPattern?: 'direct-api' | 'mobilesync' | 'smartstore';
  uiFramework?: 'swiftui' | 'uikit' | 'compose' | 'traditional' | 'react';
}

/**
 * Parse TEMPLATES.md to extract template information
 */
function parseTemplatesFromMarkdown(): Template[] {
  try {
    const templatesPath = join(__dirname, 'TEMPLATES.md');
    const content = readFileSync(templatesPath, 'utf-8');

    const templates: Template[] = [];
    const sections = content.split(/^#### /m).slice(1); // Split by template headers, skip intro

    for (const section of sections) {
      const lines = section.split('\n');
      const templateId = lines[0].trim();

      // Extract basic info
      let name = '';
      let cli = '';
      let platform: 'ios' | 'android' | 'react-native' = 'ios';
      let language = '';
      let architecture = '';
      let description = '';
      const technicalImplementation: string[] = [];
      const useCases: string[] = [];
      const keyFeatures: string[] = [];
      const modificationGuide: string[] = [];

      let currentSection = '';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('- **CLI**:')) {
          cli = line.replace('- **CLI**: `', '').replace('`', '');
          if (cli === 'forceios') platform = 'ios';
          else if (cli === 'forcedroid') platform = 'android';
          else if (cli === 'forcereact') platform = 'react-native';
        }

        if (line.startsWith('- **Platform**:')) {
          const platformText = line.replace('- **Platform**: ', '').toLowerCase();
          if (platformText.includes('ios')) platform = 'ios';
          else if (platformText.includes('android')) platform = 'android';
          else if (platformText.includes('react native')) platform = 'react-native';
        }

        if (line.startsWith('- **Language**:')) {
          language = line.replace('- **Language**: ', '');
        }

        if (line.startsWith('- **Architecture**:')) {
          architecture = line.replace('- **Architecture**: ', '');
        }

        if (line.startsWith('**Description**:')) {
          description = line.replace('**Description**: ', '');
          // Continue reading description if it spans multiple lines
          let j = i + 1;
          while (j < lines.length && lines[j] && !lines[j].startsWith('**')) {
            description += ' ' + lines[j].trim();
            j++;
          }
          i = j - 1;
        }

        // Parse sections
        if (line.startsWith('**Technical Implementation**:')) {
          currentSection = 'technical';
        } else if (line.startsWith('**Use Cases**:')) {
          currentSection = 'useCases';
        } else if (line.startsWith('**Key Features**:')) {
          currentSection = 'keyFeatures';
        } else if (line.startsWith('**Modification Guide**:')) {
          currentSection = 'modification';
        } else if (line.startsWith('- ') || line.startsWith('  - ')) {
          const listItem = line.replace(/^(\s*- )/, '').trim();

          switch (currentSection) {
            case 'technical':
              technicalImplementation.push(listItem);
              break;
            case 'useCases':
              useCases.push(listItem);
              break;
            case 'keyFeatures':
              keyFeatures.push(listItem);
              break;
            case 'modification':
              modificationGuide.push(listItem);
              break;
          }
        }

        // Extract name from template ID if not explicitly found
        if (!name && templateId) {
          name = templateId
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
          if (name.endsWith('Template')) {
            name = name.replace('Template', '').trim();
          }
        }
      }

      // Create template object
      if (templateId && cli) {
        const template: Template = {
          name: name || templateId,
          platform,
          language: language || 'Unknown',
          architecture: architecture || 'Unknown',
          description: description || 'Mobile SDK template',
          technicalImplementation,
          useCases,
          keyFeatures,
          modificationGuide,
          cli,
          templateId,
          // Infer additional properties from content
          isOfflineFirst:
            description.toLowerCase().includes('mobilesync') ||
            keyFeatures.some(f => f.toLowerCase().includes('sync')),
          hasCustomAuth:
            name.toLowerCase().includes('login') ||
            name.toLowerCase().includes('idp') ||
            description.toLowerCase().includes('custom login'),
          hasAdvancedFeatures:
            name.toLowerCase().includes('explorer') || technicalImplementation.length > 5,
          dataPattern: description.toLowerCase().includes('mobilesync')
            ? 'mobilesync'
            : 'direct-api',
          uiFramework: keyFeatures.some(f => f.includes('SwiftUI'))
            ? 'swiftui'
            : keyFeatures.some(f => f.includes('Jetpack Compose'))
              ? 'compose'
              : keyFeatures.some(f => f.includes('React'))
                ? 'react'
                : 'traditional',
        };

        templates.push(template);
      }
    }

    return templates;
  } catch (error) {
    console.warn('Failed to parse TEMPLATES.md, falling back to basic templates:', error);
    // Fallback to basic template definitions if parsing fails
    return [
      {
        name: 'iOS Native Swift Template',
        platform: 'ios',
        language: 'Swift',
        architecture: 'SwiftUI + Combine',
        description: 'Modern Swift application template',
        technicalImplementation: ['SwiftUI for UI', 'Combine for reactive programming'],
        useCases: ['Standard iOS apps'],
        keyFeatures: ['SwiftUI', 'Combine'],
        modificationGuide: ['Update SOQL queries for different objects'],
        cli: 'forceios',
        templateId: 'iOSNativeSwiftTemplate',
      },
      {
        name: 'Android Native Kotlin Template',
        platform: 'android',
        language: 'Kotlin',
        architecture: 'Basic Kotlin',
        description: 'Basic Kotlin application template',
        technicalImplementation: ['Kotlin for development'],
        useCases: ['Standard Android apps'],
        keyFeatures: ['Kotlin'],
        modificationGuide: ['Update SOQL queries for different objects'],
        cli: 'forcedroid',
        templateId: 'AndroidNativeKotlinTemplate',
      },
      {
        name: 'React Native Template',
        platform: 'react-native',
        language: 'JavaScript',
        architecture: 'React Native',
        description: 'Basic React Native template',
        technicalImplementation: ['React Native for cross-platform'],
        useCases: ['Cross-platform apps'],
        keyFeatures: ['React Native', 'Cross-platform'],
        modificationGuide: ['Update API calls for different objects'],
        cli: 'forcereact',
        templateId: 'ReactNativeTemplate',
      },
    ];
  }
}

// Load templates dynamically from TEMPLATES.md
const TEMPLATES = parseTemplatesFromMarkdown();

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
      // Standard directory handling: outputDir is the parent directory, project gets created in outputDir/appName
      let workingDir: string;
      let projectDirName: string;
      let projectPath: string;

      // Handle special case where user wants to create in current directory
      const currentDir = process.cwd();

      if (params.outputDir === '.' || params.outputDir === currentDir) {
        // User wants to create in current directory
        workingDir = currentDir;
        projectDirName = params.appName;
        projectPath = join(currentDir, params.appName);
      } else {
        // Standard case: outputDir is the parent directory where we create appName subdirectory
        if (params.outputDir.startsWith('/')) {
          // Absolute path
          workingDir = params.outputDir;
        } else {
          // Relative path - resolve from current directory
          workingDir = join(currentDir, params.outputDir);
        }

        projectDirName = params.appName;
        projectPath = join(workingDir, params.appName);
      }

      let commands: string[] = [];
      let guidance: string;

      if (template) {
        // Use template-based creation (preferred)
        commands = [
          `cd "${workingDir}"`,
          `${template.cli} createWithTemplate \\`,
          `  --templaterepouri=${template.templateId} \\`,
          `  --appname="${params.appName}" \\`,
          `  --packagename=${params.packageId} \\`,
          `  --organization="${params.organization}" \\`,
          `  --outputdir="${projectDirName}"`,
        ];

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

${
  template.technicalImplementation.length > 0
    ? `
## 🏗️ Technical Implementation
${template.technicalImplementation.map(detail => `- ${detail}`).join('\n')}
`
    : ''
}

${
  template.modificationGuide.length > 0
    ? `
## 🔧 Customization Guide
${template.modificationGuide.map(guide => `- ${guide}`).join('\n')}
`
    : ''
}

## ⚡ Next Steps
1. Run the commands above to create your project
2. Navigate to project: \`cd "${projectPath}"\`
3. Configure Connected App credentials using \`create-configuration\` tool
4. Build and test using \`build-project\` and \`deploy-app\` tools

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

        commands = [
          `cd "${workingDir}"`,
          `${cliName} create \\`,
          `  --apptype=${appType} \\`,
          `  --appname="${params.appName}" \\`,
          `  --packagename=${params.packageId} \\`,
          `  --organization="${params.organization}" \\`,
          `  --outputdir="${projectDirName}"`,
        ];

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
