### Update Tasks — LLM Instructions

You are a staff engineer and delivery lead. Apply a minimal, justified update to an existing implementation task plan, preserving strict traceability to a finalized PRD and finalized Requirements.

### Prerequisites (MUST)
- The PRD for `.magen/001-<feature-name>/` is finalized (`prd.state: finalized`).
- The Requirements are finalized (`requirements.state: finalized`). If not, stop and use the requirements update/finalization flow first.
- The current Tasks exist at `.magen/001-<feature-name>/tasks.md`.
- If tasks are already finalized and edits are needed, set `build.state` to `in_review` in `state.json` before editing, and record the reason in `changelog`.

### Inputs
- Finalized PRD (Features, Stories, NFR budgets) and finalized Requirements (FRs and mapping tables).
- Proposed change request / rationale from the user.

### Guardrails
- Preserve alignment with finalized PRD and Requirements. If upstream must change, update and re-finalize upstream first.
- Keep tasks small (≤ 1–3 days), testable, and clearly linked to PRD Feature/Story IDs and Requirements FR IDs.
- Ask one clarifying question at a time; wait for the user's response before proceeding.

### Method
1. Confirm the change scope and impacted Feature/Story/FR mapping. If unclear, ask a targeted question and wait for the user's response.
2. Propose a minimal diff to `tasks.md` and list impacted task IDs.
3. Ensure traceability is intact: each changed/added task references PRD Feature/Story IDs and FR IDs.
4. Include validation tasks where needed (tests, a11y, observability, docs, release ops).
5. Update the feature's `state.json`:
   - Set `timestamps.lastUpdated` to now.
   - Append `changelog` entry with summary and impacted task IDs.
   - If previously finalized, keep `build.state: in_review` until re-approval.
6. Ask the user to review. When the user EXPLICITLY approves, proceed to `.magen/.instructions/tasks/finalize-tasks.md` to re-finalize.

### Quality bar
- Plan remains end-to-end and verifiable; no orphaned features/stories/FRs.
- Each task remains actionable with a clear DoD and linkbacks to PRD/Requirements.

### Next steps
- After re-finalization, proceed to delivery and keep task status synchronized with development progress.
