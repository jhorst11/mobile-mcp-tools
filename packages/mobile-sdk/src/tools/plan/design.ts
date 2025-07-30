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
  ProjectDesignPlanRequest,
  ProjectDesignPlanResponse,
  type ProjectDesignPlanRequestType,
} from '../../schemas/mobileSdkSchema.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Tool for creating comprehensive design documents and implementation plans
 * for mobile app development projects.
 */
export class PlanDesignTool implements Tool {
  readonly name = 'Plan Design';
  readonly toolId = 'plan-design';
  readonly description = `
Creates a comprehensive design document and implementation plan for your mobile app project.

This tool analyzes your project requirements and generates:
- **Executive Summary** - Project vision and objectives  
- **Functional Requirements** - Detailed feature specifications
- **Technical Architecture** - System design and component structure
- **User Experience Design** - Screen flows and interaction patterns
- **Implementation Roadmap** - Phase-by-phase development plan
- **Success Metrics** - KPIs and measurement criteria

The design document is saved alongside your project for continuous reference throughout development.

**Usage Examples:**
\`\`\`json
{
  "projectPath": "/path/to/your/project",
  "projectDescription": "A CRM mobile app for sales teams to manage leads and opportunities on the go",
  "requirements": [
    "User authentication with Salesforce",
    "Offline data synchronization", 
    "Lead capture and management",
    "Opportunity pipeline view",
    "Customer interaction history"
  ],
  "userStories": [
    "As a sales rep, I want to capture leads while offline so that I don't lose prospects",
    "As a manager, I want to view team performance metrics so that I can coach effectively"
  ],
  "targetAudience": "Sales representatives and managers using Salesforce CRM",
  "platforms": ["ios", "android"]
}
\`\`\`

**Benefits:**
- Provides clear project direction and scope
- Prevents feature creep and scope expansion
- Enables accurate time estimation
- Creates shared understanding among stakeholders
- Serves as reference throughout development lifecycle
`;

  readonly inputSchema = ProjectDesignPlanRequest;
  readonly outputSchema = ProjectDesignPlanResponse;

