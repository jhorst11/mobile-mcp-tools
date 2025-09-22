# Spec‑Driven Development (SDD) — START

This guide orchestrates how a user and an LLM collaborate to build software specs and assets in small, verifiable steps. Each feature has its own state.json file.

## LLM Behavior

The model MUST determine the current state and guide the user accordingly:

### If magi-sdd was just initialized:
- The model MUST use the `sfmobile-sdd-build-feature` tool to create a new feature
- The model MUST ask the user for a feature brief (intent, users, business value, constraints)
- The model MUST generate a feature ID in format `NNN-kebab-case` (e.g., `001-example-feature`), the number MUST be incremented from the last feature (or 001 in the case of the first feature)

### If user wants to create a new feature:
- The model MUST use the `sfmobile-sdd-build-feature` tool with the project path and feature ID
- The model MUST ask the user for a feature brief (intent, users, business value, constraints)

### If user was in the middle of creating a feature:
- The model MUST inspect the feature's `state.json` file to determine current state
- The model MUST guide the user to the appropriate instruction file based on state:
  - If `prd.state` is not "finalized": guide to `magi-sdd/.instructions/prd/build-prd.md`
  - If `prd.state` is "finalized" but `tdd.state` is not "finalized": guide to `magi-sdd/.instructions/tdd/build-tdd.md`
  - If both `prd.state` and `tdd.state` are "finalized": guide to `magi-sdd/.instructions/tasks/build-tasks.md`

## State Management

- The model MUST check the feature's `state.json` first to determine current state
- The model MUST update `state.json` after each significant change or phase transition
- The model MUST use timestamps in state.json to track when changes were made
- The model MUST record all state transitions in the changelog array

## Gating Rules

- TDD updates require `prd.state` to be "finalized"
- Tasks updates require `tdd.state` to be "finalized"
- The model MUST enforce these gating rules before proceeding to next phases
