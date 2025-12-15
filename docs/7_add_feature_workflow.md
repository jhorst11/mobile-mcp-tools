# Add Feature Workflow - Design Document

## Overview

The **Add Feature Workflow** is a specialized workflow within the `@salesforce/mobile-native-mcp-server` that enables adding features to existing iOS and Android mobile applications using feature templates. This workflow leverages the layered template system from `@salesforce/magen-templates` to discover, analyze, and integrate features into existing projects.

## Vision

Building upon the core native app generation workflow, the Add Feature workflow democratizes feature enhancement by making it easy to add sophisticated capabilities to existing mobile applications. Rather than requiring developers to manually integrate complex features, this workflow:

1. **Discovers** feature templates that match user requirements
2. **Analyzes** the minimal diff needed to add the feature
3. **Guides** the LLM to apply similar changes to the target project
4. **Validates** the integration through building and deployment

## Core Concepts

### Feature Templates

Feature templates are **layered templates** that extend base templates using git patches. They represent the minimal diff between:
- A base project (e.g., `ios-base`)
- A project with an additional feature (e.g., `ios-mobilesdk-login`)

The `layer.patch` file in a feature template contains:
- Files to be added
- Modifications to existing files
- Configuration changes

This patch serves as:
1. **Living documentation** of what changes are needed
2. **AI training data** for understanding feature integration patterns
3. **A guide** for applying similar changes to different projects

### Instruction-First Philosophy

Following the project's core principle of "instruction-first" tools, this workflow:
- **Guides** the LLM on how to integrate features rather than automating everything
- **Provides context** through patch analysis and integration instructions
- **Preserves agency** allowing the LLM to adapt to project-specific needs
- **Enables recovery** by exposing all information for self-healing

## Workflow Architecture

### Workflow Phases

The Add Feature workflow follows this sequence:

1. **User Input Collection**
   - Project path (existing iOS/Android project)
   - Feature description (what feature to add)

2. **Project Validation**
   - Verify path exists and is a valid project
   - Detect platform (iOS or Android)
   - Extract project name

3. **Feature Template Discovery**
   - List available feature templates for the platform
   - Filter to layered templates only (templates with `extends`)

4. **Feature Template Selection**
   - Match user's feature description to available templates
   - Select the most appropriate feature template

5. **Patch Inspection**
   - Read the `layer.patch` file from the feature template
   - Analyze what files are added, modified, or deleted
   - Generate a summary of the changes

6. **Feature Integration**
   - Provide detailed instructions to the LLM
   - Include the full patch content for reference
   - Guide the LLM to apply similar changes to the project

7. **Build Validation**
   - Build the project to verify changes
   - Recovery loop if build fails

8. **Deployment**
   - Deploy to device/simulator
   - Verify the feature works

9. **Completion**
   - Report success

### State Definition

The workflow state (`AddFeatureWorkflowState`) tracks:

```typescript
{
  // User input
  userInput: unknown,
  projectPath: string,
  featureDescription: string,
  
  // Project validation
  platform: 'iOS' | 'Android',
  projectName: string,
  validProject: boolean,
  
  // Feature template discovery
  featureTemplateOptions: TemplateListOutput,
  selectedFeatureTemplate: string,
  
  // Patch analysis
  patchContent: string,
  patchAnalysis: string,
  
  // Integration
  integrationSuccessful: boolean,
  integrationErrorMessages: string[],
  
  // Build & deployment (reused from main workflow)
  buildSuccessful: boolean,
  buildAttemptCount: number,
  buildErrorMessages: string[],
  deploymentStatus: string,
  
  // Error handling
  workflowFatalErrorMessages: string[]
}
```

## Workflow Nodes

### 1. ProjectValidationNode

**Purpose:** Validates that the provided path is a valid iOS or Android project

**Validation Logic:**
- **iOS:** Looks for `.xcodeproj` directory containing `project.pbxproj`
- **Android:** Looks for `build.gradle`, `settings.gradle`, and `app` module with `AndroidManifest.xml`

**Outputs:**
- `validProject: boolean`
- `platform: 'iOS' | 'Android'`
- `projectName: string`

