# Templating Strategy

## Overview

The `@salesforce/magen-templates` package provides an AI-friendly template system for generating Salesforce mobile applications. It enables both AI agents and developers to discover, select, and instantiate production-ready mobile app scaffolds through rich metadata and Handlebars-based processing.

## Core Concepts

### Design Philosophy

The template system is built on four principles:

1. **Self-Describing Templates** — Each template carries comprehensive metadata that explains its capabilities, use cases, and extension patterns, enabling AI agents to reason about and select appropriate templates autonomously.

2. **Programmatic API** — Direct TypeScript/JavaScript API enables MCP server integration and other programmatic workflows without requiring CLI invocation or shell commands.

3. **Platform Agnostic** — While initially focused on Salesforce mobile apps, the system is designed to support any application type through flexible metadata and processing patterns.

4. **Simple Processing** — Handlebars templating with minimal dependencies ensures predictable, transparent file generation.

---

## Architecture

### Package Structure

```
magen-templates/
├── src/
│   ├── registry/        # Template discovery and caching
│   ├── selection/       # AI-driven template matching
│   ├── generation/      # Handlebars processing and file output
│   ├── validation/      # Schema and structure validation
│   └── types/           # TypeScript definitions and Zod schemas
├── templates/           # Bundled template directories
└── schemas/             # JSON Schema for template.json validation
```

### Core Components

| Component | Responsibility |
|-----------|---------------|
| `TemplateRegistry` | Discovers templates, loads metadata, provides filtering by platform/capabilities/tags |
| `TemplateGenerator` | Processes template files, substitutes variables, executes hooks |
| `TemplateValidator` | Validates template structure and metadata against schema |

---

## Template Structure

Each template follows this layout:

```
my-template/
├── template.json        # Metadata specification
├── template/            # Source files (may contain {{variables}})
│   ├── {{projectName}}.xcodeproj/
│   ├── {{projectName}}/
│   │   ├── AppDelegate.swift.hbs
│   │   └── ContentView.swift
│   └── Podfile.hbs
└── scripts/             # Optional pre/post hooks
    ├── prepare.js
    └── finalize.js
```

### File Processing Rules

| Pattern | Behavior |
|---------|----------|
| `*.hbs` | Handlebars processing, `.hbs` extension stripped |
| Path contains `{{var}}` | Variable substitution in path |
| All other files | Copied verbatim |

---

## Template Metadata Schema

The `template.json` file defines everything needed for discovery, selection, and generation:

```json
{
  "$schema": "../../schemas/template-v1.json",
  "version": "1.0.0",
  "type": "application",
  "id": "my-template",
  "displayName": "My Template",
  "description": "What this template provides",
  "extends": "ios-base",
  
  "platform": {
    "type": "ios",
    "minVersion": "15.0"
  },
  
  "useCase": {
    "primary": "Brief description of primary use case",
    "scenarios": ["Scenario 1", "Scenario 2"],
    "when": "When to choose this template"
  },
  
  "capabilities": ["offline-sync", "contact-management"],
  "tags": ["ios", "swift", "mobilesdk"],
  
  "templateVariables": [
    {
      "name": "projectName",
      "type": "string",
      "description": "The project name",
      "required": true,
      "validation": "^[A-Za-z][A-Za-z0-9_]*$"
    }
  ],
  
  "extensionPoints": [
    {
      "id": "add-feature",
      "name": "Add Custom Feature",
      "description": "How to add a custom feature",
      "affectedFiles": ["path/to/file.swift"],
      "aiGuidance": "Create a new model file following the existing pattern. Implement the required protocol. Register the feature in the main configuration."
    }
  ],
  
  "generation": {
    "fileTransforms": [
      { "pattern": "**/*.hbs", "processor": "handlebars" },
      { "pattern": "**/*.swift", "processor": "handlebars" },
      { "pattern": "**/*.png", "processor": "copy" },
      { "pattern": "**/Podfile", "processor": "handlebars", "outputExtension": "" }
    ],
    "fileOperations": [
      { "action": "rename", "from": "ExampleApp", "to": "{{projectName}}" },
      { "action": "delete", "from": ".DS_Store" }
    ]
  }
}
```

### Key Metadata Fields

| Field | Purpose |
|-------|---------|
| `extends` | Template ID to inherit from (optional) |
| `platform` | Target platform and version constraints |
| `capabilities` | Semantic tags for capability-based search |
| `templateVariables` | User-provided values with validation |
| `extensionPoints` | Guidance for post-generation customization |
| `generation.fileTransforms` | File processing rules |
| `hidden` | If true, hide from discovery (for base templates) |

