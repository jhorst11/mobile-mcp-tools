### Build Implementation Tasks — LLM Instructions

You are a staff engineer and delivery lead. Translate a finalized PRD and finalized Requirements into a clear, verifiable implementation plan with checkboxes.

### Prerequisites (MUST)
- The PRD for `.magen/001-<feature-name>/` is finalized (`Approval Status: Finalized`).
- The Requirements for `.magen/001-<feature-name>/` are finalized at `.magen/001-<feature-name>/requirements.md`.
- If not finalized, stop and follow the PRD and requirements iteration/finalization guides first.

### Goals
- Produce an actionable set of implementation tasks that provide end-to-end delivery coverage.
- Ensure strict traceability: each task references PRD Feature and User Story IDs and Requirements FR IDs.

### Method
1. Read the finalized PRD and its Feature ↔ Story traceability table; then read the finalized Requirements and the FR ↔ Feature/Story mapping.
2. Break work down by feature, then by story, then by technical components.
3. Create tasks that are small enough to complete in ≤ 1–3 days, each with a clear definition of done.
4. Add validation tasks: unit tests, integration/e2e tests, accessibility, observability, documentation.
5. Include environment and release tasks as applicable.
6. Ask the user targeted questions if scope or sequencing is unclear — one question at a time; wait for the user's response before proceeding.

### Quality bar
- Every user story maps to one or more implementation tasks with test coverage.
- Each task has clear acceptance checks and owner/role hints where relevant.
- Non-functional and compliance requirements are represented by explicit tasks.

### Embedded Tasks Template
Copy and fill this in `.magen/001-<feature-name>/tasks.md`.

```markdown
# Implementation Tasks — <feature-id>

## Conventions
- Link each task to PRD Feature and Story IDs and Requirements FR IDs.
- Check boxes `[ ]` become `[x]` when completed.

## Plan Overview
- Delivery strategy:
- Risks & mitigations:
- Milestones:

## Tasks by Feature

### Feature: <Feature Name> (PRD Section 5.x; FRs: FR1, FR2; Stories: ST-101, ST-102)

[ ] T1.1 API/Schema: Define/extend data models and contracts — refs: ST-101
    [ ] T1.1.1 API/Schema: Define/extend ExampleModel1 with properties prop1, prop2, prop3 — refs: ST-101
    [ ] T1.1.2 API/Schema: Define/extend ExampleModel2 with properties propA, propB, propC — refs: ST-101
    [ ] T1.1.3 API/Schema: Define/extend ExampleModel3 with properties propX, propY, propZ — refs: ST-101

[ ] T1.2 Backend: Implement endpoints/services — refs: ST-101
    [ ] T1.2.1 Backend: Implement /api/v1/example-endpoint1 — refs: ST-101
    [ ] T1.2.2 Backend: Implement /api/v1/example-endpoint2 — refs: ST-101
    
    
[ ] T1.3 Frontend: Implement UI components and state — refs: ST-101
    [ ] T1.3.1 Frontend: Implement ExampleComponent1 — refs: ST-101
    [ ] T1.3.2 Frontend: Implement ExampleComponent2 — refs: ST-101
    [ ] T1.3.3 Frontend: Implement ExampleComponent3 — refs: ST-101

...

### Feature: <Next Feature> (...)
[ ] T2.1 ...

## Environments & Release
[ ] Dev environment setup/config
[ ] Staging deployment and smoke tests
[ ] Production deployment plan and rollback

## Sign-offs
[ ] Product sign-off (references demo or screenshots)
[ ] Engineering sign-off (meets DoD and NFR budgets)
[ ] Security/Compliance sign-off (if applicable)

```

### Next steps
- Iterate with the user to refine tasks if anything is unclear or missing.
- When ready, proceed to `.magen/.instructions/tasks/finalize-tasks.md` to finalize the task plan.

