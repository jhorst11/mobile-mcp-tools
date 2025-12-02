# @salesforce/magen-templates

AI-friendly mobile app template system for Salesforce platform development.

## Overview

`magen-templates` is a flexible, extensible template system designed specifically for AI agents and developers building mobile applications. It provides:

- **Rich Metadata**: Comprehensive, machine-readable template descriptions
- **AI Guidance**: Step-by-step instructions for template customization
- **Extension Points**: Clear patterns for extending generated applications
- **Validation**: Automated template structure and metadata validation
- **Simple Architecture**: Handlebars-based processing with minimal dependencies

## Installation

```bash
npm install @salesforce/magen-templates
```

## Quick Start

### CLI Usage

```bash
# List available templates
npx magen-templates list

# Show template details
npx magen-templates info ios-swiftui-contact-app

# Generate a project
npx magen-templates generate \
  --template ios-swiftui-contact-app \
  --output ./MyApp \
  --projectName MyApp \
  --packageName com.example.myapp \
  --organization "My Company"

# Validate a template
npx magen-templates validate ios-swiftui-contact-app

# Search by capability
npx magen-templates search --capability offline-sync
```

### Programmatic Usage

```typescript
import { TemplateRegistry, TemplateSelector, TemplateGenerator } from '@salesforce/magen-templates';

// Discover templates
const registry = new TemplateRegistry();
const templates = await registry.discoverTemplates();

// Select best match
const selector = new TemplateSelector();
const match = await selector.selectTemplate(templates, {
  platform: 'ios',
  requiredCapabilities: ['contact-management', 'offline-sync'],
  complexity: 'moderate',
});

// Get full metadata
const metadata = await registry.getMetadata(match.template.id);

// Generate project
const generator = new TemplateGenerator(registry);
const result = await generator.generate({
  templateId: match.template.id,
  metadata,
  variables: {
    projectName: 'MyApp',
    packageName: 'com.example.myapp',
    organization: 'My Company',
  },
  outputPath: './MyApp',
});

console.log(`Generated ${result.files.length} files`);
```

## Template Structure

Templates follow this structure:

```
my-template/
├── template.json          # Rich metadata
├── template/              # Template files
│   ├── {{projectName}}.xcodeproj/
│   ├── {{projectName}}/
│   │   ├── AppDelegate.swift.hbs
│   │   ├── ContentView.swift
│   │   └── ...
│   └── Podfile.hbs
├── scripts/
│   ├── prepare.js         # Optional pre-generation hook
│   └── finalize.js        # Optional post-generation hook
└── docs/
    ├── README.md
    └── ARCHITECTURE.md
```

### Template Metadata

The `template.json` file contains comprehensive metadata:

```json
{
  "$schema": "https://salesforce.github.io/magen-templates/schemas/template-v1.json",
  "version": "1.0.0",
  "type": "application",
  "id": "my-template",
  "displayName": "My Template",
  "description": "A description of what this template provides",
  "platform": {
    "type": "ios",
    "minVersion": "15.0"
  },
  "capabilities": ["capability-1", "capability-2"],
  "extensionPoints": [
    {
      "id": "add-feature",
      "name": "Add Custom Feature",
      "description": "How to add a custom feature",
      "aiGuidance": {
        "steps": ["Step 1: Create new files", "Step 2: Modify existing files"],
        "exampleFiles": ["ExampleFile.swift"],
        "codePattern": {
          "model": "class {{Name}}Model { ... }"
        }
      }
    }
  ],
  "templateVariables": [
    {
      "name": "projectName",
      "type": "string",
      "description": "The project name",
      "required": true,
      "validation": "^[A-Za-z][A-Za-z0-9_]*$"
    }
  ]
}
```

## Creating Templates

See the [documentation](../../docs/11_templating.md) for comprehensive template authoring guide.

### Quick Template Creation Workflow

1. **Build a working app** with concrete values
2. **Identify template variables** (what should be customizable)
3. **Create template structure** and copy your app
4. **Add `.hbs` extension** to files needing variable substitution
5. **Replace concrete values** with `{{variableName}}` syntax
6. **Create template.json** with rich metadata
7. **Add extension points** with AI guidance
8. **Test generation** with validation

## Features

### For AI Agents

- **Self-Describing**: Templates explain their own capabilities
- **Rich Guidance**: Step-by-step instructions for customization
- **Code Patterns**: Template snippets for common extensions
- **Semantic Tags**: Capability-based template discovery
- **Clear Reasoning**: Selection explanations

### For Developers

- **Simple**: Handlebars templates, standard JSON metadata
- **Flexible**: Support for both simple and complex templates
- **Validated**: Automated checking of template structure
- **Transparent**: Clear file processing rules
- **Extensible**: Easy to add new templates

## API Reference

### TemplateRegistry

```typescript
class TemplateRegistry {
  discoverTemplates(): Promise<TemplateInfo[]>;
  getMetadata(templateId: string): Promise<TemplateMetadata>;
  searchByPlatform(platform: Platform): Promise<TemplateInfo[]>;
  searchByCapabilities(capabilities: string[]): Promise<TemplateInfo[]>;
  validateTemplate(templateId: string): Promise<ValidationResult>;
}
```

### TemplateSelector

```typescript
class TemplateSelector {
  selectTemplate(
    templates: TemplateInfo[],
    requirements: TemplateRequirements
  ): Promise<TemplateMatch>;

  rankTemplates(
    templates: TemplateInfo[],
    requirements: TemplateRequirements
  ): Promise<RankedTemplate[]>;

  explainSelection(match: TemplateMatch): string;
}
```

### TemplateGenerator

```typescript
class TemplateGenerator {
  generate(context: GenerationContext): Promise<GenerationResult>;
  preview(context: GenerationContext): Promise<GenerationPreview>;
  validateConfig(context: GenerationContext): Promise<ValidationResult>;
}
```

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.