---

## API Usage

### Programmatic Interface

```typescript
import { 
  TemplateRegistry, 
  TemplateGenerator 
} from '@salesforce/magen-templates';

// 1. Discover available templates
const registry = new TemplateRegistry();
const allTemplates = await registry.discoverTemplates();

// 2. Filter by platform (required)
const iosTemplates = allTemplates.filter(t => t.platform.type === 'ios');

// 3. Filter by capabilities (optional)
const matchingTemplates = iosTemplates.filter(t => 
  t.capabilities.includes('offline-sync')
);

// 4. Examine template metadata to make informed selection
for (const template of matchingTemplates) {
  console.log(`Template: ${template.displayName}`);
  console.log(`Description: ${template.description}`);
  console.log(`Use Case: ${template.useCase.primary}`);
  console.log(`Capabilities: ${template.capabilities.join(', ')}`);
  
  // Get full metadata including extension points and variables
  const metadata = await registry.getMetadata(template.id);
  console.log(`Extension Points: ${metadata.extensionPoints?.length || 0}`);
  console.log(`Required Variables:`, 
    metadata.templateVariables.filter(v => v.required).map(v => v.name)
  );
}

// 5. AI agent or developer selects appropriate template
const selectedTemplateId = 'ios-native-swift'; // Based on analysis above

// 6. Get full metadata for generation
const metadata = await registry.getMetadata(selectedTemplateId);

// 7. Generate project
const generator = new TemplateGenerator(registry);
const result = await generator.generate({
  templateId: selectedTemplateId,
  metadata,
  variables: {
    projectName: 'MyApp',
    organization: 'My Company',
    bundleIdentifier: 'com.example.myapp'
  },
  outputPath: './MyApp'
});
```

### CLI Interface

```bash
# List templates
npx magen-templates list

# Show template details
npx magen-templates info ios-native-swift

# Generate project
npx magen-templates generate \
  --template ios-native-swift \
  --output ./MyApp \
  --projectName MyApp \
  --organization "My Company"

# Validate template
npx magen-templates validate ios-native-swift

# Search by capability
npx magen-templates search --capability offline-sync
```

---

```typescript
// Agent receives user request: "iOS app for managing contacts with offline support"

// 1. Extract requirements from natural language
const requirements = {
  platform: 'ios',
  capabilities: ['offline-sync', 'contact-management']
};

// 2. Discover and filter
const templates = await registry.discoverTemplates();
const candidates = templates.filter(t => 
  t.platform.type === requirements.platform &&
  requirements.capabilities.every(cap => t.capabilities.includes(cap))
);

// 3. Examine each candidate
for (const template of candidates) {
  const metadata = await registry.getMetadata(template.id);
  
  // Agent reasons about:
  // - Does use case align with "managing contacts"?
  // - Are extension points suitable for customization?
  // - Are capabilities comprehensive or will extensions be needed?
  // - Do required variables match available inputs?
}

// 4. Agent makes informed selection and explains reasoning
const selected = 'mobilesync-explorer-swift';
const reasoning = [
  'Matches platform: iOS with Swift/SwiftUI',
  'Provides required capabilities: offline-sync, contact-management',
  'Use case aligns: "Mobile SDK data explorer with offline sync"',
  'Extension points enable adding custom SObjects',
  'All required variables can be satisfied',
  'Template features align well with user requirements'
];
```

---

## Generation Pipeline

```
┌─────────────────┐
│ Validate Config │  Check required variables, types, regex patterns, output path
└────────┬────────┘
         ▼
┌─────────────────┐
│  Pre-Hook       │  Optional scripts/prepare.js
└────────┬────────┘
         ▼
┌─────────────────┐
│ Process Files   │  Apply fileTransforms, substitute variables
└────────┬────────┘
         ▼
┌─────────────────┐
│ File Operations │  Renames, moves, deletes
└────────┬────────┘
         ▼
┌─────────────────┐
│  Post-Hook      │  Optional scripts/finalize.js
└────────┬────────┘
         ▼
┌─────────────────┐
│ Return Result   │  Files created, warnings, instructions
└─────────────────┘
```

---

## Template Composition and Layering

### Motivation

As template libraries grow, duplication becomes a maintenance burden. Multiple templates targeting the same platform often share:

- Common project structure and build configurations
- Standard template variables (e.g., `projectName`, `bundleIdentifier`)
- Shared file transforms and operations
- Platform-specific capabilities and extension points
- Boilerplate metadata

