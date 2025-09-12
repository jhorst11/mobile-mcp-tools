### Spec‑Driven Development (SDD) — START

This guide orchestrates how a user and an LLM collaborate to build software specs and assets in small, verifiable steps. Each feature has its own state.json file.

### State Management
- **Each feature has its own state file** at `.magen/specs/<feature-id>/state.json`.
- **Always check the feature's state.json first** to determine the current state of the feature.
- **Update state.json** after each significant change or phase transition.
- **Use timestamps** in state.json to track when changes were made.
- **Record all state transitions** in the changelog array.

### What happens first
1. **Initialize or select a feature**:
   - If creating a new feature, generate a feature ID (e.g., `001-example-feature`).
   - Create the feature directory at `.magen/specs/<feature-id>/`.
   - Initialize a new state.json file in that directory.
   - If continuing with an existing feature, locate its state.json file.

2. **Build Requirements**: Create an initial requirements doc, iterate with the user until complete, then finalize.
   - Open `.magen/specs/instructions/requirements/build-requirements.md` and follow it.
   - Track progress in state.json's `requirements` object.

### SDD flow overview
1. **Requirements phase** (must finalize before PRD)
   - Draft initial requirements from the template.
   - Iterate by asking targeted questions, updating the doc and state.json as gaps are uncovered.
   - Finalize requirements once there is clear consensus (set `requirements.state` to "finalized").

2. **PRD phase** (requires `requirements.state` to be "finalized")
   - Build PRD using `.magen/specs/instructions/design/build-design.md`.
   - Iterate via `.magen/specs/instructions/design/iterate-design.md`.
   - Finalize via `.magen/specs/instructions/design/finalize-design.md`.
   - Track in state.json's `prd` object.

3. **Tasks phase** (requires `prd.state` to be "finalized")
   - Task generation depends on the finalized PRD for traceability.
   - Track in state.json's `build` object.

### Conventions
- **Feature ID**: `NNN-kebab-case` (e.g., `001-family-meal-planning`).
- **Spec folder**: `.magen/specs/<feature-id>/`.
- **Requirements file**: `.magen/specs/<feature-id>/requirements.md`.

### LLM kickoff
At the very start:
1. **Ask the user** which feature they want to work on, or if they want to create a new one.
2. **If starting new feature**, ask the user for:
   - **Overview of intent and business value** (focus on functionality not technicals)
   - **Primary users/actors and platforms** (web/mobile/api, etc.)
   - **Hard constraints** (deadlines, integrations, compliance)
3. **Generate a feature ID** (e.g., `001-example-feature`).
4. **Create feature directory** at `.magen/specs/<feature-id>/`.
5. **Initialize state.json** at `.magen/specs/<feature-id>/state.json` with timestamps and initial state.
6. **Proceed to** `.magen/specs/instructions/requirements/build-requirements.md` to draft the initial requirements.

### Collaboration rules
- Prefer short, verifiable edits over large rewrites.
- Keep all open issues in the feature's state.json `requirements.openQuestions` array.
- Maintain clear acceptance criteria so each functional requirement is testable.
- Defer non‑requirements topics until after requirements are finalized.
- Always update the feature's state.json after each significant change.
