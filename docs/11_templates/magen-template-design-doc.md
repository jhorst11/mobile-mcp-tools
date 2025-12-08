# Magen Template System – Requirements & Design Document (v1)

## 1. Overview

The Magen Template System is a **layered, platform-agnostic app templating engine** inspired by Docker's image layering. It enables:

- Handlebars-based templating with variable substitution
- Test instances (work directories) for validating templates
- Layered template inheritance via git diffs
- Full filename/project-file templating (including Xcode projects)
- CLI + TypeScript API for human and AI usage

This document defines the architecture, semantics, and behaviors of the system.

### Package Structure

The Magen Template System will be implemented as a new package: `magen-templates`

Templates are stored within the package at: `magen-templates/templates/`

This co-locates templates with the tooling, ensuring version consistency and simplifying distribution.

---

## 2. Core Concepts

### Template
A non-buildable structure containing Handlebars placeholders. Each template includes:

- `template.json` (metadata + variables)
- `layer.patch` (diff vs parent, optional for base templates)
- `template/` (canonical templated files)

Templates live within the `magen-templates` package at:

```
magen-templates/templates/<templateName>/
```

### Work Directory
A fully concrete buildable project generated from the template for testing purposes:

```
magen-template template test <name> [--regenerate]
```

Lives within each template's directory at:

```
magen-templates/templates/<templateName>/work/
```

The work directory is a resolved instance of the template (all Handlebars placeholders filled in) used to validate that the template generates correctly and the resulting app builds and runs. This is **not** where you author the template — it's just for testing.

Use `--regenerate` to force regeneration even if work directory already exists.

### Layering
Templates form a parent → child chain:

```
ios-base
   ↓ layer.patch
ios-salesforce
   ↓ layer.patch
ios-salesforce-offline
```

Materialization applies all patches in order before final templating.

**Patch Format**: All `layer.patch` files are git patch files created and applied exclusively using git tooling. No manual patch manipulation or custom diff formats are used.

---

## 3. template.json Schema

```jsonc
{
  "name": "ios-salesforce",
  "platform": "ios",
  "basedOn": "ios-base",
  "version": "0.1.0",

  "layer": {
    "patchFile": "layer.patch"
  },

  "variables": [
    {
      "name": "appName",
      "type": "string",
      "required": true,
      "description": "Display name shown on the home screen",
      "default": "Magen Demo"
    }
  ],

  "tags": ["salesforce", "auth"],
  "description": "iOS template integrating Salesforce SDK"
}
```

---

## 4. CLI Requirements

### Package CLI

The `magen-templates` package provides a CLI binary: `magen-template`

### Commands

| Command | Description |
|--------|-------------|
| `magen-template list` | List templates |
| `magen-template show <name>` | Show metadata/schema |
| `magen-template generate <template>` | Generate concrete app |
| `magen-template template test <name>` | Generate/validate test instance in work directory |
| `magen-template template validate <name>` | Validate template structure |

### Workflow

1. **Edit template**: Directly edit files in `templates/<name>/template/` with Handlebars placeholders (e.g., `{{appName}}`)
2. **Test template**: `template test <name>` → generates concrete app in `work/` for testing
3. **Build and validate**: Open `work/` in Xcode, build, run, verify the template generates correctly
4. **Iterate**: Edit template files and re-run `template test <name> --regenerate`
5. **Generate apps**: `generate <name> --out ~/MyApp --var appName="MyApp"` → creates production apps

---

## 5. Programmatic API (TypeScript)

The `magen-templates` package exports a TypeScript API:

```ts
listTemplates(): TemplateDescriptor[];
getTemplate(name: string): TemplateDescriptor;
generateApp(options: GenerateOptions): void;
testTemplate(options: TestTemplateOptions): TestTemplateResult;
```

Used by AI agents and the CLI. Both share the same core implementation.

---

## 6. Git-Based Patch System

### Requirements
All patch operations must use native git tooling:

