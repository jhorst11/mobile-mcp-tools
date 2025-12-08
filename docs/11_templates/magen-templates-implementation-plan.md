# Magen Template System – Implementation Plan (Phased with Integration Tests)

## Phase 0 – Project Setup & Skeleton ✅

### Scope
- ✅ Initialize Node.js + TypeScript project.
- ✅ Establish project layout (`src/cli`, `src/core`).
- ✅ Add build, lint, format, and test frameworks. Should follow pattern established by other packages in project.
- ✅ Create minimal CLI with `--help` and `--version`.
- ✅ Add git availability check utility (required for all patch operations).

### Integration Tests (Must Pass Before Phase 1) ✅
1. ✅ CLI bootstrap: `--help`, `--version` return 0 and output expected text.
2. ✅ Linting runs successfully with no errors.
3. ✅ Tests run successfully (12/12 passing).
4. ✅ Git availability detection works correctly.

### Status: COMPLETE
- Package created at `packages/magen-templates`
- All tests passing (12/12)
- Linting passing with 0 errors
- Build successful
- CLI functional with --help and --version

---

## Phase 1 – Template Discovery & Metadata Schema ✅

### Scope
- ✅ Implement template roots: project-local, user-level, env-based.
- ✅ Implement `template.json` schema + validation.
- ✅ Add `listTemplates()` + `getTemplate(name)`.
- ✅ Add CLI commands: `magen-template list`, `magen-template show <name>`.

### Integration Tests (Must Pass Before Phase 2) ✅
1. ✅ Template discovery across multiple roots (17 tests)
2. ✅ `template.json` schema validation with clear errors (18 tests)
3. ✅ Platform filtering support
4. ✅ Corrupt template isolation resilience

### Status: COMPLETE
- Template discovery system with 4 priority levels (package, env, user, project)
- Zod-based schema validation with comprehensive error messages
- CLI commands functional: `list` and `show`
- 35 new tests passing (47 total)
- Graceful handling of corrupt templates
- Platform filtering working correctly

---

## Phase 2 – Core Generation Engine (Flat Templates) ✅

### Scope
- ✅ Implement Handlebars-based rendering for:
  - ✅ File contents
  - ✅ Filenames
  - ✅ Directory names
- ✅ Implement `magen-template generate <template>`.

### Integration Tests (Must Pass Before Phase 3) ✅
1. ✅ Content templating correctness (24 tests)
2. ✅ Filename templating correctness
3. ✅ Directory templating correctness
4. ✅ Required variable enforcement
5. ✅ Type handling for string/number/boolean
6. ✅ Overwrite safety rules

### Status: COMPLETE
- Handlebars integration for all templating needs
- Full variable validation (types, regex patterns, enums)
- CLI generate command with --var and --overwrite flags
- 24 new tests passing (71 total)
- Successfully generates iOS source files from ios-base template
- Proper error handling for missing templates, invalid variables, existing files

**Known Limitation**: `.xcodeproj/project.pbxproj` files are not yet supported due to Handlebars parsing conflicts with `{}` characters used extensively in pbxproj format. Full Xcode project integration is deferred to Phase 6.

---

## Phase 3 – Inline Annotations & Finalize (Single-Layer Templates) ✅

**Status**: ✅ Complete  
**Completed**: December 8, 2025

### Scope
- Implement annotation parser:
  - `magen:var`
  - `magen:regex`
  - `magen:enum`
  - `magen:filename`
- Implement `template finalize` for root templates:
  - Extract schema
  - Rewrite literals → Handlebars
  - Handle filenames
  - Validate template structure

**Note**: This phase focuses on single-layer templates. Git-based patch creation is added in Phase 5.

### Implementation Summary

**Core Files Created**:
- `src/core/annotations.ts` - Full annotation parsing system (28 tests passing)
- `src/core/finalize.ts` - Template finalization engine (15 tests passing)
- `src/cli/index.ts` - Enhanced with `template finalize` command

**Key Features Implemented**:
1. **Annotation Parser**: Parses `magen:var`, `magen:regex`, `magen:enum`, `magen:filename` from source files
2. **Default Value Extraction**: Automatically extracts default values from authoring instance code
3. **Schema Generation**: Builds complete `template.json` from annotations
4. **Literal Rewriting**: Converts concrete values to Handlebars placeholders
5. **Filename Templating**: Supports dynamic file renaming via `magen:filename`
6. **Validation**: Comprehensive validation for duplicate variables, conflicting types, invalid regex, etc.

### Integration Tests — ✅ 43 NEW TESTS PASSING (114/114 total)
1. ✅ Variable extraction correctness (28 annotation parser tests)
2. ✅ Regex + enum extraction correctness
3. ✅ Filename templating correctness
4. ✅ Annotation validation and conflict detection
5. ✅ Schema generation from multiple files
6. ✅ Literal → Handlebars rewriting

**Test Results**:
```
Test Files  7 passed (7)
     Tests  114 passed (114)
  Duration  1.07s
```

---

## Phase 4 – Authoring Instances & dev Flow (Single-Layer)

### Scope
- Implement management of authoring instances under `.magen/work/<templateName>/`.
- Implement:
  - `template create`
  - `template dev`
- Guarantee round-trip consistency.

### Integration Tests (Must Pass Before Phase 5)
1. Create → finalize round trip consistency.
2. New variable detection from authoring.
3. Missing authoring directory detection.
4. Inline default restoration.
5. Authoring persistence behavior confirmed.

---

## Phase 5 – Layering & layer.patch

### Scope
- Add `basedOn` support.
- Implement git-based layer creation using `git diff`.
- Implement git-based patch application using `git apply`.
- Ensure git is available in the environment.
- Integrate with `template dev` and generation workflows.

**Critical Requirement**: All patch operations must use native git commands. Do NOT implement custom diff/patch logic.

### Integration Tests (Must Pass Before Phase 6)
1. Single-layer application correctness using `git apply`.
2. Layered generation correctness.
3. Multi-level layering correctness.
4. Patch conflict detection via `git apply` errors.
5. Patch determinism on unchanged finalize.
6. Git availability check during initialization.

---

## Phase 6 – iOS-Specific: .xcodeproj Integration & Filename Templating

### Scope
- Treat `.xcodeproj/project.pbxproj` as templated.
- Implement pbxproj rewrites during finalize and generation.
- Ensure generated projects are Xcode-buildable.

### Integration Tests (Must Pass Before Phase 7)
1. Filename → pbxproj consistency.
2. Multi-file rename correctness.
3. CI macOS build smoke test.
4. Non-iOS template safety.

---

## Phase 7 – TypeScript Library API for AI Agents

### Scope
- Implement and export stable TS API:
  - `listTemplates()`
  - `getTemplate(name)`
  - `generateApp(options)`
- Share core logic between CLI and library.

### Integration Tests (Must Pass Before Phase 8)
1. Library and CLI output parity.
2. Template discovery API tests.
3. Error propagation tests.
4. Full type safety via TS strict mode.

---

## Phase 8 – End-to-End Scenarios & Regression Suite

### Scope
- Build real example templates:
  - `ios-base`
  - `ios-salesforce`
- Test the entire system end-to-end.

### Integration Tests (Final Gate Before v1 Release)
1. E2E: Base template generation + Xcode build.
2. E2E: Layered Salesforce template generation + build.
3. Layer regression tests for base template changes.
4. Error-path smoke tests.

---

## Completion Criteria for Magen Template System v1
- All phases green in CI.
- All integration tests passing.
- End-to-end flows validated.
- iOS templates verified with real `xcodebuild`.
- TypeScript library stable for AI-driven workflows.
