# @salesforce/magen-templates

A layered, platform-agnostic app templating engine inspired by Docker's image layering.

## Features

- **Buildable Authoring Instances**: Edit templates as real, buildable projects
- **Inline Variable Annotations**: Define template variables directly in code
- **Automatic Schema Extraction**: Generate variable schemas from annotations
- **Layered Template Inheritance**: Build templates on top of other templates using git patches
- **Full Filename Templating**: Template file and directory names, including Xcode project files
- **CLI + TypeScript API**: Use from command line or programmatically

## Installation

```bash
npm install @salesforce/magen-templates
```

## Requirements

- Node.js 18+
- Git (required for template layering)

## Quick Start

### CLI Usage

```bash
# List available templates
magen-template list

# Show template details
magen-template show ios-base

# Generate an app from a template
magen-template generate ios-salesforce --out ./my-app

# Create a new template
magen-template template create my-template --from ios-base

# Finalize a template after editing
magen-template template finalize my-template
```

### Programmatic Usage

```typescript
import { listTemplates, getTemplate, generateApp } from '@salesforce/magen-templates';

// List all templates
const templates = await listTemplates();

// Get a specific template
const template = await getTemplate('ios-salesforce');

// Generate an app
await generateApp({
  templateName: 'ios-salesforce',
  outputDirectory: './my-app',
  variables: {
    appName: 'My App',
    orgId: 'abc123',
  },
});
```

## Documentation

For detailed documentation, see the [design document](../../docs/11_templates/magen-template-design-doc.md).

## Development Status

This package is currently in Phase 0 of development. See the [implementation plan](../../docs/11_templates/magen-templates-implementation-plan.md) for details.

## License

MIT