The composition system eliminates this duplication through template inheritance and merging.

---

### Composition Strategy

Templates can inherit from **base templates** and override or extend specific sections. This creates a layered architecture:

```
┌─────────────────────────────────────────┐
│  Concrete Template (ios-salesforce-    │  ← User-facing, specialized
│                      example)           │
│  - Specific capabilities                │
│  - Additional variables                 │
│  - Custom extension points              │
└──────────────┬──────────────────────────┘
               │ extends
┌──────────────▼──────────────────────────┐
│  Base Template (ios-salesforce-base)    │  ← Platform foundation
│  - Common iOS + Salesforce setup        │
│  - Standard variables                   │
│  - Shared file transforms               │
└──────────────┬──────────────────────────┘
               │ extends
┌──────────────▼──────────────────────────┐
│  Platform Base (ios-base)               │  ← Pure platform defaults
│  - iOS project structure                │
│  - Standard iOS variables               │
│  - Platform capabilities                │
└─────────────────────────────────────────┘
```

---

### Metadata Schema Extension

Add an `extends` field to `template.json`:

```json
{
  "$schema": "../../schemas/template-v1.json",
  "extends": "ios-salesforce-base",
  "version": "0.0.1",
  "type": "application",
  "id": "ios-mobilesync",
  "displayName": "iOS MobileSync",
  "description": "Production-ready iOS app with MobileSync",
  
  "capabilities": ["mobilesync", "offline-sync"],
  
  "templateVariables": [
    {
      "name": "enableWidgets",
      "type": "boolean",
      "description": "Enable iOS widget support",
      "required": false,
      "default": false
    }
  ]
}
```

The `extends` field references a base template by ID. Templates in `templates/` with `hidden: true` are reserved for base templates.

---

### Merge Semantics

When loading a template with `extends`, the system performs a deep merge:

| Field | Merge Behavior |
|-------|----------------|
| **Scalar fields** (`id`, `displayName`, `description`, `version`) | Child overrides parent |
| **`platform`** | Deep merge: child overrides specific keys, inherits others |
| **`useCase`** | Deep merge: child can override `primary`, append to `scenarios` |
| **`capabilities`** | **Union**: child capabilities added to parent's |
| **`tags`** | **Union**: child tags added to parent's |
| **`templateVariables`** | **Merge by name**: child variables override or extend parent's |
| **`extensionPoints`** | **Merge by id**: child extension points override or extend parent's |
| **`generation.fileTransforms`** | **Prepend**: child transforms processed before parent's |
| **`generation.fileOperations`** | **Prepend**: child operations processed before parent's |
| **`documentation`** | Deep merge: child overrides specific keys |
| **`requirements`** | Deep merge: child overrides or adds requirements |

---

### Example: iOS Base Template

Create `templates/ios-base/template.json` (hidden base):

```json
{
  "$schema": "../../schemas/template-v1.json",
  "version": "1.0.0",
  "type": "application",
  "id": "ios-base",
  "displayName": "iOS Base Template",
  "description": "Foundation for all iOS templates",
  "hidden": true,
  
  "platform": {
    "type": "ios",
    "minVersion": "15.0",
    "language": "swift",
    "framework": "swiftui"
  },
  
  "capabilities": ["native-ios", "swift", "swiftui"],
  "tags": ["ios", "swift"],
  
  "templateVariables": [
    {
      "name": "projectName",
      "type": "string",
      "description": "The name of the iOS project",
      "required": true,
      "validation": "^[A-Za-z][A-Za-z0-9_]*$",
      "example": "MyApp"
    },
    {
      "name": "organization",
      "type": "string",
      "description": "Organization name for Xcode project",
      "required": true,
      "example": "My Company"
    },
    {
      "name": "bundleIdentifier",
      "type": "string",
      "description": "iOS bundle identifier",
      "required": true,
      "validation": "^[a-z][a-z0-9-]*(\\.[a-z][a-z0-9-]*)+$",
      "example": "com.mycompany.myapp"
    }
  ],
  
  "generation": {
    "fileTransforms": [
      { "pattern": "**/*.swift", "processor": "handlebars" },
      { "pattern": "**/*.plist", "processor": "handlebars" },
      { "pattern": "**/project.pbxproj", "processor": "handlebars" },
      { "pattern": "**/*.png", "processor": "copy" },
      { "pattern": "**/*.jpg", "processor": "copy" }
    ]
  },
  
  "requirements": {},
  "useCase": {
    "primary": "iOS application base",
    "scenarios": [],
    "when": "Internal base template"
  }
}
```

