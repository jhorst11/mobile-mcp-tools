# Magen Templates: Design Document

## Overview

Magen Templates (`@salesforce/magen-templates`) is a layered, platform-agnostic app templating engine that enables rapid mobile application scaffolding with inheritance-based template composition. Think "Docker layers for app templates."

**Package:** `@salesforce/magen-templates`  
**Status:** Production-ready with 200+ tests  
**NPM:** Ready for publication

## Core Concept

Instead of copying and modifying entire templates, Magen uses **git patches** to express incremental changes on top of base templates, creating a powerful composition model.

```
ios-mobilesdk-login@1.0.0
  └─ extends ios-mobilesdk@1.0.0 (via layer.patch)
     └─ extends ios-base@1.0.0 (via layer.patch)
```

## Key Features

### 1. Layered Template Inheritance

Templates can build on other templates using git patches, enabling:
- **Code reuse** across similar templates
- **Incremental changes** instead of duplication
- **Version pinning** for stable dependencies
- **Multi-layer composition** (3+ levels deep)

### 2. Buildable Authoring

Templates are real, buildable projects:
- Author in Xcode, Android Studio, or VS Code
- Build and run during development
- Use `work/` directory for layered template editing
- Generate patches automatically from working changes

### 3. Variable System

Handlebars-based templating with type-safe variables:
- **Type system:** string, number, boolean, enum
- **Default values** for optional configuration
- **Validation** with regex patterns
- **JSON Schema** support for IDE autocomplete

### 4. Enhanced CLI UX

Modern developer experience with:
- **Interactive mode** with prompts
- **Smart error messages** with suggestions
- **Colorized output** with inheritance trees
- **Progress indicators** during generation

### 5. Programmatic API

High-level TypeScript API for integration:
- Template search and discovery
- Variable validation
- App generation
- Error handling with suggestions

## Architecture

### Directory Structure

```
templates/
  template-name/
    version/              # Semantic version (e.g., 1.0.0)
      template.json       # Template metadata
      variables.json      # Variable definitions
      template/           # Base template files (for base templates)
      layer.patch         # Git patch (for layered templates)
      work/              # Working directory (for layered templates)
      README.md
```

### Template Types

#### Base Template
Self-contained template with no parent:

```
ios-base/1.0.0/
  ├── template.json
  ├── variables.json
  ├── template/
  │   ├── {{projectName}}/
  │   │   ├── AppDelegate.swift
  │   │   └── ContentView.swift
  │   └── {{projectName}}.xcodeproj/
  └── README.md
```

#### Layered Template
Extends another template via patch:

```
ios-mobilesdk/1.0.0/
  ├── template.json        # References ios-base@1.0.0
  ├── layer.patch         # Git diff from parent
  ├── work/               # Materialized parent + changes
  └── README.md
```

### Schema Files

**template.json:**
```json
{
  "$schema": "../../schemas/template.schema.json",
  "name": "ios-mobilesdk",
  "platform": "ios",
  "version": "1.0.0",
  "description": "iOS app with Salesforce Mobile SDK",
  "tags": ["ios", "swift", "salesforce", "mobile-sdk"],
  "extends": {
    "template": "ios-base",
    "version": "1.0.0",
    "patchFile": "layer.patch"
  }
}
```

**variables.json:**
```json
{
  "$schema": "../../schemas/variables.schema.json",
  "variables": [
    {
      "name": "projectName",
      "type": "string",
      "required": true,
      "default": "MyApp",
      "description": "The display name of the application"
    },
    {
      "name": "salesforceConsumerKey",
      "type": "string",
      "required": true,
      "description": "Salesforce Connected App Consumer Key"
    }
  ]
}
```

## Workflows

### Creating a Base Template

```bash
# 1. Create template structure
magen-template template create my-base --platform ios

# 2. Edit files in templates/my-base/1.0.0/template/
# 3. Define variables in templates/my-base/1.0.0/variables.json

# 4. Test the template
magen-template template test my-base

# 5. Generate an app to verify
magen-template generate my-base --out ./test-app
```

### Creating a Layered Template

