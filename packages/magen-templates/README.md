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
# List available templates (with inheritance tree)
magen-template list

# Filter by platform or tags
magen-template list --platform ios
magen-template list --tag salesforce,mobile-sdk

# Get detailed template information
magen-template info ios-base

# Show layer.patch diff for layered templates
magen-template template diff ios-mobilesdk

# Generate an app from a template
magen-template generate ios-base --out ./my-app \
  --var projectName="My App" \
  --var bundleIdentifier="com.example.myapp"

# Generate interactively with prompts
magen-template generate --interactive

# Generate specific template interactively
magen-template generate ios-base --interactive

# Create a new template
magen-template template create my-template --based-on ios-base

# Create a new version of a template
magen-template template version ios-base 1.1.0

# Test a template (creates test/ directory)
magen-template template test my-template

# Watch for changes and auto-regenerate test directory
magen-template template test my-template --watch

# Create a layer patch from changes
magen-template template layer my-template
```

### Enhanced UX Features

The CLI includes several UX improvements:

- **Interactive Mode**: Use `--interactive` flag for guided template generation with prompts
- **Smart Error Messages**: Get helpful suggestions when template names are mistyped
- **Template Info**: Use `magen-template info <name>` for detailed template information including:
  - Inheritance chain visualization
  - Required and optional variables
  - Usage examples
- **Progress Indicators**: See real-time progress during generation
- **Colorized Output**: Templates, inheritance chains, and messages use colors for better readability

### Programmatic Usage

#### High-Level API (Recommended)

The high-level API provides abstracted, ergonomic functions for common operations:

```typescript
import {
  searchTemplates,
  getTemplateInfo,
  generate,
  findSimilarTemplates,
  apiValidateTemplateVariables,
} from '@salesforce/magen-templates';

// Search templates
const result = searchTemplates({
  platform: 'ios',
  tags: ['salesforce', 'mobile-sdk'],
  query: 'login',
});

console.log(`Found ${result.total} templates`);
result.templates.forEach(t => console.log(t.name));

// Get detailed template information
const info = getTemplateInfo('ios-mobilesdk-login');
console.log(info.inheritanceChain); // Full inheritance chain
console.log(info.requiredVariables); // List of required variables

// Validate variables before generating
const validation = apiValidateTemplateVariables('ios-base', {
  projectName: 'My App',
});

if (!validation.valid) {
  console.error(validation.errors);
  console.log('Missing:', validation.missingRequired);
}

// Generate an app
const genResult = generate({
  templateName: 'ios-base',
  outputDirectory: './my-app',
  variables: {
    projectName: 'My App',
    bundleIdentifier: 'com.example.myapp',
    organization: 'Example Inc',
  },
});

console.log(`Generated ${genResult.templateUsed} to ${genResult.outputDirectory}`);

// Find similar template names (for error suggestions)
const similar = findSimilarTemplates('ios-bas'); // Returns ['ios-base']
```

#### Low-Level Core API

For advanced use cases, you can use the core API directly:

```typescript
import { listTemplates, getTemplate, generateApp } from '@salesforce/magen-templates';

// List all templates
const templates = listTemplates();

// Get a specific template
const template = getTemplate('ios-base');

// Generate an app
generateApp({
  templateName: 'ios-base',
  outputDirectory: './my-app',
  variables: {
    projectName: 'My App',
    bundleIdentifier: 'com.example.myapp',
  },
});
```

## Template Structure

Templates are organized in version directories to support multiple versions:

```
templates/
  ios-base/
    1.0.0/
      template.json
      variables.json
      template/...
    1.0.1/
      template.json
      variables.json
      template/...
```

## JSON Schema Support

The package includes JSON Schema files for IDE autocompletion and validation. Add a `$schema` property to your template files:

### template.json (Base Template)

```json
{
  "$schema": "../../schemas/template.schema.json",
  "name": "my-template",
  "platform": "ios",
  "version": "1.0.0",
  "tags": ["ios", "swift"],
  "description": "My custom iOS template"
}
```

### template.json (Layered Template)

```json
{
  "$schema": "../../schemas/template.schema.json",
  "name": "my-custom-template",
  "platform": "ios",
  "version": "1.0.0",
  "extends": {
    "template": "ios-base",
    "version": "1.0.0",
    "patchFile": "layer.patch"
  }
}
```

The `extends` object allows you to:

- **Specify the parent template** (`template`)
- **Lock to a specific parent version** (`version`) - **REQUIRED** to ensure compatibility
- **Define the patch file** (`patchFile`) - defaults to `layer.patch`

### Version Resolution

When looking up templates:

- `getTemplate("ios-base")` returns the latest version (highest semver)
- `getTemplate("ios-base", "1.0.0")` returns specific version 1.0.0
- `findTemplate("ios-base@1.0.0")` also returns version 1.0.0

### Creating New Versions

To create a new version of a template:

```bash
# Copy existing version
mkdir templates/ios-base/1.0.1
cp -r templates/ios-base/1.0.0/* templates/ios-base/1.0.1/

# Update version in template.json to "1.0.1"
# Make your changes
```

### variables.json

```json
{
  "$schema": "../../schemas/variables.schema.json",
  "variables": [
    {
      "name": "appName",
      "type": "string",
      "required": true,
      "description": "The name of the application",
      "default": "MyApp"
    }
  ]
}
```

This enables:

- **Autocomplete** in VS Code and other editors
- **Inline validation** of required fields and types
- **Hover documentation** for all properties
- **Version locking** - layered templates specify exact parent versions
- **Multiple versions** - maintain and use different template versions simultaneously

## Documentation

For detailed documentation, see the [design document](../../docs/11_templates/magen-template-design-doc.md).

## Development Status

This package is currently in Phase 0 of development. See the [implementation plan](../../docs/11_templates/magen-templates-implementation-plan.md) for details.

## License

MIT
