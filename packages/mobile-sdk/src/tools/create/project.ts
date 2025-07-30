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
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
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
    // Try multiple possible locations for TEMPLATES.md
    const possiblePaths = [
      join(process.cwd(), 'packages/mobile-sdk/src/tools/create/TEMPLATES.md'),
      join(process.cwd(), 'src/tools/create/TEMPLATES.md'),
      join(process.cwd(), 'TEMPLATES.md'),
      join(process.cwd(), 'dist/tools/create/TEMPLATES.md'),
      join(process.cwd(), 'packages/mobile-sdk/dist/tools/create/TEMPLATES.md'),
    ];

    let content = '';
    for (const templatesPath of possiblePaths) {
      try {
        content = readFileSync(templatesPath, 'utf-8');
        break;
      } catch {
        // Continue to next path
      }
    }

    if (!content) {
      throw new Error('TEMPLATES.md not found in any expected location');
    }

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

  /**
   * Generate template-specific extension guidance by parsing from TEMPLATES.md
   */
  private generateExtensionGuide(template: Template, params: ProjectScaffoldGuidanceRequestType) {
    const isDataHeavy =
      template.isOfflineFirst ||
      params.appType === 'data-heavy' ||
      template.templateId.includes('MobileSync');

    try {
      const templatesContent = this.readTemplatesMarkdown();
      const guidanceType = isDataHeavy ? 'Data-Heavy' : 'Basic';

      // Extract the relevant extension guide section
      const extensionSection = this.extractExtensionGuideSection(templatesContent, guidanceType);

      if (!extensionSection) {
        console.warn(`No extension guidance found for ${guidanceType} template type`);
        return this.generateFallbackExtensionGuide(template, params);
      }

      // Extract content using template-specific section names
      const isDataHeavyContent = extensionSection.includes('Data-Heavy Template Extension Guide');

      return {
        projectStructure: this.substituteTemplatePlaceholders(
          this.extractSectionContent(extensionSection, 'Project Structure'),
          params
        ),
        addingFeatures: isDataHeavyContent
          ? this.extractSectionContent(extensionSection, 'Adding New Object Types')
          : this.extractSectionContent(extensionSection, 'Adding New Features (Basic Template)'),
        commonPatterns: isDataHeavyContent
          ? this.extractSectionContent(extensionSection, 'Data Flow Pattern')
          : this.extractSectionContent(extensionSection, 'API Integration Patterns'),
        requiredFiles: this.extractListItems(
          extensionSection,
          isDataHeavyContent ? 'Required Files (Data-Heavy Templates)' : 'Required Files (Basic)'
        ),
        pitfalls: this.extractListItems(
          extensionSection,
          isDataHeavyContent ? 'Common Pitfalls (Data-Heavy)' : 'Common Pitfalls (Basic)'
        ),
      };
    } catch (error) {
      console.warn('Failed to parse extension guidance from TEMPLATES.md, using fallback:', error);
      return this.generateFallbackExtensionGuide(template, params);
    }
  }

  /**
   * Read the raw TEMPLATES.md content for parsing extension guidance
   */
  private readTemplatesMarkdown(): string {
    try {
      // Try multiple possible locations for TEMPLATES.md
      const possiblePaths = [
        join(process.cwd(), 'packages/mobile-sdk/src/tools/create/TEMPLATES.md'),
        join(process.cwd(), 'src/tools/create/TEMPLATES.md'),
        join(process.cwd(), 'TEMPLATES.md'),
        join(process.cwd(), 'dist/tools/create/TEMPLATES.md'),
        join(process.cwd(), 'packages/mobile-sdk/dist/tools/create/TEMPLATES.md'),
      ];

      for (const templatesPath of possiblePaths) {
        try {
          return readFileSync(templatesPath, 'utf-8');
        } catch {
          // Continue to next path
        }
      }

      throw new Error('TEMPLATES.md not found in any expected location');
    } catch (error) {
      console.warn('Failed to read TEMPLATES.md:', error);
      return '';
    }
  }

  /**
   * Extract a specific extension guide section from templates content
   */
  private extractExtensionGuideSection(content: string, guidanceType: string): string | null {
    // First try to match until the next ### section
    let sectionPattern = new RegExp(
      `### ${guidanceType} Template Extension Guide([\\s\\S]*?)(?=^### )`,
      'im'
    );
    let match = content.match(sectionPattern);

    // If no next section found, match until end of file (for last section)
    if (!match) {
      sectionPattern = new RegExp(`### ${guidanceType} Template Extension Guide([\\s\\S]*)$`, 'im');
      match = content.match(sectionPattern);
    }

    return match ? match[1] : null;
  }

  /**
   * Extract content for a specific subsection
   */
  private extractSectionContent(section: string, sectionName: string): string {
    const pattern = new RegExp(`#### ${sectionName}([\\s\\S]*?)(?=#### |$)`, 'i');
    const match = section.match(pattern);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract list items from a section
   */
  private extractListItems(section: string, sectionName: string): string[] {
    const sectionContent = this.extractSectionContent(section, sectionName);
    if (!sectionContent) return [];

    const lines = sectionContent.split('\n');
    const items: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        items.push(trimmed.substring(2));
      }
    }

    return items;
  }

  /**
   * Replace template placeholders like {appName} with actual values
   */
  private substituteTemplatePlaceholders(
    content: string,
    params: ProjectScaffoldGuidanceRequestType
  ): string {
    return content
      .replace(/\{appName\}/g, params.appName || 'YourApp')
      .replace(/\{packageId\}/g, params.packageId || 'com.example.yourapp')
      .replace(/\{organization\}/g, params.organization || 'Your Organization');
  }

  /**
   * Fallback extension guide if parsing fails
   */
  private generateFallbackExtensionGuide(
    template: Template,
    params: ProjectScaffoldGuidanceRequestType
  ) {
    const isDataHeavy =
      template.isOfflineFirst ||
      params.appType === 'data-heavy' ||
      template.templateId.includes('MobileSync');

    return {
      projectStructure: `Basic project structure for ${template.platform} ${template.templateId}`,
      addingFeatures: isDataHeavy
        ? 'When adding features to data-heavy templates, update userstore.json and usersync.json files'
        : 'When adding features, create models, services, and update UI components',
      commonPatterns: isDataHeavy
        ? 'Follow MobileSync patterns: Sync → Query → Modify → Upload'
        : 'Use SalesforceSDK REST API for direct Salesforce integration',
      requiredFiles: isDataHeavy
        ? [
            'userstore.json',
            'usersync.json',
            'bootconfig files',
            'Service classes',
            'Model classes',
          ]
        : ['bootconfig files', 'Service classes', 'Model classes', 'UI components'],
      pitfalls: isDataHeavy
        ? [
            'Missing userstore.json entries',
            'Incorrect field mapping',
            'Missing sync configuration',
          ]
        : ['Poor error handling', 'Missing authentication handling', 'Hardcoded values'],
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

  /**
   * Generate a comprehensive PRD (Product Requirements Document) for the project
   */
  private generatePRD(template: Template, params: ProjectScaffoldGuidanceRequestType): string {
    const isDataHeavy =
      template.isOfflineFirst ||
      params.appType === 'data-heavy' ||
      template.templateId.includes('MobileSync');
    const isIOS = template.platform === 'ios';
    const isAndroid = template.platform === 'android';
    const isReactNative = template.platform === 'react-native';

    const currentDate = new Date().toISOString().split('T')[0];

    return `# Project Requirements Document (PRD)
**Project:** ${params.appName}  
**Template:** ${template.templateId}  
**Platform:** ${template.platform.toUpperCase()}  
**Generated:** ${currentDate}  
**Package ID:** ${params.packageId}

---

## 📋 **EXECUTIVE SUMMARY**

This PRD defines the technical requirements, architecture patterns, and development workflow for **${params.appName}**, a ${isDataHeavy ? 'data-heavy offline-first' : 'basic REST API-based'} Salesforce mobile application built using the **${template.templateId}** template.

### **Template Selection Rationale**
- **Platform:** ${template.platform.toUpperCase()} - ${template.description}
- **App Type:** ${isDataHeavy ? 'Data-Heavy (MobileSync)' : 'Basic (Direct API)'}
- **UI Framework:** ${params.uiFramework || 'default'} - ${isIOS ? 'SwiftUI with modern iOS patterns' : isAndroid ? 'Jetpack Compose or traditional Views' : 'React Native components'}
- **Authentication:** ${params.authStrategy || 'standard'} - Standard Salesforce OAuth
- **Offline Support:** ${isDataHeavy ? '✅ Full offline sync with SmartStore' : '❌ Online-only with direct API calls'}

---

## 🏗️ **PROJECT ARCHITECTURE**

### **Technology Stack**
${
  isIOS
    ? `- **Language:** Swift
- **UI Framework:** SwiftUI
- **Architecture:** MVVM with ObservableObject
- **Data Layer:** ${isDataHeavy ? 'MobileSync SDK + SmartStore' : 'SFRestAPI (direct REST calls)'}
- **Threading:** Combine for reactive programming`
    : ''
}${
      isAndroid
        ? `- **Language:** ${params.language === 'kotlin' ? 'Kotlin' : 'Java'}
- **UI Framework:** ${params.uiFramework === 'modern' ? 'Jetpack Compose' : 'Traditional Android Views'}
- **Architecture:** MVVM with LiveData/StateFlow
- **Data Layer:** ${isDataHeavy ? 'MobileSync SDK + SmartStore' : 'RestClient (direct REST calls)'}`
        : ''
    }${
      isReactNative
        ? `- **Language:** ${params.language === 'typescript' ? 'TypeScript' : 'JavaScript'}
- **UI Framework:** React Native
- **State Management:** Redux/Context API
- **Data Layer:** ${isDataHeavy ? 'MobileSync SDK + SmartStore' : 'REST API calls'}`
        : ''
    }

### **Project Structure**
\`\`\`
${params.appName}/
├── ${
      isIOS
        ? `${params.appName}/                   # iOS main folder
│   ├── Models/                  # Data models
│   ├── Services/                # API services  
│   ├── ViewModels/              # SwiftUI ViewModels
│   ├── Views/                   # SwiftUI Views
│   └── Resources/               # Assets, localizations`
        : isAndroid
          ? `app/src/main/
│   ├── java/.../models/         # Data models
│   ├── java/.../services/       # API services
│   ├── java/.../viewmodels/     # ViewModels
│   ├── java/.../activities/     # Activities/Fragments
│   └── res/                     # Resources, layouts`
          : `src/
│   ├── components/              # React components
│   ├── services/                # API services
│   ├── store/                   # State management
│   └── navigation/              # Navigation setup`
    }
${
  isDataHeavy
    ? `├── userstore.json              # SmartStore soup schemas
├── usersync.json               # MobileSync configurations`
    : ''
}
└── bootconfig.plist             # App configuration
\`\`\`

---

## 🚀 **DEVELOPMENT WORKFLOW**

### **Phase 1: Project Creation**
\`\`\`bash
# Use the create-project tool with these exact parameters:
{
  "platform": "${params.platform}",
  "appName": "${params.appName}",
  "organization": "${params.organization || 'com.yourcompany'}",
  "packageId": "${params.packageId}",
  "outputDir": "${params.outputDir}",
  "appType": "${params.appType || 'basic'}",
  "language": "${params.language || 'default'}",
  "uiFramework": "${params.uiFramework || 'modern'}",
  "authStrategy": "${params.authStrategy || 'standard'}"${
    params.features
      ? `,
  "features": ${JSON.stringify(params.features)}`
      : ''
  }
}
\`\`\`

### **Phase 2: Build & Deploy**
\`\`\`bash
# Build the project
{
  "projectPath": "${params.outputDir}/${params.appName}",
  "configuration": "debug"
}
# Use build-project tool

# Deploy to simulator/emulator  
{
  "projectPath": "${params.outputDir}/${params.appName}",
  "targetDevice": "auto"  // Will auto-select available device
}
# Use deploy-app tool
\`\`\`

---

## ⚠️ **CRITICAL EXTENSION GUIDELINES**

### **🚨 MOST COMMON MISTAKES TO AVOID**
${
  isIOS
    ? `
1. **❌ SceneDelegate not updated** - When adding tabs, ALWAYS update SceneDelegate.swift
2. **❌ Missing @StateObject/@ObservableObject** - SwiftUI reactive updates will fail
3. **❌ ${!isDataHeavy ? 'Adding userstore.json unnecessarily' : 'Missing userstore.json entries'}** - ${!isDataHeavy ? 'Basic templates use direct API calls' : 'Causes SmartStore "soup not found" errors'}
4. **❌ Incorrect CodingKeys** - Must match exact Salesforce field API names`
    : ''
}${
      isAndroid
        ? `
1. **❌ Missing MainActivity updates** - When adding navigation, update MainActivity
2. **❌ ${!isDataHeavy ? 'Adding userstore.json unnecessarily' : 'Missing userstore.json entries'}** - ${!isDataHeavy ? 'Basic templates use direct API calls' : 'Causes SmartStore errors'}
3. **❌ Incorrect @SerializedName** - Must match exact Salesforce field API names`
        : ''
    }

### **✅ STEP-BY-STEP EXTENSION PROCESS**

#### **Adding New Features (e.g., Opportunities Tab)**

${
  isIOS
    ? `**STEP 1: Update SceneDelegate.swift (REQUIRED for tabs)**
\`\`\`swift
// SceneDelegate.swift - Update if adding TabView
func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = (scene as? UIWindowScene) else { return }
    
    self.window = UIWindow(windowScene: windowScene)
    
    // Update to TabView if adding multiple tabs
    let contentView = MainTabView() // Instead of single ContactsView
    
    self.window!.rootViewController = UIHostingController(rootView: contentView)
    self.window!.makeKeyAndVisible()
}
\`\`\`

**STEP 2: Create TabView Structure**
\`\`\`swift
struct MainTabView: View {
    var body: some View {
        TabView {
            ContactsListView()
                .tabItem {
                    Image(systemName: "person.2")
                    Text("Contacts")
                }
            
            OpportunitiesListView() // <-- New tab
                .tabItem {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                    Text("Opportunities")
                }
        }
    }
}
\`\`\`

**STEP 3: Create Data Model**
\`\`\`swift
struct Opportunity: Codable, Identifiable {
    let id: String?
    let name: String
    let amount: Double?
    let closeDate: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "Id"
        case name = "Name"
        case amount = "Amount"
        case closeDate = "CloseDate"
    }
}
\`\`\``
    : ''
}${
      isAndroid
        ? `**STEP 1: Update MainActivity** 
\`\`\`${params.language === 'kotlin' ? 'kotlin' : 'java'}
// Add navigation setup for multiple screens
${
  params.language === 'kotlin'
    ? `class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Setup navigation with bottom tabs
        setupBottomNavigation()
    }
}`
    : `public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        // Setup navigation with bottom tabs
        setupBottomNavigation();
    }
}`
}
\`\`\`

**STEP 2: Create Data Model**
\`\`\`${params.language === 'kotlin' ? 'kotlin' : 'java'}
${
  params.language === 'kotlin'
    ? `data class Opportunity(
    @SerializedName("Id") val id: String? = null,
    @SerializedName("Name") val name: String,
    @SerializedName("Amount") val amount: Double?,
    @SerializedName("CloseDate") val closeDate: String?
)`
    : `public class Opportunity {
    @SerializedName("Id") private String id;
    @SerializedName("Name") private String name;
    @SerializedName("Amount") private Double amount;
    @SerializedName("CloseDate") private String closeDate;
    
    // Constructors, getters, setters...
}`
}
\`\`\``
        : ''
    }

