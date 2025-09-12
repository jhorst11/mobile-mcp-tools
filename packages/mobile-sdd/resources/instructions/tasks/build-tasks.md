### Build Implementation Tasks — LLM Instructions

You are a staff engineer and delivery lead. Translate a finalized PRD into a clear, verifiable implementation plan with checkboxes.

### Prerequisites (MUST)
- The PRD for `.magen/specs/<feature-id>/` is finalized (`Approval Status: Finalized`).
- If not finalized, stop and follow the PRD iteration/finalization guides first.

### Goals
- Produce an actionable set of implementation tasks that provide end-to-end delivery coverage.
- Ensure strict traceability: each task references PRD Feature and User Story IDs.

### Method
1. Read the finalized PRD and its traceability table (FR → Feature → Story).
2. Break work down by feature, then by story, then by technical components.
3. Create tasks that are small enough to complete in ≤ 1–3 days, each with a clear definition of done.
4. Add validation tasks: unit tests, integration/e2e tests, accessibility, observability, documentation.
5. Include environment and release tasks as applicable.
6. Ask the user targeted questions if scope or sequencing is unclear.

### Quality bar
- Every user story maps to one or more implementation tasks with test coverage.
- Each task has clear acceptance checks and owner/role hints where relevant.
- Non-functional and compliance requirements are represented by explicit tasks.

### Embedded Tasks Template
Copy and fill this in `.magen/specs/<feature-id>/tasks.md`.

```markdown
# Implementation Tasks — <feature-id>
--- Created at: <created-time> ---
--- Updated at: <updated-time> ---
--- Approval Status: Draft ---

## Conventions
- Link each task to PRD Feature and Story IDs.
- Check boxes `[ ]` become `[x]` when completed.

## Plan Overview
- Delivery strategy:
- Risks & mitigations:
- Milestones:

## Tasks by Feature

### Feature: <Feature Name> (PRD Section 5.x; FRs: FR1, FR2; Stories: ST-101, ST-102)

- [ ] Design: Review PRD and finalize component responsibilities (links) — refs: ST-101
- [ ] API/Schema: Define/extend data models and contracts — refs: ST-101
- [ ] Backend: Implement endpoints/services — refs: ST-101
- [ ] Frontend: Implement UI components and state — refs: ST-101
- [ ] Mobile: Implement LWC/GraphQL adapters (prefer GraphQL wire adapter over Apex) — refs: ST-101
- [ ] Auth/Access: Enforce permissions and role checks — refs: ST-101
- [ ] Validation: Input validation and error states — refs: ST-101
- [ ] Observability: Metrics, logs, alerts — refs: NFRs
- [ ] Performance: Budget checks and profiling — refs: NFRs
- [ ] Accessibility: WCAG checks and keyboard flows — refs: NFRs
- [ ] Localization: i18n strings and RTL checks (if applicable)
- [ ] Testing: Unit tests — refs: ST-101
- [ ] Testing: Integration/E2E tests — refs: ST-101
- [ ] Docs: Update README/Runbook/User docs

### Feature: <Next Feature> (...)
- [ ] ...

## Environments & Release
- [ ] Dev environment setup/config
- [ ] Staging deployment and smoke tests
- [ ] Production deployment plan and rollback

## Sign-offs
- [ ] Product sign-off (references demo or screenshots)
- [ ] Engineering sign-off (meets DoD and NFR budgets)
- [ ] Security/Compliance sign-off (if applicable)

```

### Next steps
- Iterate with the user to refine tasks if anything is unclear or missing.
- When ready, proceed to `.magen/specs/instructions/tasks/finalize-tasks.md` to finalize the task plan.