- **Patch Creation**: `git diff` (or `git format-patch` for more complex scenarios)
- **Patch Application**: `git apply`
- **Patch Format**: Standard git unified diff format

### Rationale
- Git's patch format handles all edge cases (binary files, renames, permissions, etc.)
- Git tooling is battle-tested and widely available
- No need to implement custom diff/patch logic
- Ensures deterministic, reproducible layer application

### Patch Creation Process
When creating a layer template:

1. Initialize a temporary git repository
2. Materialize parent template as the base commit
3. Copy child template files over parent (representing the layer changes)
4. Use `git diff` to generate patch: `git diff --no-index parent/ child/` or stage changes and use `git diff --cached`
5. Save the git patch as `layer.patch`

**Implementation**: All patch creation must use git's native diff and patch generation. No manual diff parsing or custom patch formats.

### Patch Application
During generate or dev:

1. Materialize parent template to target directory
2. Apply `layer.patch` using `git apply --directory=<target>`
3. Apply next layer patches in sequence using `git apply`
4. Render Handlebars templates on final materialized content

**Implementation**: Use `git apply` for all patch operations. This ensures proper handling of file additions, deletions, renames, and binary files.

### Conflict Behavior
Any patch application failure (detected by `git apply` exit code):

- Fail immediately
- Report git's conflict output (which file/hunk)
- No auto-merge in v1

---

## 7. Directory Layout

### Package Structure

```
magen-templates/                    # New package
  package.json
  src/
    cli/                            # CLI implementation
    core/                           # Core template engine
  templates/                        # Template storage
    <templateName>/
      template.json
      layer.patch                   # Optional (not for base templates)
      template/
        {{appName}}App.swift
        ...
      work/                         # Test instance (when active)
        MagenDemoApp.swift
        ...
        MyProject.xcodeproj/
```

### Work Directory Lifecycle

1. **Test**: `template test <name>` generates concrete test app in `work/`
2. **Validate**: Open `work/` in Xcode, build, run, validate template output
3. **Iterate**: Edit template files, re-run `template test <name> --regenerate`
4. **Generate**: Use `generate` command to create production apps from the template

---

## 8. Template Discovery

Templates are discovered from multiple roots in priority order:

1. **Package templates**: `node_modules/@salesforce/magen-templates/templates/`
2. **Environment variable**: `$MAGEN_TEMPLATE_PATH` (colon-separated paths)
3. **User-level templates**: `~/.magen/templates/`
4. **Project-local templates**: `./templates/` (current working directory)

Higher-priority paths override lower ones for templates with the same name.

---

## 9. Variable System

### Variable Types
- `string`
- `number`
- `boolean`

### Variable Properties
- `name`: Variable identifier
- `type`: Data type
- `required`: Whether variable must be provided
- `description`: Human-readable description
- `default`: Default value (optional)
- `regex`: Validation pattern for string types (optional)
- `enum`: Allowed values (optional)

### Variable Resolution

During `generate`:

1. Load template's `template.json`
2. Merge provided variables with defaults
3. Validate:
   - Required variables present
   - Types match
   - Regex patterns (if specified)
   - Enum constraints (if specified)
4. Render Handlebars templates with final variable set

---

## 10. Future Enhancements (Post-v1)

- **Hooks**: Pre/post-generate scripts for validation and setup
- **Conditional Templating**: `{{#if}}` blocks based on variables
- **Advanced Layering**: Merge strategies beyond simple patches
- **Template Validation**: Automated checks for template consistency
- **Xcode Project Integration**: Smart handling of `.xcodeproj` files (Phase 6)

---

## Completion Criteria for v1

- ✅ Template discovery from multiple roots
- ✅ Handlebars-based generation
- ✅ Work directory management (`create`, `dev`)
- ✅ Variable validation and type checking
- ⏳ Git-based layering (Phase 5)
- ⏳ Xcode `.xcodeproj` handling (Phase 6)
- CLI and TypeScript API functional
- End-to-end tested with real iOS projects
