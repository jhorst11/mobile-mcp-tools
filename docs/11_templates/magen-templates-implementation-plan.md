# Magen Template System – Implementation Plan

This document outlines the phased implementation of the Magen Template System as specified in the design document.

---

## Phase Overview

| Phase | Scope | Status |
|-------|-------|--------|
| **0** | Project Setup & Skeleton | `COMPLETE` |
| **1** | Template Discovery & Metadata Schema | `COMPLETE` |
| **2** | Core Generation Engine (Flat Templates) | `COMPLETE` |
| **3** | Work Directory Management (Test Mode) | `COMPLETE` |
| **4** | Git-Based Layering (Single-Layer) | `PENDING` |
| **5** | Multi-Layer Materialization | `PENDING` |
| **6** | Xcode Project File Integration | `PENDING` |

---

## Phase 0 – Project Setup & Skeleton

**Status**: `COMPLETE` ✅

**Goal**: Bootstrap the `magen-templates` package with project structure, tooling, and foundational utilities.

### Deliverables

1. **Package Structure**
   - Create `packages/magen-templates/` directory
   - Initialize `package.json` with:
     - Name: `@salesforce/magen-templates`
     - Main entry: `dist/index.js`
     - CLI binary: `magen-template`
     - Dependencies: `zod`, `handlebars`, `commander` (or similar)
   - Set up TypeScript configuration (`tsconfig.json`)
   - Configure linting/formatting (ESLint, Prettier)

2. **Directory Layout**
   ```
   packages/magen-templates/
     src/
       cli/
         index.ts          # CLI entry point
       core/
         types.ts          # Core TypeScript types
         schema.ts         # Zod schemas for template.json
         discovery.ts      # Template discovery logic
         generator.ts      # Template generation engine
         testing.ts        # Work directory management (test mode)
       utils/
         git.ts            # Git utility functions
     templates/            # Template storage
     tests/                # Test files
     package.json
     tsconfig.json
   ```

3. **Core Types** (`src/core/types.ts`)
   - `TemplateDescriptor` (inferred from `TemplateDescriptorSchema`)
   - `TemplateVariable` (inferred from schema)
   - `GenerateOptions`
   - `TestTemplateOptions`

4. **Git Utilities** (`src/utils/git.ts`)
   - `checkGitAvailability()` – Verify git is installed
   - `ensureGitAvailable()` – Throw if git is missing

5. **Build & Test**
   - Ensure package builds successfully (`npm run build`)
   - Add basic unit test skeleton (`npm test`)

### Success Criteria
- Package builds without errors
- CLI binary (`magen-template`) is registered
- Empty tests pass

### Testing
- ✅ Package builds
- ✅ Git availability checks work
- ✅ Initial test suite passes (4 tests)

---

## Phase 1 – Template Discovery & Metadata Schema

**Status**: `COMPLETE` ✅

**Goal**: Implement template discovery from multiple roots and validate `template.json` against a strict Zod schema.

### Deliverables

1. **Schema Definition** (`src/core/schema.ts`)
   - Define `TemplateDescriptorSchema` using Zod:
     ```ts
     const TemplateDescriptorSchema = z.object({
       name: z.string(),
       platform: z.enum(['ios', 'android', 'web']),
       version: z.string().regex(/^\d+\.\d+\.\d+$/), // semver
       description: z.string().optional(),
       basedOn: z.string().optional(),
       layer: z.object({
         patchFile: z.string()
       }).optional(),
       variables: z.array(TemplateVariableSchema),
       tags: z.array(z.string()).optional()
     });
     ```
   - Define `TemplateVariableSchema`:
     ```ts
     const TemplateVariableSchema = z.object({
       name: z.string(),
       type: z.enum(['string', 'number', 'boolean']),
       required: z.boolean(),
       description: z.string().optional(),
       default: z.union([z.string(), z.number(), z.boolean()]).optional(),
       regex: z.string().optional(),
       enum: z.array(z.string()).optional()
     });
     ```
   - Export type-safe validation functions

2. **Discovery Implementation** (`src/core/discovery.ts`)
   - `getTemplateRoots()` – Return array of search paths in priority order:
     1. `node_modules/@salesforce/magen-templates/templates/`
     2. `$MAGEN_TEMPLATE_PATH` (colon-separated)
     3. `~/.magen/templates/`
     4. `./templates/`
   - `discoverTemplates()` – Scan all roots, parse `template.json`, validate schema
   - `listTemplates(platform?: string)` – Return all valid templates, optionally filtered
   - `getTemplate(name: string)` – Return single template descriptor
   - Handle corrupt/invalid templates gracefully (log warnings, skip)

