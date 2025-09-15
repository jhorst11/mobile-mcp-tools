### Spec‑Driven Development (SDD) — START

This guide orchestrates how a user and an LLM collaborate to build software specs and assets in small, verifiable steps. Each feature has its own state.json file.

### Available Tools
- **sfmobile-sdd-init**: Initializes a project with SDD instructions by copying them to a .magen directory.
- **sfmobile-sdd-build-feature**: Creates a new feature with the specified ID, automatically setting up the directory structure and required files.
- **sfmobile-sdd-update-feature**: Guides updating an existing feature's PRD, Requirements, or Tasks with PRD-first gating and traceability.

### State Management
- **Each feature has its own state file** at `.magen/<feature-id>/state.json`.
- **Always check the feature's state.json first** to determine the current state of the feature.
- **Update state.json** after each significant change or phase transition.
- **Use timestamps** in state.json to track when changes were made.
- **Record all state transitions** in the changelog array.

### What happens first
1. **Initialize or select a feature**:
   - If creating a new feature, use the `sfmobile-sdd-build-feature` tool with a feature ID (e.g., `00N-example-feature`), where `N` is a number incrementing from 001 based on the number of features already created.
   - The tool will automatically create the feature directory, state.json file, and empty files for PRD, requirements, and tasks.
   - If continuing with an existing feature, locate its state.json file.

2. **Build PRD**: Create a product requirements document first, iterate with the user until complete, then finalize.
   - Open `.magen/.instructions/design/build-design.md` and follow it.
   - Track progress in state.json's `prd` object.

### SDD flow overview
1. **PRD phase** (must finalize before Requirements)
   - Draft the PRD from the feature brief using the template.
   - Iterate by asking targeted questions; update the PRD and the feature's state.json as gaps are uncovered.
   - Finalize PRD once there is clear consensus (set `prd.state` to "finalized").

2. **Requirements phase** (requires `prd.state` to be "finalized")
   - Derive technical requirements from the finalized PRD using `.magen/.instructions/requirements/build-requirements.md`.
   - Iterate via `.magen/.instructions/requirements/iterate-requirements.md`.
   - Finalize via `.magen/.instructions/requirements/finalize-requirements.md`.
   - Track in state.json's `requirements` object.

3. **Tasks phase** (requires `requirements.state` to be "finalized")
   - Task generation depends on the finalized PRD and requirements for traceability.
   - Track in state.json's `build` object.

### Conventions
- **Feature ID**: `NNN-kebab-case` (e.g., `001-family-meal-planning`).
- **Spec folder**: `.magen/<feature-id>/`.
- **PRD file**: `.magen/<feature-id>/prd.md`.
- **Requirements file**: `.magen/<feature-id>/requirements.md`.
- **Tasks file**: `.magen/<feature-id>/tasks.md`.

### Updating existing artifacts
Use `sfmobile-sdd-update-feature` to update an existing feature's artifacts with PRD-first gating:
1. Target `prd` to update the PRD using `.magen/.instructions/design/update-design.md`.
2. Target `requirements` to update technical requirements using `.magen/.instructions/requirements/update-requirements.md`.
3. Target `tasks` to update implementation tasks using `.magen/.instructions/tasks/update-tasks.md`.

Gating rules:
- Requirements updates require `prd.state` to be `finalized`.
- Tasks updates require `requirements.state` to be `finalized`.

Finalization hygiene:
- If an artifact was previously finalized and needs changes, set its state to `in_review` in the feature's `state.json`, make minimal changes, then re-finalize using the appropriate `finalize-*.md` doc after explicit user approval.

### LLM kickoff
At the very start:
1. **Ask the user** which feature they want to work on, or if they want to create a new one.
2. **If starting new feature**, ask the user for:
   - **Overview of intent and business value** (focus on functionality not technicals)
   - **Primary users/actors and platforms** (web/mobile/api, etc.)
   - **Hard constraints** (deadlines, integrations, compliance)
3. **Generate a feature ID** (e.g., `001-example-feature`).
4. **Use the `sfmobile-sdd-build-feature` tool** with the project path and feature ID to automatically:
   - Create the feature directory at `.magen/<feature-id>/`
   - Initialize state.json with timestamps and initial state
   - Create empty files for PRD, requirements, and tasks
5. **Proceed to** `.magen/.instructions/design/build-design.md` to draft the PRD first.

- Interview cadence: Ask one question at a time and wait for the user's response before moving to the next question.

### Collaboration rules
- Prefer short, verifiable edits over large rewrites.
- Ask one question at a time; wait for the user's answer before proceeding.
- During PRD, track open issues in the feature's state.json `prd.openQuestions` array; during Requirements, use `requirements.openQuestions`.
- Maintain clear acceptance criteria so each functional requirement is testable.
- Defer non‑requirements topics until after requirements are finalized.
- Always update the feature's state.json after each significant change.
