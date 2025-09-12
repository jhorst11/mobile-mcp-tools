### Finalize PRD — LLM Instructions

Objective: Mark the PRD as finalized once the user confirms completeness, consistency, and traceability to the finalized requirements.

### Pre-finalization checklist
- The requirements document is finalized.
- Every FR maps to at least one PRD feature and one or more user stories.
- User stories have testable acceptance criteria and link back to FR IDs.
- NFRs include measurable budgets and observability.
- The traceability table is complete and accurate.
- "Open questions" is empty or contains only explicitly deferred items (not MVP).

### Finalization steps
1. Insert/update metadata at the top of the PRD (Created/Updated, `Approval Status: Finalized`).
2. Add a brief changelog entry with the date and key decisions.
3. Freeze scope: add a note that changes require a new iteration and version bump.
4. Confirm downstream dependency: a finalized PRD is REQUIRED before task generation.

### Post-finalization guidance
- Do not silently change finalized PRDs. Start a new iteration if scope changes.
- Maintain traceability into tasks, test cases, and design artifacts.