```bash
# 1. Create based on parent
magen-template template create my-layer \
  --based-on my-base \
  --platform ios

# 2. Edit files in templates/my-layer/1.0.0/work/
#    (This directory contains materialized parent + your changes)

# 3. Generate the patch from your changes
magen-template template layer my-layer

# 4. Test the layered template
magen-template template test my-layer

# 5. Watch mode for rapid iteration
magen-template template test my-layer --watch
```

### Versioning Templates

```bash
# Create a new version of existing template
magen-template template version my-base 2.0.0

# Create from specific source version
magen-template template version my-base 2.0.0 \
  --source-version 1.5.0

# For layered templates, work/ is auto-generated
# Edit work/, then regenerate patch:
magen-template template layer my-layer \
  --out templates/my-layer/2.0.0
```

### Generating Applications

```bash
# Standard generation
magen-template generate ios-mobilesdk \
  --out ~/MyApp \
  --var projectName="MyApp" \
  --var salesforceConsumerKey="abc123"

# Interactive mode (prompts for all inputs)
magen-template generate --interactive

# Get help for a template
magen-template info ios-mobilesdk
```

## Template System Details

### Materialization Process

When generating from a layered template:

1. **Resolve inheritance chain:**
   ```
   ios-mobilesdk-login@1.0.0
     → ios-mobilesdk@1.0.0
       → ios-base@1.0.0
   ```

2. **Materialize from bottom up:**
   - Start with `ios-base@1.0.0` files
   - Apply `ios-mobilesdk@1.0.0` patch
   - Apply `ios-mobilesdk-login@1.0.0` patch

3. **Render variables:**
   - Replace `{{variableName}}` in content
   - Replace `{{variableName}}` in filenames
   - Replace in directory names (including `.xcodeproj`)

4. **Write to output directory**

### Patch Generation

Patches are created using git:

1. **Initialize git repo** in temp directory
2. **Copy parent files** and commit
3. **Copy child work/ files** and stage
4. **Generate diff** with `git diff --cached`
5. **Save as `layer.patch`**

System files (`.DS_Store`, `*.xcuserstate`, etc.) are automatically excluded.

### Variable Inheritance

Child templates inherit parent variables:

```typescript
// ios-base defines:
{ name: "projectName", required: true, default: "MyApp" }

// ios-mobilesdk adds:
{ name: "salesforceConsumerKey", required: true }

// ios-mobilesdk-login inherits both
// Total: 7 variables (3 from base, 2 from mobilesdk, 2 from login)
```

Variables can be overridden by redefining them in child `variables.json`.

## API Usage

### High-Level API (Recommended)

```typescript
import {
  searchTemplates,
  getTemplateInfo,
  generate,
  apiValidateTemplateVariables,
  findSimilarTemplates,
} from '@salesforce/magen-templates';

// Search templates
const results = searchTemplates({
  platform: 'ios',
  tags: ['salesforce', 'mobile-sdk'],
  query: 'login',
});

// Get detailed info
const info = getTemplateInfo('ios-mobilesdk');
console.log(info.inheritanceChain);
// ['ios-mobilesdk@1.0.0', 'ios-base@1.0.0']

// Validate before generating
const validation = apiValidateTemplateVariables('ios-mobilesdk', {
  projectName: 'MyApp',
});

if (!validation.valid) {
  console.error('Missing:', validation.missingRequired);
  process.exit(1);
}

// Generate app
const result = generate({
  templateName: 'ios-mobilesdk',
  outputDirectory: './my-app',
  variables: { projectName: 'MyApp' },
});

// Handle errors with suggestions
try {
  generate({ templateName: 'ios-bas', ... });
} catch (error) {
  const suggestions = findSimilarTemplates('ios-bas');
  // Returns: ['ios-base', 'ios-mobilesdk']
}
```

### Low-Level Core API

```typescript
import {
  listTemplates,
  findTemplate,
  generateApp,
  createLayer,
  materializeTemplate,
} from '@salesforce/magen-templates';

// Direct access to core functions
const templates = listTemplates({ platform: 'ios' });
const template = findTemplate('ios-base@1.0.0');

generateApp({
  templateName: 'ios-base',
  outputDirectory: './output',
  variables: { projectName: 'MyApp' },
});
```

## Production Templates

### Current Templates

