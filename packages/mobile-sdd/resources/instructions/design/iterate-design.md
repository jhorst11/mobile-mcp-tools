### Iterate on PRD — LLM Instructions

Goal: Refine the PRD with the user until it is complete, consistent, and traceable between features and user stories, and ready to derive technical requirements next.

### Iteration loop
Repeat until consensus:
1. Review alignment with the feature brief, product goals, and constraints. Flag any divergence.
2. Ask targeted questions about unclear features, gaps, or edge cases — one question at a time; wait for the user's answer before proceeding.
3. Propose concrete edits to sections, features, stories, and acceptance criteria.
4. Update the traceability table (Feature ↔ Story IDs) as changes are made. FR mapping will be added in the requirements phase.
5. Validate NFR budgets and observability are specified and realistic.
6. Keep unresolved items in “Open questions”; revisit until resolved or explicitly deferred.

### Exit criteria (quality bar)
- All PRD features are covered by one or more user stories with testable acceptance criteria.
- No contradictions among sections; assumptions and constraints are reflected.
- NFRs have measurable targets and observability hooks.
- Traceability table (Feature ↔ Story) is complete and accurate.
- User EXPLICITLY confirms readiness to finalize the PRD with a clear statement like "I approve finalizing the PRD" or "The PRD can be finalized now".

### Helpful prompts
- Which scenarios are high-risk or time-sensitive and need explicit fallbacks?
- Are there offline, localization, or accessibility concerns to capture?
- What SLAs or quotas apply to integrations? What happens on failure?
- Which metrics will we track to determine success in production?

### IMPORTANT: STRICT USER APPROVAL REQUIRED
- DO NOT proceed to finalization automatically after answering open questions.
- ONLY proceed to finalization when the user has EXPLICITLY approved it with a clear statement.
- If the user has not explicitly approved finalization, continue with the iteration process.

Next: When criteria are satisfied and ONLY once the user has EXPLICITLY confirmed that they are ready to finalize, proceed to `.magen/.instructions/design/finalize-design.md` otherwise continue iterating.

