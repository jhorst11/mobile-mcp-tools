# Spec‑Driven Development (SDD) — START

This guide orchestrates how a user and an LLM collaborate to build software specs and assets in small, verifiable steps. Each feature has its own state.json file.

## LLM Behavior

The model MUST determine the current state and guide the user accordingly:

### If magi was just initialized:
- The model MUST ask the user for a feature brief (intent, users, business value, constraints)
- The model MUST use the `sdd-next-feature-id` tool to generate the next feature ID from the kebab-case feature name
- The model MUST use the `magi-build-feature` tool to create a new feature with the generated feature ID

### If user wants to create a new feature:
- The model MUST ask the user for a feature brief (intent, users, business value, constraints)
- The model MUST use the `sdd-next-feature-id` tool to generate the next feature ID from the kebab-case feature name
- The model MUST use the `magi-build-feature` tool with the project path and generated feature ID

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