### 2. FeatureTemplateFetchNode

**Purpose:** Discovers available feature templates for the platform

**Discovery Logic:**
- Uses `@salesforce/magen-templates` API to list templates
- Filters to only layered templates (those with `extends` property)
- Feature templates represent add-on capabilities

**Outputs:**
- `featureTemplateOptions: TemplateListOutput`

### 3. FeatureTemplateSelectionNode

**Purpose:** Selects the most appropriate feature template based on user's description

**Selection Logic:**
- Reuses the `sfmobile-native-template-selection` tool
- Matches feature description against template metadata
- Considers template descriptions, tags, and capabilities

**Outputs:**
- `selectedFeatureTemplate: string` (format: `template-name@version`)

### 4. PatchInspectionNode

**Purpose:** Analyzes the feature template's patch file to understand required changes

**Analysis Process:**
1. Locates the `layer.patch` file from the template
2. Parses the patch to identify:
   - New files to add
   - Existing files to modify
   - Files to delete
3. Generates a human-readable summary

**Outputs:**
- `patchContent: string` (full patch file)
- `patchAnalysis: string` (structured summary)

**Example Analysis Output:**
```
Feature Template: ios-mobilesdk-login

Patch Analysis:
- Total patch size: 387 lines

Files to be added (3):
  + LoginViewController.swift
  + AuthenticationManager.swift
  + LoginConfig.plist

Files to be modified (2):
  ~ AppDelegate.swift
  ~ Info.plist
```

### 5. FeatureIntegrationNode

**Purpose:** Provides comprehensive guidance for applying the feature to the project

**Integration Strategy:**
- Generates detailed integration instructions
- Includes full patch content for reference
- Provides platform-specific guidance (iOS vs Android)
- Highlights critical files to pay attention to

**Instruction Format:**
```markdown
# Feature Integration Instructions

## Context
- Project: MyApp
- Platform: iOS
- Location: /path/to/project
- Feature Template: ios-mobilesdk-login@1.0.0

## Patch Analysis
[Summary of changes]

## Integration Strategy
1. Review the patch content...
2. For each file in the patch...
3. Pay special attention to...

## Patch Content
```diff
[Full patch file content]
```

## Next Steps
After integration, the project will be built...
```

**Outputs:**
- `integrationSuccessful: boolean`
- `integrationErrorMessages: string[]`

### 6-9. Build, Deployment, and Completion

These nodes are reused from the main workflow:
- **BuildValidationNode:** Builds the project
- **BuildRecoveryNode:** Handles build failures
- **DeploymentNode:** Deploys to device/simulator
- **CompletionNode:** Reports success

## Routers

### CheckProjectValidRouter
Routes based on project validation:
- Success → `fetchFeatureTemplates`
- Failure → `failureNode`

### CheckFeatureIntegrationRouter
Routes based on integration result:
- Success → `validateBuild`
- Failure → `failureNode`

### CheckBuildSuccessfulRouter
Routes based on build result (reused from main workflow):
- Success → `deployApp`
- Failure (with retries) → `buildRecovery`
- Failure (no retries) → `failureNode`

## Workflow Graph

```
START
  ↓
initialUserInputExtraction
  ↓
[checkPropertiesFulfilled]
  ↓ (complete)          ↓ (missing)
projectValidation      getUserInput ⟲
  ↓
[checkProjectValid]
  ↓ (valid)            ↓ (invalid)
fetchFeatureTemplates  failureNode → END
  ↓
selectFeatureTemplate
  ↓
inspectPatch
  ↓
integrateFeature
  ↓
[checkFeatureIntegration]
  ↓ (success)          ↓ (failure)
validateBuild          failureNode → END
  ↓
[checkBuildSuccessful]
  ↓ (success)     ↓ (recoverable)    ↓ (failed)
deployApp        buildRecovery ⟲     failureNode → END
  ↓
completionNode
  ↓
END
```

## Usage Example

### User Intent
```
"Add Salesforce login capability to my iOS app at /path/to/MyApp"
```

### Workflow Execution

