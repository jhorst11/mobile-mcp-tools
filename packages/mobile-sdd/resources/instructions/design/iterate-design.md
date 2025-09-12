### Iterate on PRD — LLM Instructions

Goal: Refine the PRD with the user until it is complete, consistent, and fully traceable to finalized requirements.

### Iteration loop
Repeat until consensus:
1. Review alignment with finalized requirements (FRs/NFRs). Flag any divergence.
2. Ask targeted questions about unclear features, gaps, or edge cases.
3. Propose concrete edits to sections, features, stories, and acceptance criteria.
4. Update the traceability table (FR → Feature → Story IDs) as changes are made.
5. Validate NFR budgets and observability are specified and realistic.
6. Keep unresolved items in “Open questions”; revisit until resolved or explicitly deferred.

### Exit criteria (quality bar)
- All FRs are covered by features and user stories with testable acceptance criteria.
- No contradictions among sections; assumptions and constraints are reflected.
- NFRs have measurable targets and observability hooks.
- Traceability table is complete and accurate.
- User explicitly confirms readiness to finalize the PRD.

### Helpful prompts
- Which scenarios are high-risk or time-sensitive and need explicit fallbacks?
- Are there offline, localization, or accessibility concerns to capture?
- What SLAs or quotas apply to integrations? What happens on failure?
- Which metrics will we track to determine success in production?

Next: When criteria are satisfied, proceed to `.magen/specs/instructions/design/finalize-design.md`.

