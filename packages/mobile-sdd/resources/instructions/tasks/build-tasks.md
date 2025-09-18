### Build Implementation Tasks — LLM Instructions

You are a staff engineer and delivery lead. Translate a finalized PRD and finalized Requirements into a clear, verifiable implementation plan with checkboxes.

### Prerequisites (MUST)
- The PRD for `magen-sdd/001-<feature-name>/` is finalized (`Approval Status: Finalized`).
- The Requirements for `magen-sdd/001-<feature-name>/` are finalized at `magen-sdd/001-<feature-name>/requirements.md`.
- If not finalized, stop and follow the PRD and requirements iteration/finalization guides first.

### Goals
- Produce an actionable set of implementation tasks that provide end-to-end delivery coverage.
- Ensure strict traceability: each task references PRD Feature and User Story IDs and Requirements FR IDs.

### Execution Flow

#### Initial Tasks Creation
1. **Read the finalized PRD and Requirements**:
   - Read the finalized PRD and its Feature ↔ Story traceability table
   - Read the finalized Requirements and the FR ↔ Feature/Story mapping
   - Ensure both documents are finalized before proceeding

2. **Set the initial version**:
   - Set the **Version** header to "1.0.0" for the initial version

3. **Break down work by feature, story, and technical components**:
   - Organize tasks by PRD feature first
   - Then by user story within each feature
   - Then by technical components (API/Schema, Backend, Frontend, etc.)

4. **Create actionable tasks**:
   - Make tasks small enough to complete in ≤ 1–3 days
   - Each task must have a clear definition of done
   - Include clear acceptance criteria and owner/role hints where relevant

5. **Add validation tasks**:
   - Unit tests for each component
   - Integration/e2e tests for user flows
   - Accessibility testing where applicable
   - Observability and monitoring setup
   - Documentation tasks

6. **Include environment and release tasks**:
   - Development environment setup
   - Staging deployment and testing
   - Production deployment planning
   - Rollback procedures

7. **Ask targeted questions** if scope or sequencing is unclear — one question at a time; wait for the user's response before proceeding.

8. **Mark checklist items as complete** in the tasks template as you validate each requirement.

#### Iteration Process
When the tasks need refinement or have gaps, follow this iteration loop:

1. **Review alignment** with the finalized PRD and Requirements. Flag any divergence.
2. **Ask targeted questions** about unclear scope, missing tasks, or sequencing — one question at a time; wait for the user's answer before proceeding.
3. **When user answers questions**:
   - Update the relevant sections of the tasks document with the new information
   - Regenerate any affected task breakdowns or sequencing as necessary
   - Update checklist items to reflect the new completion status
   - Ensure all changes maintain traceability to PRD and Requirements
4. **Propose concrete edits** to task breakdown, sequencing, or scope.
5. **Update traceability** to ensure each task references PRD Feature/Story IDs and Requirements FR IDs.
6. **Validate completeness** of testing, observability, accessibility, and release tasks.
7. **Update checklist items** in the tasks template to reflect current completion status as you make changes.
8. **Keep unresolved items documented**; revisit until resolved or explicitly deferred.

**Iteration exit criteria:**
- Every user story maps to one or more implementation tasks with test coverage
- Each task has clear acceptance checks and owner/role hints where relevant
- Non-functional and compliance requirements are represented by explicit tasks
- All tasks are small enough to complete in ≤ 1–3 days
- Environment and release tasks are included
- The user EXPLICITLY confirms readiness to finalize with a clear statement like "I approve finalizing the tasks" or "The tasks can be finalized now"

#### Update Process
For applying minimal, well-justified updates to an existing task plan:

1. **Confirm scope** of the change. If unclear, ask one targeted question and wait for the user's response.
2. **When user answers questions**:
   - Update the relevant sections of the tasks document with the new information
   - Regenerate any affected task breakdowns or sequencing as necessary
   - Update checklist items to reflect the new completion status
   - Ensure all changes maintain traceability to PRD and Requirements
3. **Identify impacted tasks** and their traceability to PRD Features/Stories and Requirements FRs.
4. **Propose a minimal diff** to the tasks document with explicit task ID changes (add/remove/modify).
5. **Ensure traceability is intact** for each changed/added task referencing PRD Feature/Story IDs and FR IDs.
6. **Include validation tasks** where needed (tests, a11y, observability, docs, release ops).
7. **Update the tasks version**:
   - For minor updates: Increment patch version (e.g., 1.0.0 → 1.0.1)
   - For new features: Increment minor version (e.g., 1.0.0 → 1.1.0)
   - For breaking changes: Increment major version (e.g., 1.0.0 → 2.0.0)
   - Update the **Version** header in the tasks document