1. **Input Collection:**
   - projectPath: `/path/to/MyApp`
   - featureDescription: "Salesforce login capability"

2. **Project Validation:**
   - Detects iOS project
   - projectName: "MyApp"
   - platform: "iOS"

3. **Feature Discovery:**
   - Finds feature templates: `ios-mobilesdk-login`, `ios-agentforce`, etc.

4. **Template Selection:**
   - Selects `ios-mobilesdk-login@1.0.0` as best match

5. **Patch Inspection:**
   - Analyzes `layer.patch`
   - Identifies 5 new files, 3 modified files
   - Extracts key changes

6. **Integration:**
   - Provides detailed instructions to LLM
   - LLM applies changes to project
   - Reports success

7. **Build & Deploy:**
   - Builds project
   - Deploys to simulator
   - Verifies functionality

## Tool Integration

### Orchestrator Tool

**Tool ID:** `sfmobile-native-add-feature`

**Input:**
```typescript
{
  userInput?: {
    projectPath?: string,
    featureDescription?: string
  },
  workflowStateData?: {
    thread_id: string
  }
}
```

**Output:**
```typescript
{
  orchestrationInstructionsPrompt: string
}
```

### Registration

The Add Feature orchestrator is registered in `index.ts` alongside the main project manager:

```typescript
const addFeatureOrchestrator = new MobileNativeAddFeatureOrchestrator(server);
addFeatureOrchestrator.register(orchestratorAnnotations);
```

## Design Principles

### 1. Reuse Existing Infrastructure

The workflow reuses:
- Build validation and recovery nodes
- Deployment node
- Completion and failure nodes
- User input collection infrastructure

### 2. Leverage Magen Templates

The workflow fully leverages the `@salesforce/magen-templates` package:
- Template discovery API
- Layered template system
- Patch file format
- Template metadata

### 3. Instruction-First Approach

Rather than automatically applying patches, the workflow:
- Provides comprehensive context
- Guides the LLM to make informed decisions
- Preserves flexibility for project-specific adaptations
- Enables error recovery through transparency

### 4. Platform Agnostic

The workflow handles both iOS and Android:
- Platform detection is automatic
- Feature templates are platform-specific
- Integration instructions adapt to platform

## Future Enhancements

### Potential Improvements

1. **Direct Patch Application**
   - Use git patch tools to automatically apply changes
   - Fallback to LLM guidance for conflicts

2. **Conflict Resolution**
   - Detect when target project differs from base template
   - Provide guidance on resolving conflicts

3. **Multi-Feature Support**
   - Add multiple features in sequence
   - Handle dependencies between features

4. **Custom Feature Creation**
   - Guide users to create their own feature templates
   - Extract features from existing projects

5. **Feature Validation**
   - Test that feature functionality works correctly
   - Automated feature smoke tests

## Relationship to Main Workflow

The Add Feature workflow complements the main Mobile Native App Generation workflow:

| Aspect | Main Workflow | Add Feature Workflow |
|--------|---------------|---------------------|
| **Purpose** | Create new app from scratch | Add feature to existing app |
| **Input** | Project name, platform, template | Project path, feature description |
| **Templates** | Base and layered templates | Feature templates only (layered) |
| **Validation** | Environment, platform, plugins | Project validity |
| **Generation** | Full project scaffolding | Feature integration guidance |
| **Use Case** | Initial app creation | Incremental enhancement |

Both workflows share:
- Build validation and recovery
- Deployment infrastructure
- Completion and failure handling
- User input collection patterns

## Summary

The Add Feature Workflow represents a powerful extension to the Mobile Native MCP Server, enabling:

1. **Feature Democratization:** Anyone can add sophisticated features to mobile apps
2. **Template Reuse:** Leverage existing feature templates as guides
3. **LLM-Guided Integration:** Smart, adaptive feature application
4. **Build Validation:** Ensure features integrate correctly
5. **Production Ready:** Full deployment pipeline

By combining the power of layered templates, instruction-first tools, and LLM intelligence, this workflow makes it easy to enhance existing mobile applications with new capabilities.

