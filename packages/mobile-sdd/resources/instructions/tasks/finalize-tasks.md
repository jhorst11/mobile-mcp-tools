### Finalize Implementation Tasks — LLM Instructions

Objective: Lock the implementation task plan ONLY after it is complete, traceable to the finalized PRD, and EXPLICITLY approved by the user.

### IMPORTANT: STRICT USER APPROVAL REQUIRED
- DO NOT finalize tasks automatically after answering open questions.
- ONLY finalize when the user has EXPLICITLY approved finalization with a clear statement like "I approve finalizing the tasks" or "The tasks can be finalized now".
- If the user has not explicitly approved finalization, continue with the iteration process.

### Pre-finalization checklist
- [ ] User has EXPLICITLY approved finalization with a clear statement (REQUIRED).
- [ ] PRD is finalized (`Approval Status: Finalized`).
- [ ] Requirements are finalized at `.magen/001-<feature-name>/requirements.md`.
- [ ] Each PRD user story maps to one or more tasks, and tasks reference Requirements FR IDs where applicable.
- [ ] Tasks include testing (unit, integration/e2e), observability, accessibility, performance/security where applicable.
- [ ] Risks and mitigations are captured; owners/roles are identified where needed.
- [ ] Environment and release steps are included.
- [ ] All checkboxes in the plan are initially unchecked (plan ready to execute).

### Finalization steps
1. CONFIRM user has explicitly approved finalization. If not, return to iteration.
2. Update the header in `.magen/001-<feature-name>/tasks.md`:
   - [ ] Set `Updated at` timestamp
   - [ ] Set `Approval Status: Finalized`
2. Update the feature's `state.json`:
   - Set `build.state` to "finalized".
   - Set `timestamps.tasksFinalized` to the current time.
   - Set `timestamps.lastUpdated` to the current time.
   - Add a finalization entry to the `changelog` array with details and date.
   - If this is a re-finalization, bump `build.version` (semantic versioning: patch/minor/major based on scope) and append a `build.versionHistory` entry: `{ date, from, to, reason }`.
3. Add a short changelog entry noting finalization date and any notable scoping decisions.
4. Freeze scope: add a note stating changes require a new iteration/version bump and approvals.
5. Confirm readiness for execution with the user.

### Post-finalization guidance
- [ ] Track execution by checking items off in `tasks.md` as they complete.
- [ ] Keep traceability to PRD stories and Requirements FRs up to date if tasks are re-scoped.
- [ ] If new work is discovered, create a new iteration of the task plan after discussing impacts to timeline and scope.