#### **Configuration Files Updates**

${
  isDataHeavy
    ? `**userstore.json** - Add soup schema for new objects:
\`\`\`json
{
  "soups": [
    {
      "soupName": "Opportunity",
      "indexes": [
        {"path": "Id", "type": "string"},
        {"path": "Name", "type": "string"},
        {"path": "Amount", "type": "floating"}
      ]
    }
  ]
}
\`\`\`

**usersync.json** - Add sync configuration:
\`\`\`json
{
  "syncs": [
    {
      "syncName": "syncOpportunities",
      "syncType": "syncDown",
      "soupName": "Opportunity",
      "target": {
        "type": "soql",
        "query": "SELECT Id, Name, Amount, CloseDate FROM Opportunity LIMIT 1000"
      }
    }
  ]
}
\`\`\``
    : `**🚫 NO userstore.json/usersync.json needed**
Basic templates use direct REST API calls:
\`\`\`${isIOS ? 'swift' : isAndroid ? (params.language === 'kotlin' ? 'kotlin' : 'java') : 'javascript'}
${
  isIOS
    ? `// Use SFRestAPI directly
SFRestAPI.sharedInstance().performSOQL("SELECT Id, Name FROM Opportunity") { response in
    // Handle response
}`
    : isAndroid
      ? params.language === 'kotlin'
        ? `// Use RestClient directly
RestClient.sendAsync(RestRequest.requestForQuery("SELECT Id, Name FROM Opportunity")) { response ->
    // Handle response
}`
        : `// Use RestClient directly
RestClient.sendAsync(RestRequest.requestForQuery("SELECT Id, Name FROM Opportunity"), response -> {
    // Handle response
});`
      : `// Use fetch or axios directly
fetch('/services/data/v55.0/query?q=SELECT+Id,Name+FROM+Opportunity')
  .then(response => response.json())
  .then(data => {
    // Handle response
  });`
}
\`\`\``
}