  /**
   * Generate comprehensive design document based on requirements
   */
  private generateDesignDocument(params: ProjectDesignPlanRequestType): string {
    const currentDate = new Date().toISOString().split('T')[0];
    const projectName = this.extractProjectName(params.projectPath);

    return `# Project Design Document
**Project:** ${projectName}  
**Generated:** ${currentDate}  
**Path:** ${params.projectPath}

---

## 📋 **EXECUTIVE SUMMARY**

### **Project Vision**
${params.projectDescription}

### **Target Audience**
${params.targetAudience || 'Mobile app users requiring Salesforce integration'}

### **Business Objectives**
${params.businessGoals?.length ? params.businessGoals.map(goal => `- ${goal}`).join('\n') : '- Improve user productivity through mobile access\n- Enhance data collection and synchronization\n- Provide offline-first capabilities for field users'}

### **Success Metrics**
- User adoption rate > 80% within 3 months
- Data sync accuracy > 99.5%
- App performance: < 3 second load times
- User satisfaction score > 4.5/5
${params.businessGoals?.length ? '\n' + params.businessGoals.map(goal => `- ${goal} (measurable outcome TBD)`).join('\n') : ''}

---

## 🎯 **FUNCTIONAL REQUIREMENTS**

### **Core Features**
${params.requirements?.length ? params.requirements.map(req => `- **${req}**`).join('\n') : '- User authentication and authorization\n- Data synchronization with Salesforce\n- Offline data access and modification\n- Real-time notifications\n- Reporting and analytics'}

### **User Stories**
${params.userStories?.length ? params.userStories.map(story => `- ${story}`).join('\n') : '- As a user, I want to access my data offline so that I can work without internet connectivity\n- As a user, I want real-time sync so that my data is always up-to-date\n- As an admin, I want usage analytics so that I can optimize the app experience'}

### **Technical Constraints**
${params.technicalConstraints?.length ? params.technicalConstraints.map(constraint => `- ${constraint}`).join('\n') : '- Must integrate with existing Salesforce org\n- Support offline-first architecture\n- Comply with corporate security policies\n- Meet platform app store requirements'}

---

## 🏗️ **TECHNICAL ARCHITECTURE**

### **System Overview**
\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Mobile App                           │
├─────────────────────────────────────────────────────────┤
│  Presentation Layer                                     │
│  ├─ UI Components (SwiftUI/Jetpack Compose)           │
│  ├─ View Controllers/Activities                        │
│  └─ Navigation & Routing                               │
├─────────────────────────────────────────────────────────┤
│  Business Logic Layer                                   │
│  ├─ ViewModels/Presenters                             │
│  ├─ Use Cases/Interactors                             │
│  └─ Data Validation & Transformation                   │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                            │
│  ├─ Repository Pattern                                 │
│  ├─ Local Storage (SmartStore/SQLite)                 │
│  ├─ Remote API Client (Salesforce REST/GraphQL)       │
│  └─ Sync Engine (MobileSync)                          │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                Salesforce Platform                      │
│  ├─ REST APIs                                          │
│  ├─ GraphQL APIs                                       │
│  ├─ Streaming APIs (PushTopic/Platform Events)        │
│  └─ Authentication (OAuth 2.0)                        │
└─────────────────────────────────────────────────────────┘
\`\`\`

### **Key Components**

#### **Authentication Module**
- OAuth 2.0 flow with Salesforce
- Token refresh mechanism
- Biometric authentication (optional)
- Session management

#### **Data Synchronization**
- Bidirectional sync with Salesforce
- Conflict resolution strategies
- Batch operations for performance
- Background sync capabilities

#### **Offline Support**
- Local data storage using SmartStore
- Queue for offline operations
- Smart sync prioritization
- Offline indicators in UI

#### **External Integrations**
${params.integrations?.length ? params.integrations.map(integration => `- **${integration}**`).join('\n') : '- Salesforce REST/GraphQL APIs\n- Push notification services\n- Analytics and crash reporting\n- Third-party SDKs as needed'}

---

## 🎨 **USER EXPERIENCE DESIGN**

### **Design Principles**
- **Mobile-First**: Optimized for mobile interaction patterns
- **Offline-Ready**: Graceful degradation when offline
- **Consistent**: Follows platform design guidelines
- **Accessible**: Supports accessibility features
- **Performance**: Fast loading and smooth animations

### **Key User Flows**

#### **Authentication Flow**
1. App launch → Check existing session
2. If no session → Present login screen
3. OAuth flow with Salesforce
4. Biometric setup (optional)
5. Navigate to main dashboard

#### **Data Access Flow**
1. Navigate to data list
2. Pull-to-refresh sync
3. Search/filter options
4. Detail view access
5. Edit/create actions
6. Offline queue management

#### **Sync Management Flow**
1. Background sync monitoring
2. Conflict resolution UI
3. Sync status indicators
4. Manual sync triggers
5. Error handling and retry

### **Screen Structure**
- **Dashboard**: Overview of key metrics and recent activity
- **Data Lists**: Scrollable lists with search and filter
- **Detail Views**: Full record information with edit capabilities
- **Forms**: Data entry with validation and offline queuing
- **Settings**: Sync preferences, account management, app configuration

---

## 🚀 **IMPLEMENTATION ROADMAP**

### **Phase 1: Foundation (Weeks 1-3)**
**Goal**: Establish core architecture and authentication

**Tasks:**
- Set up project scaffolding using Mobile SDK templates
- Implement OAuth authentication flow
- Configure Connected App in Salesforce
- Set up local data storage (SmartStore)
- Create basic navigation structure
- Implement offline detection

**Deliverables:**
- Working authentication
- Basic app shell with navigation
- Local storage foundation

**Dependencies:**
- Salesforce org access
- Connected App configuration
- Development environment setup

### **Phase 2: Core Data Layer (Weeks 4-6)**
**Goal**: Implement data synchronization and offline capabilities

**Tasks:**
- Configure MobileSync for key objects
- Implement sync engine with conflict resolution
- Create repository pattern for data access
- Set up background sync processes
- Implement offline queue management
- Add sync status indicators

**Deliverables:**
- Bidirectional data sync
- Offline operation queuing
- Conflict resolution

**Dependencies:**
- Phase 1 completion
- Salesforce object schema definition

### **Phase 3: User Interface (Weeks 7-10)**
**Goal**: Build core user interfaces and interactions

**Tasks:**
- Implement dashboard with key metrics
- Create data list views with search/filter
- Build detail views with edit capabilities
- Develop forms with validation
- Add pull-to-refresh functionality
- Implement navigation patterns

**Deliverables:**
- Complete UI for core features
- Responsive design
- Platform-specific interactions

**Dependencies:**
- Phase 2 completion
- UI/UX design specifications

### **Phase 4: Advanced Features (Weeks 11-13)**
**Goal**: Add advanced functionality and optimizations

**Tasks:**
- Implement push notifications
- Add advanced search capabilities
- Create reporting/analytics views
- Implement bulk operations
- Add export/sharing features
- Performance optimizations

**Deliverables:**
- Enhanced user experience
- Advanced feature set
- Performance benchmarks met

**Dependencies:**
- Phase 3 completion
- Push notification setup

### **Phase 5: Testing & Deployment (Weeks 14-16)**
**Goal**: Comprehensive testing and production deployment

**Tasks:**
- Unit testing implementation
- Integration testing
- User acceptance testing
- Performance testing
- Security review
- App store preparation and submission

**Deliverables:**
- Production-ready application
- Test coverage reports
- Deployment documentation
- App store listings

**Dependencies:**
- All previous phases
- App store developer accounts

---

## 📊 **QUALITY ASSURANCE**

### **Testing Strategy**
- **Unit Tests**: 80%+ code coverage for business logic
- **Integration Tests**: API integration and data sync
- **UI Tests**: Critical user flows automation
- **Performance Tests**: Load testing and memory profiling
- **Security Tests**: Penetration testing and vulnerability assessment

### **Performance Benchmarks**
- App launch time: < 3 seconds
- Data sync time: < 30 seconds for initial sync
- UI responsiveness: < 100ms interaction feedback
- Memory usage: < 200MB peak
- Battery efficiency: < 5% drain per hour of active use

### **Security Requirements**
- Data encryption at rest and in transit
- Certificate pinning for API communications
- Secure token storage using keychain/keystore
- Biometric authentication where supported
- OWASP Mobile Top 10 compliance

---

## 🛠️ **DEVELOPMENT TOOLS & WORKFLOW**

### **Required Tools**
- **Mobile SDK Tools**: create-project, build-project, deploy-app
- **IDE**: Xcode (iOS) / Android Studio (Android)
- **Version Control**: Git with feature branching
- **CI/CD**: Automated build and test pipeline
- **Monitoring**: Crash reporting and analytics

### **Development Workflow**
1. **Planning**: Reference this design document for requirements
2. **Development**: Use Mobile SDK tools for scaffolding and build
3. **Testing**: Automated testing on each commit
4. **Review**: Code review process for quality assurance
5. **Deployment**: Staged rollout with monitoring

### **Key Commands**
\`\`\`bash
# Project creation (already done)
# Use create-project tool with appropriate parameters

# Development build
# Use build-project tool for compilation

# Testing deployment  
# Use deploy-app tool for simulator/emulator testing

# Production deployment
# Follow app store submission guidelines
\`\`\`

---

## 📚 **ADDITIONAL RESOURCES**

### **Documentation References**
- [Salesforce Mobile SDK Documentation](https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/)
- [MobileSync Framework Guide](https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/offline_intro.htm)
- Platform-specific guidelines (iOS HIG / Material Design)

### **Existing Assets to Leverage**
${params.existingAssets?.length ? params.existingAssets.map(asset => `- ${asset}`).join('\n') : '- Current Salesforce org configuration\n- Existing business processes\n- User training materials\n- Corporate design guidelines'}

### **Timeline Considerations**
${params.timeline || 'Target completion: 16 weeks from project start\nKey milestones: End of each phase\nBuffer time: 20% added for unexpected challenges'}

---

## 🎯 **NEXT STEPS**

### **Immediate Actions**
1. **Review and Approval**: Stakeholder review of this design document
2. **Resource Allocation**: Assign development team and confirm availability
3. **Environment Setup**: Configure development and testing environments
4. **Detailed Planning**: Break down Phase 1 tasks into daily work items

### **Key Decisions Needed**
- Specific Salesforce objects to include in initial scope
- UI/UX design approval and asset creation
- Testing environment configuration
- App store account setup and branding decisions

### **Risk Mitigation**
- **Technical Risk**: Prototype key integrations early
- **Timeline Risk**: Prioritize MVP features for Phase 1 release
- **Resource Risk**: Cross-train team members on critical components
- **User Adoption Risk**: Conduct user research and early feedback sessions

---

*🤖 This design document was generated by the Salesforce Mobile SDK MCP Server. Save this document alongside your project and reference it throughout the development lifecycle. Update as requirements evolve.*`;
  }

