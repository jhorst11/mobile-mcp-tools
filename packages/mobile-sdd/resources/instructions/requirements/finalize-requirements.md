### Finalize Requirements — LLM Instructions

Objective: Mark requirements as finalized in the feature's state.json once the user confirms completeness and testability.

### State Management First
1. **Locate feature state file**:
   - Identify the feature ID you're working with.
   - Locate the feature's state.json at `.magen/specs/<feature-id>/state.json`.
   - Verify the current state of the feature in its state.json file.
   - Confirm `requirements.state` is "in_progress" or "pending".
   - Check `requirements.completenessScore` is at an acceptable level (ideally 80+).

### Pre‑finalization checklist
- FRs in the requirements document are atomic, numbered, and have acceptance criteria.
- NFRs in the requirements document cover key quality attributes (performance, security, privacy, accessibility, availability, observability).
- Constraints and assumptions in the requirements document are explicit and stable.
- `requirements.openQuestions` array is empty or contains only explicitly deferred post‑MVP items.
- User explicitly confirms readiness to finalize.

### Finalization steps
1. **Update the feature's state.json**:
   - Set `requirements.state` to "finalized".
   - Set `timestamps.requirementsFinalized` to the current time.
   - Set `timestamps.lastUpdated` to the current time.
   - Add a finalization entry to the `changelog` array with details and date.

2. **Freeze scope**: 
   - Add a note to the requirements document: "Changes after finalization require a new iteration cycle and version bump."
   - This is now tracked in the feature's state.json with `requirements.state` = "finalized".

3. **Record completion**:
   - Ensure final `requirements.completenessScore` is recorded in the feature's state.json.
   - Document any deferred items that remain in `requirements.openQuestions` in the feature's state.json.

4. **Handoff**: 
   - Indicate next phases (PRD, tasks) will derive from these finalized requirements.
   - Set `state` in the feature's state.json to "requirements_complete" to indicate readiness for PRD phase.

### Post‑finalization guidance
- Treat further discoveries as inputs to a new iteration cycle; do not silently edit finalized requirements.
- Maintain traceability between requirements in the document and test cases/user stories in downstream artifacts.
- Any changes to requirements after finalization should be tracked with a new changelog entry and version increment in the feature's state.json.

### Next Steps
- Once requirements are finalized, proceed to the PRD phase using `.magen/specs/instructions/design/build-design.md`.
- Update the feature's state.json to reflect the transition to the PRD phase.


