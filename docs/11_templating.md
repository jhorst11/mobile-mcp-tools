# Templating Strategy

## Overview

The `@salesforce/magen-templates` package provides an AI-friendly template system for generating Salesforce Mobile SDK applications. It enables both AI agents and developers to discover, select, and instantiate production-ready mobile app scaffolds through rich metadata and Handlebars-based processing.

---

## Core Concepts

### Design Philosophy

The template system is built on three principles:

1. **Self-Describing Templates** — Each template carries comprehensive metadata that explains its capabilities, use cases, and extension patterns, enabling AI agents to reason about and select appropriate templates autonomously.

2. **AI Guidance** — Templates include step-by-step instructions and code patterns for common customizations, allowing LLMs to extend generated applications without external documentation.

3. **Simple Processing** — Handlebars templating with minimal dependencies ensures predictable, transparent file generation.

### Template Types

Templates generate complete, buildable mobile applications:

| Platform | Language | Examples |
|----------|----------|----------|
| iOS | Swift/SwiftUI | `ios-native-swift`, `mobilesync-explorer-swift`, `agentforce-demo` |
| Android | Kotlin | `android-native-kotlin`, `mobilesync-explorer-kotlin` |

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
| `TemplateRegistry` | Discovers templates, loads metadata, provides search by platform/capabilities/tags |
| `TemplateSelector` | Ranks templates against requirements, returns scored matches with reasoning |
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
  
  "complexity": {
    "level": "moderate",
    "explanation": "Why this complexity level"
  },
  
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
      "difficulty": "simple",
      "affectedFiles": ["path/to/file.swift"],
      "aiGuidance": {
        "steps": ["Step 1", "Step 2"],
        "codePattern": {
          "model": "class {{Name}}Model { ... }"
        }
      }
    }
  ],
  
  "generation": {
    "fileTransforms": [
      { "pattern": "**/*.hbs", "processor": "handlebars" }
    ]
  }
}
```

### Key Metadata Fields

| Field | Purpose |
|-------|---------|
| `platform` | Target platform and version constraints |
| `capabilities` | Semantic tags for capability-based search |
| `complexity` | Difficulty level with explanation |
| `templateVariables` | User-provided values with validation |
| `extensionPoints` | AI guidance for post-generation customization |
| `generation.fileTransforms` | File processing rules |

---

## API Usage

### Programmatic Interface

```typescript
import { 
  TemplateRegistry, 
  TemplateSelector, 
  TemplateGenerator 
} from '@salesforce/magen-templates';

// 1. Discover available templates
const registry = new TemplateRegistry();
const templates = await registry.discoverTemplates();

// 2. Select best match for requirements
const selector = new TemplateSelector();
const match = await selector.selectTemplate(templates, {
  platform: 'ios',
  requiredCapabilities: ['offline-sync'],
  complexity: 'moderate'
});

// 3. Get full metadata
const metadata = await registry.getMetadata(match.template.id);

// 4. Generate project
const generator = new TemplateGenerator(registry);
const result = await generator.generate({
  templateId: match.template.id,
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

## Template Selection

The `TemplateSelector` scores templates against requirements using weighted criteria:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Platform match | Required | Must match exactly |
| Capability coverage | 0.4 | Percentage of required capabilities present |
| Complexity match | 0.3 | Distance from requested complexity level |
| Tag relevance | 0.1 | Overlap with requested tags |

Selection returns a `TemplateMatch` with:
- The selected template
- Numeric score
- Human-readable reasoning explaining the selection

---

## Generation Pipeline

```
┌─────────────────┐
│ Validate Config │  Check required variables, output path
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

### Handlebars Helpers

Built-in helpers for common transformations:

| Helper | Example Input | Output |
|--------|---------------|--------|
| `{{uppercase name}}` | `myApp` | `MYAPP` |
| `{{lowercase name}}` | `MyApp` | `myapp` |
| `{{capitalize name}}` | `myApp` | `MyApp` |
| `{{pascalCase name}}` | `my-app` | `MyApp` |
| `{{camelCase name}}` | `my-app` | `myApp` |

---

## Extension Points

Extension points provide AI guidance for post-generation customization:

```json
{
  "id": "add-sobject",
  "name": "Add SObject Support",
  "description": "Add support for a new Salesforce object",
  "difficulty": "moderate",
  "affectedFiles": [
    "SObjects/NewObject.swift",
    "UI/NewObjectListView.swift"
  ],
  "aiGuidance": {
    "overview": "Create model and view files following existing patterns",
    "steps": [
      "Create SObjects/{{ObjectName}}.swift following Contacts.swift pattern",
      "Create UI/{{ObjectName}}ListView.swift",
      "Add navigation entry in Tabs.swift"
    ],
    "codePattern": {
      "model": "class {{ObjectName}}: SFObject { ... }",
      "view": "struct {{ObjectName}}ListView: View { ... }"
    },
    "tips": [
      "Use existing SObject files as reference",
      "Follow established naming conventions"
    ]
  }
}
```

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

## Integration with MCP Server

The template system integrates with `@salesforce/mobile-native-mcp-server` to enable prompt-to-app workflows:

1. **Discovery** — MCP tools expose available templates and their capabilities
2. **Selection** — AI agents use requirements to select optimal templates
3. **Generation** — Templates are instantiated with user-provided variables
4. **Extension** — AI agents use extension points to customize generated apps

This enables the vision described in [Mobile Native App Generation](./5_mobile_native_app_generation.md): transforming natural language intent into production-ready native mobile applications.

---

## Creating New Templates

### Workflow

1. Build a working reference app with concrete values
2. Identify customization points (project name, identifiers, etc.)
3. Create template directory structure
4. Add `.hbs` extension to files needing variable substitution
5. Replace concrete values with `{{variableName}}` syntax
6. Create `template.json` with comprehensive metadata
7. Add extension points with AI guidance
8. Validate with `npx magen-templates validate <template-id>`

### Best Practices

- **Start concrete** — Build a working app first, then templatize
- **Minimal variables** — Only expose what genuinely needs customization
- **Rich metadata** — Invest in descriptions, use cases, and extension guidance
- **Test generation** — Verify the generated project builds and runs
- **Document extensions** — Provide clear AI guidance for common customizations