  /**
   * Generate phase-by-phase implementation plan
   */
  private generateImplementationPlan(params: ProjectDesignPlanRequestType) {
    const phases = [
      {
        phase: 'Phase 1: Foundation',
        description: 'Establish core architecture and authentication',
        estimatedDuration: '3 weeks',
        tasks: [
          'Set up project scaffolding using Mobile SDK templates',
          'Implement OAuth authentication flow',
          'Configure Connected App in Salesforce',
          'Set up local data storage (SmartStore)',
          'Create basic navigation structure',
          'Implement offline detection',
        ],
        dependencies: [
          'Salesforce org access',
          'Connected App configuration',
          'Development environment setup',
        ],
      },
      {
        phase: 'Phase 2: Core Data Layer',
        description: 'Implement data synchronization and offline capabilities',
        estimatedDuration: '3 weeks',
        tasks: [
          'Configure MobileSync for key objects',
          'Implement sync engine with conflict resolution',
          'Create repository pattern for data access',
          'Set up background sync processes',
          'Implement offline queue management',
          'Add sync status indicators',
        ],
        dependencies: ['Phase 1 completion', 'Salesforce object schema definition'],
      },
      {
        phase: 'Phase 3: User Interface',
        description: 'Build core user interfaces and interactions',
        estimatedDuration: '4 weeks',
        tasks: [
          'Implement dashboard with key metrics',
          'Create data list views with search/filter',
          'Build detail views with edit capabilities',
          'Develop forms with validation',
          'Add pull-to-refresh functionality',
          'Implement navigation patterns',
        ],
        dependencies: ['Phase 2 completion', 'UI/UX design specifications'],
      },
      {
        phase: 'Phase 4: Advanced Features',
        description: 'Add advanced functionality and optimizations',
        estimatedDuration: '3 weeks',
        tasks: [
          'Implement push notifications',
          'Add advanced search capabilities',
          'Create reporting/analytics views',
          'Implement bulk operations',
          'Add export/sharing features',
          'Performance optimizations',
        ],
        dependencies: ['Phase 3 completion', 'Push notification setup'],
      },
      {
        phase: 'Phase 5: Testing & Deployment',
        description: 'Comprehensive testing and production deployment',
        estimatedDuration: '3 weeks',
        tasks: [
          'Unit testing implementation',
          'Integration testing',
          'User acceptance testing',
          'Performance testing',
          'Security review',
          'App store preparation and submission',
        ],
        dependencies: ['All previous phases', 'App store developer accounts'],
      },
    ];

    // Customize phases based on requirements
    if (params.requirements?.some(req => req.toLowerCase().includes('push notification'))) {
      phases[3].tasks.unshift('Configure push notification services');
    }

    if (params.requirements?.some(req => req.toLowerCase().includes('analytics'))) {
      phases[3].tasks.push('Integrate analytics SDK');
    }

    return phases;
  }

