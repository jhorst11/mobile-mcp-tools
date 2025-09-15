### Update Requirements — LLM Instructions

You are a staff engineer. Apply a minimal, justified update to an existing technical Requirements document derived from a finalized PRD.

### Prerequisites (MUST)
- The PRD for `.magen/001-<feature-name>/` is finalized (`prd.state: finalized`). If not, stop and return to PRD iteration/finalization.
- The current Requirements exist at `.magen/001-<feature-name>/requirements.md`.
- If Requirements are already finalized and edits are needed, set `requirements.state` to `in_review` in `state.json` before editing, and record the reason in `changelog`.

### Inputs
- Finalized PRD and its Feature ↔ Story traceability table.
- Current Requirements including FR IDs and mapping to PRD features/stories.
- Proposed change request / rationale from the user.

### Guardrails
- Preserve PRD-first alignment. Do not contradict the PRD. If the PRD must change, switch to PRD update flow first.
- Keep changes minimal and traceable. Maintain FR ↔ Feature/Story mapping.
- Ask one clarifying question at a time; wait for the user's response before proceeding.

### Method
1. Confirm whether the change is consistent with the finalized PRD. If not, redirect to PRD update.
2. Identify impacted FR(s), sections, and mappings. Note ripple effects on NFRs and testability.
3. Propose a minimal diff with explicit FR ID changes (add/remove/modify) and update the FR ↔ Feature/Story mapping table.
4. **Update PRD with FR IDs**:
   - Open the corresponding PRD file (`.magen/001-<feature-name>/prd.md`).
   - Locate the 'Future FR IDs' table.
   - Update the table with any new or modified FR IDs.
5. Validate testability and observability for changed FRs; update acceptance checks and budgets as needed.
6. Update the feature's `state.json`:
   - Set `timestamps.lastUpdated` to now.
   - Append a `changelog` entry with summary and impacted FRs.
   - If previously finalized, keep `requirements.state: in_review` until user re-approves.
7. Ask the user to review. When the user EXPLICITLY approves, proceed to `.magen/.instructions/requirements/finalize-requirements.md` to re-finalize.

### Quality bar
- No contradictions with the PRD. FRs remain testable and measurable.
- Mapping table is accurate and complete.
- NFR budgets and observability remain viable or are updated accordingly.

### Next steps
- Once re-finalized, proceed (or re-proceed) to tasks using `.magen/.instructions/tasks/build-tasks.md`.
