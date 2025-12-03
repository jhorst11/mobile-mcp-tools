# Templating Strategy

## Overview

The `@salesforce/magen-templates` package provides an AI-friendly template system for generating Salesforce mobile applications. It enables both AI agents and developers to discover, select, and instantiate production-ready mobile app scaffolds through rich metadata and Handlebars-based processing.

---

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
| `platform` | Target platform and version constraints |
| `capabilities` | Semantic tags for capability-based search |
| `templateVariables` | User-provided values with validation |
| `extensionPoints` | Guidance for post-generation customization |
| `generation.fileTransforms` | File processing rules |

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