3. **CLI Integration** (`src/cli/index.ts`)
   - Implement `list` command:
     ```
     magen-template list [--platform ios|android|web]
     ```
   - Implement `show` command:
     ```
     magen-template show <templateName>
     ```

### Success Criteria
- Templates discovered from all roots
- Invalid templates logged and skipped
- CLI commands functional

### Testing
- ✅ Schema validation tests (18 tests)
- ✅ Discovery tests with multiple roots (17 tests)
- ✅ Platform filtering
- ✅ Corrupt template handling

---

## Phase 2 – Core Generation Engine (Flat Templates)

**Status**: `COMPLETE` ✅

**Goal**: Implement Handlebars-based generation for flat (non-layered) templates, supporting content rendering, filename templating, and variable validation.

### Deliverables

1. **Generator Implementation** (`src/core/generator.ts`)
   - `generateApp(options: GenerateOptions)`:
     - Load template descriptor
     - Validate variables (required, type, regex, enum)
     - Merge provided variables with defaults
     - Traverse `template/` directory
     - Render file contents with Handlebars
     - Render filenames and directory names
     - Write output to destination
   - Variable validation logic:
     - Ensure required variables are present
     - Check type compatibility
     - Validate regex patterns (if specified)
     - Validate enum constraints (if specified)

2. **Handlebars Integration**
   - Render file contents: `Handlebars.compile(fileContent)(variables)`
   - Render paths: `{{appName}}/{{appName}}App.swift` → `MyApp/MyAppApp.swift`

3. **CLI Integration**
   - Implement `generate` command:
     ```
     magen-template generate <template> --out <path> [--var key=value]...
     ```

4. **Error Handling**
   - Missing required variables → fail with clear message
   - Type mismatches → fail with clear message
   - Regex/enum violations → fail with clear message
   - Template not found → fail with clear message

### Success Criteria
- Generate concrete apps from flat templates
- All variables validated before generation
- Filenames and directories templated correctly

### Testing
- ✅ Content rendering tests (24 tests)
- ✅ Filename/directory templating
- ✅ Variable validation and merging
- ✅ End-to-end generation scenarios
- ✅ CLI integration tests (8 tests)

### Known Limitations
- `.xcodeproj/project.pbxproj` files are not yet supported due to Handlebars parsing conflicts with `{}` syntax. Full Xcode project integration is deferred to Phase 6.

---

## Phase 3 – Work Directory Management (Test Mode)

**Status**: `COMPLETE` ✅

**Goal**: Implement work directory management for creating and validating concrete test instances from templates.

### Deliverables

1. **Test Mode Implementation** (`src/core/testing.ts`)
   - `getWorkDirectory(templateDirectory: string)` – Return `<templateDirectory>/work`
   - `hasTestInstance(templateDirectory: string)` – Check if work directory exists and is non-empty
   - `testTemplate(options: TestTemplateOptions)`:
     - If work directory exists and `regenerate` is false → return existing work directory path
     - If work directory exists and `regenerate` is true → clear and regenerate
     - If work directory doesn't exist → generate concrete test app
     - Return work directory path and variables used

2. **CLI Integration**
   - Implement `template test` command:
     ```
     magen-template template test <name> [--regenerate] [--out <templateDir>] [--var key=value]...
     ```

3. **Workflow**
   - Developer edits template files in `templates/ios-base/template/` with Handlebars placeholders
   - `template test ios-base` → generates concrete test app in `templates/ios-base/work/`
   - Developer opens `work/` in Xcode to validate the template output builds and runs
   - `template test ios-base --regenerate` → regenerates work directory after template changes

### Success Criteria
- Work directory created on first `template test`
- `template test` returns existing work directory if already present
- `--regenerate` flag clears and regenerates work directory
- CLI command functional

### Testing
- ✅ Work directory management tests (17 tests)
- ✅ Round-trip consistency
- ✅ Error handling for existing/missing work directories

---

## Phase 4 – Git-Based Layering (Single-Layer)

**Status**: `PENDING` ⏳

**Goal**: Implement git-based layer creation and application for single-layer templates (one parent, one child).

### Deliverables

1. **Layer Creation** (`src/core/layering.ts`)
   - `createLayer(options: CreateLayerOptions)`:
     - Materialize parent template to temp directory (parent/)
     - Copy child template files to another temp directory (child/)
     - Initialize git repository in temp directory
     - Commit parent as base
     - Apply child changes on top
     - Generate patch using `git diff --cached > layer.patch`
     - Move `layer.patch` to child template directory
   - **Critical Requirement**: Use native git commands (`git diff`, `git format-patch`) for all patch creation