---

## 📋 **REQUIRED FILES CHECKLIST**

When adding new features, update these files:

### **Core Files**
${
  isIOS
    ? `- [ ] **SceneDelegate.swift** - ⚠️ Update for tabs (MOST CRITICAL)
- [ ] **MainTabView.swift** - Add new tab items
- [ ] **{Feature}ListView.swift** - New feature UI
- [ ] **{Feature}ViewModel.swift** - Business logic
- [ ] **{Feature}.swift** - Data model`
    : isAndroid
      ? `- [ ] **MainActivity.${params.language === 'kotlin' ? 'kt' : 'java'}** - Update navigation
- [ ] **activity_main.xml** - Add navigation components  
- [ ] **{Feature}Activity.${params.language === 'kotlin' ? 'kt' : 'java'}** - New feature UI
- [ ] **{Feature}ViewModel.${params.language === 'kotlin' ? 'kt' : 'java'}** - Business logic
- [ ] **{Feature}.${params.language === 'kotlin' ? 'kt' : 'java'}** - Data model`
      : `- [ ] **App.tsx** - Update navigation
- [ ] **{Feature}Screen.tsx** - New feature UI
- [ ] **{Feature}Service.ts** - API integration
- [ ] **{Feature}.types.ts** - TypeScript types`
}