---

### Example: iOS Salesforce Base Template

Create `templates/ios-salesforce-base/template.json`:

```json
{
  "$schema": "../../schemas/template-v1.json",
  "extends": "ios-base",
  "version": "1.0.0",
  "type": "application",
  "id": "ios-salesforce-base",
  "displayName": "iOS Salesforce Base Template",
  "description": "Foundation for iOS Salesforce Mobile SDK apps",
  "hidden": true,
  
  "capabilities": ["salesforce-sdk", "oauth", "smartstore"],
  "tags": ["salesforce"],
  
  "templateVariables": [
    {
      "name": "salesforceConsumerKey",
      "type": "string",
      "description": "Salesforce Connected App Consumer Key",
      "required": false,
      "sensitive": true,
      "example": "3MVG9..."
    },
    {
      "name": "salesforceCallbackUrl",
      "type": "string",
      "description": "OAuth callback URL",
      "required": false,
      "default": "myapp://auth/callback"
    }
  ],
  
  "extensionPoints": [
    {
      "id": "salesforce-auth",
      "name": "Salesforce Authentication",
      "description": "Configure OAuth and connected app settings",
      "aiGuidance": "Update bootconfig.plist with your Connected App credentials"
    }
  ],
  
  "generation": {
    "fileTransforms": [
      { "pattern": "**/bootconfig.plist", "processor": "handlebars" },
      { "pattern": "**/Podfile", "processor": "handlebars" }
    ]
  },
  
  "requirements": {
    "salesforce": {
      "connectedApp": true
    }
  },
  
  "useCase": {
    "primary": "Salesforce iOS base",
    "scenarios": [],
    "when": "Internal base template"
  }
}
```

---

### Example: Concrete Template Using Composition

Simplified `ios-mobilesync/template.json`:

```json
{
  "$schema": "../../schemas/template-v1.json",
  "extends": "ios-salesforce-base",
  "version": "0.0.1",
  "id": "ios-mobilesync",
  "displayName": "iOS MobileSync",
  "description": "Production-ready iOS app with MobileSync",
  
  "useCase": {
    "primary": "Production-ready iOS app with full Salesforce data synchronization",
    "scenarios": [
      "Offline-first mobile applications",
      "Complex data relationships and sync"
    ],
    "when": "Use when you need full Salesforce data synchronization"
  },
  
  "capabilities": ["mobilesync", "offline-sync", "contact-management"],
  "tags": ["mobilesync", "offline"],
  
  "extensionPoints": [
    {
      "id": "salesforce-objects",
      "name": "Salesforce Objects",
      "description": "Add new Salesforce objects",
      "affectedFiles": [
        "template/MobileSyncExplorerSwift/SObjects/Contacts.swift"
      ],
      "aiGuidance": "Create SObject data classes following ContactSObjectData pattern"
    }
  ],
  
  "requirements": {
    "skillLevel": "intermediate",
    "estimatedTime": "45 minutes"
  }
}
```

**Result after merge:**
- Inherits all iOS base variables (`projectName`, `bundleIdentifier`, etc.)
- Inherits Salesforce variables (`salesforceConsumerKey`, etc.)
- Adds MobileSync-specific capabilities
- Combines extension points from all layers
- All file transforms from base templates apply

---

### Implementation Considerations

#### 1. Template Resolution Order

```typescript
// In TemplateRegistry.getMetadata(templateId)
async getMetadata(templateId: string): Promise<TemplateMetadata> {
  const template = await this.loadTemplate(templateId);
  
  if (!template.extends) {
    return template;
  }
  
  // Recursive resolution
  const parent = await this.getMetadata(template.extends);
  return this.mergeTemplates(parent, template);
}
```

#### 2. Circular Dependency Detection

```typescript
private resolveChain(templateId: string, visited = new Set()): void {
  if (visited.has(templateId)) {
    throw new Error(`Circular dependency detected: ${[...visited, templateId].join(' → ')}`);
  }
  visited.add(templateId);
  
  const template = this.loadTemplate(templateId);
  if (template.extends) {
    this.resolveChain(template.extends, visited);
  }
}
```

#### 3. File System Layering

**Important**: Only concrete templates have a `template/` directory with actual files.

Base templates are **metadata-only**:

```
ios-base/
  └── template.json           # Metadata only

ios-salesforce-base/
  └── template.json           # Metadata only

ios-salesforce-example/
  ├── template.json           # Metadata (extends parent)
  └── template/               # Actual code files
      └── ... all source files
```

When generating from `ios-salesforce-example`:
1. Metadata is merged from all layers (ios-base → ios-salesforce-base → ios-salesforce-example)
2. Files are taken **only** from `ios-salesforce-example/template/`
3. The merged file transforms (from all layers) are applied to those files

**If multiple concrete templates extend the same base**:
```
ios-salesforce-example/template/  ← Example app files
ios-salesforce-production/template/  ← Production app files (different implementation)
```
Both inherit the same Salesforce metadata, but provide different code implementations.

#### 4. Variable Inheritance and Overrides

```typescript
function mergeVariables(
  parent: TemplateVariable[],
  child: TemplateVariable[]
): TemplateVariable[] {
  const merged = new Map<string, TemplateVariable>();
  
  // Start with parent variables
  for (const v of parent) {
    merged.set(v.name, v);
  }
  
  // Child overrides or adds
  for (const v of child) {
    merged.set(v.name, v);
  }
  
  return Array.from(merged.values());
}
```

---

### Best Practices

#### 1. Base Template Design

- **Keep base templates minimal**: Only shared essentials
- **Metadata only**: Base templates should NOT have a `template/` directory with code files
- **Use `hidden: true`**: Prevent direct instantiation
- **Document inheritance**: Explain what children should override

**Rule of Thumb**: Base templates define **what** to process (file transforms, variables). Concrete templates provide **what** to process (actual files).

#### 2. Inheritance Depth

- **Limit to 2-3 levels**: Avoid deep hierarchies
- **Recommended structure**:
  - Level 1: Platform base (`ios-base`, `android-base`)
  - Level 2: SDK/framework base (`ios-salesforce-base`, `android-salesforce-base`)
  - Level 3: Feature-specific templates (`ios-mobilesync`, `ios-agentforce-demo`)

#### 3. Capability Naming

- **Inherit platform capabilities**: Don't redefine `native-ios`, `swift`
- **Add feature capabilities**: `mobilesync`, `offline-sync`, `agentforce`

#### 4. Documentation Inheritance

Child templates should:
- Inherit common getting-started links
- Override `readme` with feature-specific content
- Add `externalLinks` for specialized features

## Handlebars Templating

The template system uses [Handlebars](https://handlebarsjs.com/) for variable substitution and file processing. Handlebars provides a simple, logic-less templating syntax that makes it easy to inject values into template files.

### Basic Variable Substitution

```handlebars
// Simple variable substitution
let projectName = "{{projectName}}";
let bundleId = "{{bundleIdentifier}}";
```

### Built-in Helpers

The system includes helpers for common string transformations:

| Helper | Example Input | Output |
|--------|---------------|--------|
| `{{uppercase name}}` | `myApp` | `MYAPP` |
| `{{lowercase name}}` | `MyApp` | `myapp` |
| `{{capitalize name}}` | `myApp` | `MyApp` |
| `{{pascalCase name}}` | `my-app` | `MyApp` |
| `{{camelCase name}}` | `my-app` | `myApp` |

For more advanced Handlebars features (conditionals, loops, custom helpers), see the [Handlebars documentation](https://handlebarsjs.com/guide/).

---

## Extension Points

Extension points provide guidance for post-generation customization:

```json
{
  "id": "add-sobject",
  "name": "Add SObject Support",
  "description": "Add support for a new Salesforce object",
  "affectedFiles": [
    "SObjects/NewObject.swift",
    "UI/NewObjectListView.swift"
  ],
  "aiGuidance": "Create model and view files following existing patterns. Create SObjects/{{ObjectName}}.swift following the Contacts.swift pattern. Create UI/{{ObjectName}}ListView.swift for the list view. Add navigation entry in Tabs.swift. Use existing SObject files as reference and follow established naming conventions."
}
```

The `aiGuidance` field provides free-form text guidance that AI agents can use to understand how to extend the generated application. It can reference template variables using `{{variableName}}` syntax and should describe the general approach and point to example files.

---

## Validation

Templates are validated against:

1. **Schema compliance** — `template.json` matches the JSON Schema
2. **Required fields** — All mandatory metadata present
3. **Variable consistency** — Variables in files match `templateVariables`
4. **File references** — `affectedFiles` in extension points exist

```typescript
const result = await registry.validateTemplate('my-template');
// { valid: boolean, errors: [], warnings: [] }
```

---