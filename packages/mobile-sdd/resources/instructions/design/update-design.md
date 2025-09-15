### Update PRD — LLM Instructions

You are an expert technical product manager. Apply a minimal, well-justified update to an existing PRD while preserving PRD-first discipline and traceability.

### Prerequisites (MUST)
- You have identified the feature (e.g., `.magen/001-<feature-name>/`).
- The target PRD exists at `.magen/001-<feature-name>/prd.md`.
- If the PRD is already finalized and updates are needed, set the feature's `prd.state` to `in_review` in `state.json` before editing, and record the reason in `changelog`.

### Inputs
- The current PRD content and its traceability elements (Features ↔ User Stories).
- The proposed change request or rationale from the user.

### Guardrails
- Prefer the smallest viable change that satisfies the need.
- Maintain internal consistency across sections and traceability.
- Ask one clarifying question at a time; wait for the user's response before proceeding.
- Keep a clear audit trail: update `state.json.timestamps.lastUpdated` and append a `changelog` entry.

### Method
1. Confirm scope of the change. If unclear, ask one targeted question and wait for the user's response.
2. Identify impacted sections (e.g., Goals, Features, User stories, NFRs, Traceability table) and ripple effects.
3. Propose a minimal diff to the PRD. Call out new/removed/altered Features or Stories and why.
4. Update the traceability table if Feature/Story relationships change.
5. Validate that acceptance criteria remain testable and that NFR budgets are still met, or adjust as needed.
6. Update the feature's `state.json`:
   - Set `timestamps.lastUpdated` to now.
   - Append a `changelog` entry with a short summary and links to impacted sections.
   - If the PRD was previously finalized, keep `prd.state: in_review` until the user explicitly re-approves.
7. Ask the user to review. Only when the user EXPLICITLY approves, proceed to `.magen/.instructions/design/finalize-design.md` to re-finalize the PRD (set `prd.state: finalized`).

### Quality bar
- Changes are narrowly scoped and justified.
- No contradictions; traceability is intact and updated.
- Acceptance criteria remain verifiable.

### Next steps
- If PRD is approved and finalized, proceed (or re-proceed) to requirements using `.magen/.instructions/requirements/build-requirements.md`.
