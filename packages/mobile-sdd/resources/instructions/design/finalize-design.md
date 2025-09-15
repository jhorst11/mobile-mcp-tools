### Finalize PRD — LLM Instructions

Objective: Mark the PRD as finalized ONLY after the user EXPLICITLY confirms completeness, consistency, and clear traceability between features and user stories; the PRD is now ready to derive technical requirements and tasks.

### IMPORTANT: STRICT USER APPROVAL REQUIRED
- DO NOT finalize the PRD automatically after answering open questions.
- ONLY finalize when the user has EXPLICITLY approved finalization with a clear statement like "I approve finalizing the PRD" or "The PRD can be finalized now".
- If the user has not explicitly approved finalization, continue with the iteration process.

### Pre-finalization checklist
- User has EXPLICITLY approved finalization with a clear statement (REQUIRED).
- PRD aligns with the feature brief and documented constraints.
- Each PRD feature maps to one or more user stories with testable acceptance criteria.
- NFRs include measurable budgets and observability at the PRD level.
- The Feature ↔ Story traceability table is complete and accurate.
- "Open questions" is empty or contains only explicitly deferred items (not MVP).

### Finalization steps
1. CONFIRM user has explicitly approved finalization. If not, return to iteration.
2. Update the feature's state.json:
   - Set `prd.state` to "finalized".
   - Set `timestamps.prdFinalized` to the current time.
   - Set `timestamps.lastUpdated` to the current time.
   - Add a finalization entry to the `changelog` array with details and date.
   - If this is a re-finalization, bump `prd.version` (use semantic versioning: patch/minor/major based on scope of change) and append a `prd.versionHistory` entry: `{ date, from, to, reason }`.
2. Insert/update metadata at the top of the PRD (Created/Updated, `Approval Status: Finalized`).
3. Add a brief changelog entry with the date and key decisions.
4. Freeze scope: add a note that changes require a new iteration and version bump.
5. Confirm downstream dependency: a finalized PRD is REQUIRED before deriving technical requirements and generating tasks. Proceed to `.magen/.instructions/requirements/build-requirements.md` after finalization.

### Post-finalization guidance
- Do not silently change finalized PRDs. Start a new iteration if scope changes.
- Maintain traceability into tasks, test cases, and design artifacts.

