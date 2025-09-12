### Iterate on Requirements — LLM Instructions

Goal: Collaboratively refine `.magen/specs/<feature-id>/requirements.md` with the user until all FRs/NFRs are complete, testable, and unambiguous. Each feature has its own state file at `.magen/specs/<feature-id>/state.json`.

### State Management First
1. **Locate feature state file**:
   - Identify the feature ID you're working with.
   - Locate the feature's state.json at `.magen/specs/<feature-id>/state.json`.
   - Verify the current state of the feature in its state.json file.
   - Confirm `requirements.state` is "in_progress" or "pending".
   - Review existing `requirements.openQuestions` array in the feature's state.json.

### Iteration Loop
Repeat until consensus:
1. **Surface uncertainties**: 
   - Read `requirements.openQuestions` array from the feature's state.json.
   - Identify any vague items in the requirements document.

2. **Ask targeted questions**: 
   - One topic at a time; minimize cognitive load.
   - Update `timestamps.lastUpdated` in the feature's state.json after each interaction.

3. **Propose edits**: 
   - Suggest specific FR/NFR/Constraint edits. 
   - Apply them once the user agrees.
   - Update the requirements document with the agreed changes.

4. **Traceability check**: 
   - Ensure each FR links to acceptance criteria and success metrics.
   - Update the requirements document as needed.

5. **Risk review**: 
   - Identify performance, security, or integration risks.
   - Add them to the appropriate sections in the requirements document.

6. **Update state**: 
   - Update `requirements.openQuestions` in the feature's state.json by removing resolved questions.
   - Add new questions as they arise.
   - Add an entry to the `changelog` array in the feature's state.json after significant changes.

### Quality Bar (exit criteria)
- FRs are numbered, atomic, and testable with clear acceptance criteria.
- Error conditions and edge cases covered or explicitly out of scope.
- NFRs include performance, security, privacy, accessibility, availability, observability.
- Constraints and assumptions are explicit and consistent with FRs.
- `requirements.openQuestions` array is empty or limited to items explicitly deferred post‑MVP.
- The user confirms readiness to finalize.

### Completeness Score
- After each iteration, recalculate `requirements.completenessScore` (0-100) in the feature's state.json.
- Base the score on:
  - Percentage of FRs with clear acceptance criteria
  - Percentage of open questions resolved
  - Coverage of key NFR categories
  - Clarity of constraints and assumptions

### Helpful Prompts
- Which flows must never block? What are acceptable fallbacks?
- What data retention and audit requirements apply?
- What rate limits or concurrency constraints exist?
- How will we observe success/failure (metrics, logs, alerts)?
- Are there localization, accessibility, or offline needs?

Ask the user clarification questions one at a time. Let them know they can choose to finalize at any time however the more the requirements are refined the better the outcome will be.

If a user chooses to finalize prematurely, warn them based on the current completeness score in the feature's state.json. Explain that the lower the completeness score, the higher the risk of defects.

Next: When the above criteria are satisfied, proceed to `.magen/specs/instructions/requirements/finalize-requirements.md`.


