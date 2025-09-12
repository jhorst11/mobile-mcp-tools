### Finalize Implementation Tasks — LLM Instructions

Objective: Lock the implementation task plan once it is complete, traceable to the finalized PRD, and approved by the user.

### Pre-finalization checklist
- [ ] PRD is finalized (`Approval Status: Finalized`).
- [ ] Each PRD user story maps to one or more tasks.
- [ ] Tasks include testing, observability, accessibility, and security where applicable.
- [ ] Risks and mitigations are captured; owners/roles are identified where needed.
- [ ] Environment and release steps are included.
- [ ] All checkboxes in the plan are initially unchecked (plan ready to execute).

### Finalization steps
1. Update the header in `.magen/specs/<feature-id>/tasks.md`:
   - [ ] Set `Updated at` timestamp
   - [ ] Set `Approval Status: Finalized`
2. Add a short changelog entry noting finalization date and any notable scoping decisions.
3. Freeze scope: add a note stating changes require a new iteration/version bump and approvals.
4. Confirm readiness for execution with the user.

### Post-finalization guidance
- [ ] Track execution by checking items off in `tasks.md` as they complete.
- [ ] Keep traceability to PRD up to date if tasks are re-scoped.
- [ ] If new work is discovered, create a new iteration of the task plan after discussing impacts to timeline and scope.