### **Configuration Files**
${
  isDataHeavy
    ? `- [ ] **userstore.json** - Add soup schemas
- [ ] **usersync.json** - Add sync configurations`
    : `- [ ] **bootconfig.plist** - OAuth settings (already configured)`
}

### **Service Layer**
- [ ] **{Feature}Service.${isIOS ? 'swift' : isAndroid ? (params.language === 'kotlin' ? 'kt' : 'java') : 'ts'}** - API integration
${isDataHeavy ? `- [ ] **{Feature}SyncManager.${isIOS ? 'swift' : isAndroid ? (params.language === 'kotlin' ? 'kt' : 'java') : 'ts'}** - Offline sync logic` : ''}

---

## 🛠️ **TOOL REFERENCE**

### **Available MCP Tools**
1. **create-project** - Generate new project from template
2. **build-project** - Build iOS/Android/React Native project  
3. **deploy-app** - Deploy to simulator/emulator with auto-detection

### **Recommended Workflow**
1. Use **create-project** with parameters above
2. Extend project following guidelines in this PRD
3. Use **build-project** to compile
4. Use **deploy-app** to test on device
5. Reference this PRD throughout development

---

## 📚 **ADDITIONAL RESOURCES**

- **Salesforce Mobile SDK Documentation:** [https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/](https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/)
- **Template Reference:** See \`TEMPLATES.md\` in project tools
- **MobileSync Guide:** ${isDataHeavy ? 'Critical for offline functionality' : 'Not needed for this project'}

---

*🤖 This PRD was auto-generated by the Salesforce Mobile SDK MCP Server. Keep this document alongside your project for reference throughout development.*`;
  }

  /**
   * Save PRD document to a temporary location to avoid interfering with project creation
   */
  private savePRD(prdContent: string, outputDir: string, appName: string): string {
    try {
      // Save PRD in parent directory with app name prefix to avoid directory conflicts
      const tempPrdPath = join(outputDir, `${appName}_PROJECT_REQUIREMENTS.md`);

      // Ensure parent directory exists
      mkdirSync(outputDir, { recursive: true });

      writeFileSync(tempPrdPath, prdContent, 'utf8');

      // Add instructions to the PRD for moving it after project creation
      const updatedContent =
        prdContent +
        `

---

## 📁 **POST-CREATION SETUP**

**IMPORTANT**: This PRD was saved as \`${appName}_PROJECT_REQUIREMENTS.md\` to avoid conflicts during project creation.

**After your project is created, move this file:**
\`\`\`bash
mv "${tempPrdPath}" "${join(outputDir, appName, 'PROJECT_REQUIREMENTS.md')}"
\`\`\`

**Or on Windows:**
\`\`\`cmd
move "${tempPrdPath}" "${join(outputDir, appName, 'PROJECT_REQUIREMENTS.md')}"
\`\`\`

This ensures the PRD is properly located within your project directory for ongoing reference.
`;

      writeFileSync(tempPrdPath, updatedContent, 'utf8');
      return tempPrdPath;
    } catch (error) {
      console.warn('Failed to save PRD document:', error);
      return '';
    }
  }

  private generateSpecificGuidance(params: ProjectScaffoldGuidanceRequestType): {
    success: boolean;
    guidance: string;
    commands: string[];
    projectPath?: string;
    recommendedTemplate?: string;
    templateReason?: string;
    alternativeTemplates?: string[];
    extensionGuide?: {
      projectStructure: string;
      addingFeatures: string;
      commonPatterns: string;
      requiredFiles: string[];
      pitfalls: string[];
    };
    prdPath?: string;
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

      // Generate extension guide and embed it prominently in the main guidance
      const extensionGuide = template ? this.generateExtensionGuide(template, params) : undefined;

      // Enhance the main guidance with extension instructions
      let enhancedGuidance = guidance;

      // Add critical warning at the very beginning for iOS templates
      if (template && template.platform === 'ios') {
        const isDataHeavy =
          template.isOfflineFirst ||
          params.appType === 'data-heavy' ||
          template.templateId.includes('MobileSync');
        enhancedGuidance = `
## ⚠️ **CRITICAL iOS EXTENSION WARNING**

**🚨 MOST COMMON MISTAKE: When adding tabs to iOS apps, YOU MUST update SceneDelegate.swift!**

**❌ DON'T DO THIS:**
- Create new views without updating SceneDelegate
- ${!isDataHeavy ? 'Add userstore.json to basic templates (unnecessary)' : 'Forget to add userstore.json entries'}

**✅ DO THIS FIRST:**
- Update SceneDelegate.swift to point to MainTabView  
- ${isDataHeavy ? 'Update userstore.json and usersync.json' : 'Use direct REST API calls (NO userstore/usersync needed)'}

---

${guidance}`;
      } else {
        enhancedGuidance = guidance;
      }

      if (template) {
        const isDataHeavy =
          template.isOfflineFirst ||
          params.appType === 'data-heavy' ||
          template.templateId.includes('MobileSync');
        const isIOS = template.platform === 'ios';

        enhancedGuidance += `

## 🚀 **CRITICAL: Template Extension Guide**

**📋 WHEN EXTENDING THIS PROJECT, YOU MUST FOLLOW THESE INSTRUCTIONS:**

### **Adding Features Checklist:**

${
  isIOS
    ? `**STEP 1: Update SceneDelegate.swift (REQUIRED for adding tabs)**
\`\`\`swift
// SceneDelegate.swift - Update if adding TabView
func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = (scene as? UIWindowScene) else { return }
    
    self.window = UIWindow(windowScene: windowScene)
    
    // Update to TabView if adding multiple tabs
    let contentView = MainTabView() // Instead of single ContactsView
    
    self.window!.rootViewController = UIHostingController(rootView: contentView)
    self.window!.makeKeyAndVisible()
}
\`\`\`

**STEP 2: Create TabView Structure**
\`\`\`swift
struct MainTabView: View {
    var body: some View {
        TabView {
            ContactsListView()
                .tabItem {
                    Image(systemName: "person.2")
                    Text("Contacts")
                }
            
            OpportunitiesListView() // <-- New tab
                .tabItem {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                    Text("Opportunities")
                }
        }
    }
}
\`\`\`

`
    : ''
}**STEP ${isIOS ? '3' : '1'}: Create Data Model**
\`\`\`${isIOS ? 'swift' : 'kotlin'}
${
  isIOS
    ? `struct Opportunity: Codable, Identifiable {
    let id: String?
    let name: String
    let amount: Double?
    
    enum CodingKeys: String, CodingKey {
        case id = "Id"
        case name = "Name"
        case amount = "Amount"
    }
}`
    : `data class Opportunity(
    @SerializedName("Id") val id: String? = null,
    @SerializedName("Name") val name: String,
    @SerializedName("Amount") val amount: Double?
)`
}
\`\`\`

**STEP ${isIOS ? '4' : '2'}: Create Service Layer**
${
  isDataHeavy
    ? `${isIOS ? '- Update userstore.json with Opportunity soup schema' : ''}
${isIOS ? '- Update usersync.json with syncOpportunities configuration' : ''}
- Use MobileSync for offline data`
    : '- Use direct REST API calls (NO userstore.json/usersync.json needed)'
}

${extensionGuide?.addingFeatures || ''}

### **Required File Updates:**
${isIOS ? '✅ **SceneDelegate.swift - UPDATE FOR TABS (most commonly missed!)**' : ''}
${isDataHeavy ? '✅ **userstore.json - Add soup schemas for new objects**' : '❌ **NO userstore.json needed for basic templates**'}
${isDataHeavy ? '✅ **usersync.json - Add sync configurations**' : '❌ **NO usersync.json needed for basic templates**'}
✅ **Model classes - Data structures**
✅ **Service classes - Business logic**
✅ **View classes - UI components**

${extensionGuide?.requiredFiles.map(file => `✅ **${file}**`).join('\n') || ''}

### **⚠️ CRITICAL MISTAKES TO AVOID:**
${isIOS ? '❌ **MOST COMMON: SceneDelegate not updated** - App still shows single view instead of TabView' : ''}
${!isDataHeavy ? '❌ **Adding userstore.json unnecessarily** - Basic templates use direct API calls' : ''}
${isDataHeavy ? '❌ **Missing userstore.json entry** - Causes SmartStore "soup not found" errors' : ''}
${isDataHeavy ? '❌ **Missing usersync.json entry** - Sync operations fail silently' : ''}
❌ **Incorrect field API names** - Use exact Salesforce field names
${isIOS ? '❌ **Missing @StateObject/@ObservableObject** - SwiftUI reactive updates fail' : ''}

${extensionGuide?.pitfalls.map(pitfall => `❌ **${pitfall}**`).join('\n') || ''}

### **Architecture Patterns:**
${isDataHeavy ? 'MobileSync Pattern: Sync → Query → Modify → Upload' : 'Direct API Pattern: Authenticate → Query → Display'}
${extensionGuide?.commonPatterns || ''}

**⚡ REMEMBER: This is a ${template.templateId} template. ${isDataHeavy ? 'Use MobileSync for offline data.' : 'Use direct REST API calls.'} Follow the patterns above exactly!**
`;
      }

      // Generate and save PRD document
      let prdPath = '';
      if (template && params.outputDir && params.appName) {
        try {
          const prdContent = this.generatePRD(template, params);
          prdPath = this.savePRD(prdContent, params.outputDir, params.appName);

          if (prdPath) {
            enhancedGuidance += `

## 📋 **PRD DOCUMENT SAVED**

A comprehensive **Project Requirements Document** has been saved to:
\`${prdPath}\`

This PRD contains:
- ✅ **Template-specific extension guidelines**
- ✅ **Step-by-step development workflow** 
- ✅ **Exact tool usage instructions**
- ✅ **Architecture patterns and best practices**
- ✅ **Common pitfalls and solutions**

**🔧 AFTER PROJECT CREATION:** Move the PRD into your project directory:
\`\`\`bash
mv "${prdPath}" "${join(params.outputDir, params.appName, 'PROJECT_REQUIREMENTS.md')}"
\`\`\`

**💡 IMPORTANT: Keep this PRD alongside your project and reference it throughout development!**
`;
          }
        } catch (error) {
          console.warn('Failed to generate/save PRD:', error);
        }
      }

      return {
        success: true,
        guidance: enhancedGuidance,
        commands,
        projectPath,
        recommendedTemplate: template?.templateId,
        templateReason: template ? reason : undefined,
        alternativeTemplates: alternatives.map(alt => alt.templateId),
        extensionGuide,
        prdPath: prdPath || undefined,
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
