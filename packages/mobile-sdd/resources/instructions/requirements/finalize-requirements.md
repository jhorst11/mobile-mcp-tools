### Finalize Requirements — LLM Instructions

Objective: Mark requirements as finalized in the feature's state.json ONLY after the user EXPLICITLY confirms completeness and testability.

### IMPORTANT: STRICT USER APPROVAL REQUIRED
- DO NOT finalize requirements automatically after answering open questions.
- ONLY finalize when the user has EXPLICITLY approved finalization with a clear statement like "I approve finalizing the requirements" or "The requirements can be finalized now".
- If the user has not explicitly approved finalization, continue with the iteration process.

### State Management First
1. **Locate feature state file**:
   - Identify the feature ID you're working with.
   - Locate the feature's state.json at `.magen/001-<feature-name>/state.json`.
   - Verify the current state of the feature in its state.json file.
   - Confirm `prd.state` is "finalized" and `requirements.state` is "in_progress" or "pending".
   - Check `requirements.completenessScore` is at an acceptable level (ideally 80+).

### Pre‑finalization checklist
- User has EXPLICITLY approved finalization with a clear statement (REQUIRED).
- FRs in the requirements document are atomic, numbered, and have acceptance criteria.
- FRs trace back to PRD features and story IDs where applicable.
- NFRs in the requirements document cover key quality attributes (performance, security, privacy, accessibility, availability, observability) with measurable targets.
- Constraints and assumptions in the requirements document are explicit and stable.
- `requirements.openQuestions` array is empty or contains only explicitly deferred post‑MVP items.
 - FR style: uses "System shall …" phrasing without restating PRD business context or user stories.
 - No duplication: requirements do not restate PRD acceptance criteria; they instead reference PRD IDs.
 - No code: the requirements contain no code blocks or code snippets; contracts are expressed with prose and tables only.
 - Technical Specification sections are present and concrete where applicable:
   - Data model and schemas 
   - API contracts and routes 
   - Events and state machines
   - Client/UI component contracts (props, states, accessibility)
   - Configuration and feature flags
   - Security and compliance details
   - Observability (metrics/logs/traces, dashboards, alerts)
   - Performance and capacity budgets
   - Deployment and migration plan (including rollback)
   - Error handling and fallback behaviors (e.g., slug collision, anti‑enumeration)
   - Analytics/SEO and metadata (if applicable)
 - Test plan mapping exists for FRs/NFRs (unit/integration/e2e/contract) and aligns with acceptance verification.

### Finalization steps
1. **CONFIRM user has explicitly approved finalization. If not, return to iteration.**
2. **Update the feature's state.json**:
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
   - Indicate the next phase (tasks) will derive from this finalized PRD and requirements set.
   - Set `state` in the feature's state.json to "requirements_complete" to indicate readiness for tasks phase.

### Post‑finalization guidance
- Treat further discoveries as inputs to a new iteration cycle; do not silently edit finalized requirements.
- Maintain traceability between requirements in the document and test cases/user stories in downstream artifacts.
- Any changes to requirements after finalization should be tracked with a new changelog entry and version increment in the feature's state.json.

### Next Steps
- Once requirements are finalized, proceed to the Tasks phase using `.magen/.instructions/tasks/build-tasks.md`.
- Update the feature's state.json to reflect the transition to the tasks phase.