8. **Update checklist items** in the tasks template to reflect any changes in completion status.
9. **Update the feature's state.json**:
   - Set `timestamps.lastUpdated` to now.
   - Append `changelog` entry with summary and impacted task IDs.
   - If previously finalized, keep `build.state: in_review` until re-approval.
10. **Ask the user to review**. Only when the user EXPLICITLY approves, proceed to finalization.

#### Finalization Process
**IMPORTANT: STRICT USER APPROVAL REQUIRED**
- DO NOT finalize tasks automatically after answering open questions.
- ONLY finalize when the user has EXPLICITLY approved finalization with a clear statement like "I approve finalizing the tasks" or "The tasks can be finalized now".
- If the user has not explicitly approved finalization, continue with the iteration process.

**Pre-finalization checklist:**
- User has EXPLICITLY approved finalization with a clear statement (REQUIRED).
- PRD is finalized (`Approval Status: Finalized`).
- Requirements are finalized at `magen-sdd/001-<feature-name>/requirements.md`.
- Each PRD user story maps to one or more tasks, and tasks reference Requirements FR IDs where applicable.
- Tasks include testing (unit, integration/e2e), observability, accessibility, performance/security where applicable.
- Risks and mitigations are captured; owners/roles are identified where needed.
- Environment and release steps are included.
- All checkboxes in the plan are initially unchecked (plan ready to execute).

**Finalization steps:**
1. **CONFIRM user has explicitly approved finalization**. If not, return to iteration.
2. **Verify all checklist items are marked complete** in the tasks template. If any items are incomplete, address them before finalizing.
3. **Update the header** in `magen-sdd/001-<feature-name>/tasks.md`:
   - Set `Updated at` timestamp
   - Set `Approval Status: Finalized`
   - Set `Version` to "1.0.0" for initial version or increment based on scope of changes
5. **Update the feature's state.json**:
   - Set `build.state` to "finalized".
   - Set `timestamps.tasksFinalized` to the current time.
   - Set `timestamps.lastUpdated` to the current time.
   - Add a finalization entry to the `changelog` array with details and date.
6. **Update the tasks version**:
   - For initial version: Set to "1.0.0"
   - For subsequent versions: Use semantic versioning (patch/minor/major based on scope of change)
   - Update the **Version** header in the tasks document
7. **Add a short changelog entry** noting finalization date and any notable scoping decisions.
8. **Freeze scope**: add a note stating changes require a new iteration/version bump and approvals.
9. **Confirm readiness for execution** with the user.

**Post-finalization guidance:**
- Track execution by checking items off in `tasks.md` as they complete.
- Keep traceability to PRD stories and Requirements FRs up to date if tasks are re-scoped.
- If new work is discovered, create a new iteration of the task plan after discussing impacts to timeline and scope.

### Quality bar
- Every user story maps to one or more implementation tasks with test coverage.
- Each task has clear acceptance checks and owner/role hints where relevant.
- Non-functional and compliance requirements are represented by explicit tasks.

### Embedded Tasks Template
Copy and fill this in `magen-sdd/001-<feature-name>/tasks.md`.

```markdown
# Implementation Tasks — <feature-id>

** Status **: Draft
** Version **: 1.0.0

## Conventions
- Link each task to PRD Feature and Story IDs and Requirements FR IDs.
- Check boxes `[ ]` become `[x]` when completed.

## LLM Instructions
- **Mark tasks as complete** by changing `[ ]` to `[x]` after successfully implementing each task
- **Update traceability** to ensure completed tasks maintain links to PRD Feature/Story IDs and Requirements FR IDs
- **Validate completion** by ensuring each task meets its definition of done and acceptance criteria
- **Update progress** in the feature's state.json when significant milestones are reached
- **Document any deviations** from the original plan in the changelog section

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

## Tasks completion checklist
- [ ] All PRD user stories map to one or more implementation tasks
- [ ] Each task references PRD Feature/Story IDs and Requirements FR IDs
- [ ] Tasks are small enough to complete in ≤ 1–3 days
- [ ] Each task has clear acceptance criteria and definition of done
- [ ] Unit tests are included for each component
- [ ] Integration/e2e tests are included for user flows
- [ ] Accessibility testing is included where applicable
- [ ] Observability and monitoring tasks are included
- [ ] Documentation tasks are included
- [ ] Environment setup tasks are included
- [ ] Release and deployment tasks are included
- [ ] Rollback procedures are documented
- [ ] Risks and mitigations are captured
- [ ] Owner/role hints are provided where relevant
- [ ] All checkboxes are initially unchecked (ready to execute)
- [ ] User has explicitly approved the tasks for finalization

```

### Next steps
- If the tasks are incomplete or unclear, follow the **Iteration Process** in the Execution Flow above.
- Once complete and approved, follow the **Finalization Process** in the Execution Flow above to mark them finalized.
- After finalization, proceed to delivery and keep task status synchronized with development progress.