2. **Patch Application** (`src/core/generator.ts`)
   - Modify `generateApp` to support layered templates:
     - If `basedOn` is specified:
       - Materialize parent template to target directory
       - Apply `layer.patch` using `git apply --directory=<target>`
       - Render Handlebars templates on final materialized content
   - **Critical Requirement**: Use `git apply` for all patch operations

3. **Git Utilities** (`src/utils/git.ts`)
   - `createPatch(parentDir: string, childDir: string, outputPath: string)` – Wrapper around git diff
   - `applyPatch(targetDir: string, patchPath: string)` – Wrapper around git apply
   - Error handling for patch application failures

4. **CLI Integration**
   - Implement `template layer` command (creates layer patch from child template):
     ```
     magen-template template layer <name> [--based-on <parent>] [--out <templateDir>]
     ```

### Success Criteria
- Layer created from work directory using git diff
- Patch applied successfully during generation using git apply
- Single-layer templates (e.g., `ios-salesforce` based on `ios-base`) work end-to-end

### Testing
- Layer creation from child template
- Patch application during generation
- End-to-end single-layer template generation
- Error handling for patch conflicts

---

## Phase 5 – Multi-Layer Materialization

**Status**: `PENDING` ⏳

**Goal**: Support arbitrary-depth template chains (e.g., `base` → `salesforce` → `offline`).

### Deliverables

1. **Recursive Materialization** (`src/core/layering.ts`)
   - `materializeTemplate(templateName: string, targetDir: string)`:
     - Recursively traverse `basedOn` chain
     - Apply patches in order from root to leaf
     - Use `git apply` for each layer
   - Cycle detection to prevent infinite loops

2. **Integration with Generator**
   - Update `generateApp` to use `materializeTemplate` for multi-layer templates

### Success Criteria
- Multi-layer templates (3+ layers) work correctly
- Patches applied in correct order
- Cycle detection prevents infinite loops

### Testing
- 3-layer template chain
- Cycle detection
- Patch application order
- End-to-end multi-layer generation

---

## Phase 6 – Xcode Project File Integration

**Status**: `PENDING` ⏳

**Goal**: Handle Xcode `.xcodeproj/project.pbxproj` files, which use `{}` syntax extensively and conflict with Handlebars.

### Deliverables

1. **Xcode File Handling**
   - Detect `.pbxproj` files during generation
   - Apply special escaping or raw block handling:
     ```handlebars
     {{{{raw}}}}
     ... pbxproj content ...
     {{{{/raw}}}}
     ```
   - Or use a custom renderer for `.pbxproj` files

2. **Template Updates**
   - Update `ios-base` template to include complete Xcode project structure
   - Ensure generated projects can be opened and built in Xcode

### Success Criteria
- Generated iOS projects include `.xcodeproj` directory
- Projects open and build successfully in Xcode
- Handlebars templating works for pbxproj files

### Testing
- Generate iOS app and open in Xcode
- Build and run generated project
- Verify all project settings are correct

---

## Integration Testing

### End-to-End Scenarios

1. **Flat Template**
   - List templates
   - Generate app from `ios-base`
   - Verify all files rendered correctly
   - Verify variables substituted

2. **Test Workflow**
   - Create test instance (`template test`)
   - Open work directory in Xcode, validate it builds
   - Iterate with `template test --regenerate`

3. **Single-Layer Template**
   - Generate app from `ios-salesforce` (based on `ios-base`)
   - Verify layer patch applied
   - Verify variables from both layers resolved

4. **Multi-Layer Template**
   - Generate app from `ios-salesforce-offline` (based on `ios-salesforce` based on `ios-base`)
   - Verify all patches applied in order
   - Verify variables from all layers resolved

---

## Rollout Plan

1. **Phase 0-2**: Core functionality (discovery, schema, generation)
2. **Phase 3**: Test workflow (work directory management)
3. **Phase 4-5**: Layering support
4. **Phase 6**: Xcode integration
5. **Documentation & Examples**: Comprehensive guides and sample templates

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Git not available | Check in Phase 0, fail with clear error |
| Patch conflicts | Clear error messages, no auto-merge in v1 |
| Handlebars conflicts with `.pbxproj` | Phase 6 dedicated to special handling |
| Cycle in template chain | Cycle detection in Phase 5 |

---

## Success Metrics

- ✅ All phases complete with tests passing
- ✅ End-to-end iOS app generation works
- Multi-layer templates functional
- Documentation complete
- CLI and TypeScript API usable by humans and AI agents