1. **ios-base@1.0.0**
   - Platform: iOS
   - Type: Base template
   - Description: Minimal SwiftUI app
   - Variables: 3 (all with defaults)

2. **ios-mobilesdk@1.0.0**
   - Platform: iOS
   - Type: Layered (extends ios-base@1.0.0)
   - Description: Salesforce Mobile SDK integration
   - Variables: 7 (5 with defaults, 2 required)
   - Features: OAuth, SDK initialization, Podfile

3. **ios-mobilesdk-login@1.0.0**
   - Platform: iOS
   - Type: Layered (extends ios-mobilesdk@1.0.0)
   - Description: Custom login UI
   - Variables: 7 (inherited)
   - Features: Hidden gear icon, custom branding

### Template Validation

All templates include:
- ✅ Cycle detection (prevents circular dependencies)
- ✅ Version compatibility checks
- ✅ Patch application testing
- ✅ Variable validation
- ✅ Generation smoke tests

## Testing

### Test Coverage

- **200 tests** across 13 test suites
- **100% critical path coverage**
- **Integration tests** with real templates
- **Production template validation**

### Test Categories

1. **Core Functionality** (70 tests)
   - Discovery, generation, layering
   - Variable validation, schema parsing
   - Git operations

2. **CLI Commands** (36 tests)
   - List, info, generate, diff
   - Interactive mode, error handling
   - Template create/version/layer

3. **API Layer** (20 tests)
   - Search, validation, generation
   - Error helpers, similarity matching

4. **Template Versioning** (12 tests)
   - Version resolution, pinning
   - Multi-version support

5. **Production Templates** (18 tests)
   - Discovery, metadata, generation
   - Layering correctness, cycles
   - Version compatibility

6. **Formatting & UX** (9 tests)
   - Template info display
   - Example usage generation
   - Variable categorization

## Future Enhancements

### Potential Features

1. **Template Upgrade Command**
   - Automated parent version upgrades
   - Conflict detection and resolution
   - Interactive merge tools

2. **Template Registry**
   - Remote template discovery
   - Version management
   - Community templates

3. **Cross-Platform Templates**
   - Shared logic across iOS/Android
   - Platform-specific overrides

4. **Template Composition**
   - Multiple inheritance (mixins)
   - Feature flags
   - Conditional patches

5. **IDE Integration**
   - VS Code extension
   - Xcode plugin
   - Live preview

## Best Practices

### Template Authoring

1. **Version pin your dependencies**
   ```json
   "extends": {
     "template": "ios-base",
     "version": "1.0.0"  // ← Always specify!
   }
   ```

2. **Use semantic versioning**
   - Major: Breaking changes
   - Minor: New features (backward compatible)
   - Patch: Bug fixes

3. **Document your templates**
   - Include README.md
   - Describe use cases
   - Provide examples

4. **Test before releasing**
   ```bash
   magen-template template test my-template
   magen-template generate my-template --out /tmp/test
   ```

### Template Consumption

1. **Use `info` command first**
   ```bash
   magen-template info ios-mobilesdk
   ```

2. **Start with interactive mode**
   ```bash
   magen-template generate --interactive
   ```

3. **Pin versions in automation**
   ```bash
   magen-template generate ios-base@1.0.0 --out ./app
   ```

## Comparison with Other Systems

| Feature | Magen | Yeoman | Cookiecutter | Plop |
|---------|-------|--------|--------------|------|
| Inheritance | ✅ Git patches | ❌ | ❌ | ❌ |
| Version pinning | ✅ | ❌ | ❌ | ❌ |
| Interactive mode | ✅ | ✅ | ✅ | ✅ |
| Type-safe variables | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Buildable authoring | ✅ | ❌ | ❌ | ❌ |
| Multi-layer composition | ✅ | ❌ | ❌ | ❌ |
| TypeScript API | ✅ | ⚠️ | ❌ | ✅ |

## Conclusion

Magen Templates provides a robust, production-ready solution for mobile app scaffolding with unique capabilities:

- **Inheritance** reduces duplication
- **Version pinning** ensures stability
- **Buildable authoring** improves DX
- **Rich CLI** accelerates development
- **TypeScript API** enables automation

The system is battle-tested with 200+ tests and ready for team adoption.