  /**
   * Extract project name from path
   */
  private extractProjectName(projectPath: string): string {
    const parts = projectPath.split('/');
    return parts[parts.length - 1] || 'Mobile App Project';
  }

  /**
   * Save design document to project directory
   */
  private saveDesignDocument(designContent: string, projectPath: string): string {
    try {
      // Ensure project directory exists
      if (!existsSync(projectPath)) {
        mkdirSync(projectPath, { recursive: true });
      }

      const designDocPath = join(projectPath, 'DESIGN_DOCUMENT.md');
      writeFileSync(designDocPath, designContent, 'utf8');
      return designDocPath;
    } catch (error) {
      console.warn('Failed to save design document:', error);
      return '';
    }
  }

  /**
   * Generate architecture overview
   */
  private generateArchitectureOverview(params: ProjectDesignPlanRequestType): string {
    const projectName = this.extractProjectName(params.projectPath);

    return `## ${projectName} - Technical Architecture

**Architecture Pattern**: MVVM (Model-View-ViewModel)
**Data Strategy**: Offline-first with bidirectional sync
**Platform Integration**: Salesforce Mobile SDK

### Key Components:
- **Presentation Layer**: Platform-native UI components
- **Business Logic**: ViewModels with reactive programming
- **Data Layer**: Repository pattern with SmartStore + Salesforce APIs
- **Sync Engine**: MobileSync for offline/online data synchronization

### External Dependencies:
${params.integrations?.length ? params.integrations.map(integration => `- ${integration}`).join('\n') : '- Salesforce REST/GraphQL APIs\n- Push notification services\n- Analytics platform'}

### Security Considerations:
- OAuth 2.0 with Salesforce
- Data encryption at rest and in transit
- Certificate pinning for API communications
- Secure credential storage using platform keychain`;
  }

  private async handleRequest(args: any) {
    try {
      const params = this.inputSchema.parse(args);

      // Validate that project path exists or can be created
      if (!existsSync(params.projectPath)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: `Project path does not exist: ${params.projectPath}. Please ensure the project directory exists or use create-project tool first.`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Generate comprehensive design document
      const designDocument = this.generateDesignDocument(params);
      const implementationPlan = this.generateImplementationPlan(params);
      const architectureOverview = this.generateArchitectureOverview(params);

      // Save design document
      const designDocumentPath = this.saveDesignDocument(designDocument, params.projectPath);

      const nextSteps = [
        'Review and approve this design document with stakeholders',
        'Set up development environment using Mobile SDK tools',
        'Configure Salesforce Connected App for mobile access',
        'Begin Phase 1 implementation following the roadmap',
        'Reference this document throughout development for consistency',
      ];

      const result = {
        success: true,
        designDocumentPath,
        implementationPlan,
        architectureOverview,
        nextSteps,
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: false,
                error: `Failed to generate design plan: ${error.message}`,
              },
              null,
              2
            ),
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
