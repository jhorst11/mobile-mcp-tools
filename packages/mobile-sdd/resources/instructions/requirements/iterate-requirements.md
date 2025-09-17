### Iterate on Requirements — LLM Instructions

Goal: Collaboratively refine `.magen/001-<feature-name>/requirements.md` with the user until all FRs/NFRs are complete, testable, and unambiguous, and trace directly to PRD features and user stories. Each feature has its own state file at `.magen/001-<feature-name>/state.json`.

### Prerequisites (MUST)
- A finalized PRD exists at `.magen/001-<feature-name>/prd.md`.

### State Management First
1. **Locate feature state file**:
   - Identify the feature ID you're working with.
   - Locate the feature's state.json at `.magen/001-<feature-name>/state.json`.
   - Verify the current state of the feature in its state.json file.
   - Confirm `prd.state` is "finalized" and `requirements.state` is "in_progress" or "pending".

### Iteration Loop
Repeat until consensus:
1. **Surface uncertainties**: 
   - Identify any vague items in the requirements document and any ambiguities relative to PRD features and stories.

2. **Ask targeted questions**: 
   - Ask one question at a time; minimize cognitive load.
   - Update `timestamps.lastUpdated` in the feature's state.json after each interaction.

3. **Propose edits**: 
   - Suggest specific FR/NFR/Constraint edits. 
   - Apply them once the user agrees.
   - Update the requirements document with the agreed changes.
   - Ensure FRs use strict "System shall …" phrasing with triggers, inputs, processing, outputs, and error cases; do not restate PRD acceptance criteria.
   - Do not include code snippets or code blocks in the requirements; use descriptive prose and tables for schemas, routes, and metrics.

4. **Traceability check**: 
   - Ensure each FR links to acceptance criteria and maps to one or more PRD features and story IDs.
   - Ensure PRD-level NFRs are cascaded into measurable technical NFRs.
   - Update the requirements document as needed.

5. **Technical Specification completion**:
   - Fill out Data schemas, API contracts, Events/State, Client/UI contracts, Config/Flags, Security/Compliance, Observability, Performance/Capacity, Deployment/Migration, Error Handling, Analytics/SEO (as applicable).
   - Use tables and descriptive prose to keep contracts concise and verifiable. Do not include code blocks.

6. **Risk review**: 
   - Identify performance, security, or integration risks.
   - Add them to the appropriate sections in the requirements document.

7. **Update state**: 
   - Add an entry to the `changelog` array in the feature's state.json after significant changes.

### Quality Bar (exit criteria)
- FRs are numbered, atomic, and testable with clear acceptance criteria.
- Error conditions and edge cases covered or explicitly out of scope.
- NFRs include performance, security, privacy, accessibility, availability, observability with measurable targets.
- Constraints and assumptions are explicit and consistent with FRs.
- All open questions have been answered or explicitly deferred (not MVP).
- Each FR maps to at least one PRD feature and one or more PRD user stories where applicable.
- The user EXPLICITLY confirms readiness to finalize with a clear statement like "I approve finalizing the requirements" or "The requirements can be finalized now".
- FR style uses "System shall …" phrasing and avoids duplicating PRD business context or user stories.
- A Traceability table (FR ↔ PRD Feature ↔ PRD Story IDs) is present and complete.
- Technical Specification sections are present and concrete (schemas, routes, components, events/state, security, observability, performance, deployment, error handling, analytics/SEO as applicable).
- No code blocks or code snippets are present in the requirements; contracts are described via prose and tables only.


### Helpful Prompts
- Which flows must never block? What are acceptable fallbacks?
- What data retention and audit requirements apply?
- What rate limits or concurrency constraints exist?
- How will we observe success/failure (metrics, logs, alerts)?
- Are there localization, accessibility, or offline needs?

Ask the user clarification questions one at a time. Let them know they can choose to finalize at any time however the more the requirements are refined the better the outcome will be.

### IMPORTANT: STRICT USER APPROVAL REQUIRED
- DO NOT proceed to finalization automatically after answering open questions.
- ONLY proceed to finalization when the user has EXPLICITLY approved it with a clear statement.
- If the user has not explicitly approved finalization, continue with the iteration process.

Next: When the above criteria are satisfied and ONLY once the user has EXPLICITLY confirmed that they are ready to finalize, proceed to `.magen/.instructions/requirements/finalize-requirements.md` otherwise continue iterating.


