### Build Requirements — LLM Instructions

Objective: Derive technical requirements (FRs/NFRs), constraints, and assumptions from a finalized PRD and produce `magen-sdd/001-<feature-name>/requirements.md`, then collaborate with the user to close gaps. Each feature has its own state file at `magen-sdd/001-<feature-name>/state.json`.

### Prerequisites (MUST)
- A finalized PRD exists at `magen-sdd/001-<feature-name>/prd.md`.
- The feature's state.json has `prd.state` = "finalized".

### Conventions (style and separation of concerns)
- Do not restate PRD business context or user stories in this document. Link to them.
- Use strict, testable "System shall …" statements for FRs; keep them implementation-agnostic but concrete.
- Tight traceability only: each FR references PRD Feature and Story IDs (e.g., `refs: Feature A; ST-101`).
- Categorize FRs when helpful: System (FR-SYS-*), UI/Client (FR-UI-*), Infrastructure (FR-INFRA-*), Compliance/Security (FR-COMP-*).
- Describe data schemas, API contracts, events, and technical specifications, but do not include code in the requirements document.
- Ask one question at a time when clarifying; wait for the user's answer before proceeding.
- **Open questions**: Document unresolved items that need clarification. **Remove questions from this section once answered and incorporated into the requirements.**
- **Checklist completion**: Always mark checklist items as complete when the corresponding work is done, especially the "Mapping table in PRD file updated" item.

### State Management First
1. **Locate or create feature state file**:
   - If working with an existing feature, locate its state.json at `magen-sdd/001-<feature-name>/state.json`.
   - If creating a new feature, you'll need to initialize a new state.json file.
   - Check the feature's state.json to determine where you are in the process.
   - Confirm `prd.state` is "finalized" before proceeding.

### User Collaboration Prompts
Ask concise questions to fill gaps. Prioritize ambiguous or high‑risk areas.
- Ask one question at a time; wait for the user's answer before moving to the next.
- What are the primary user roles and their permissions?
- What are the core user journeys to support in v1?
- What systems do we integrate with? 
- What data is sensitive or regulated (PII/PHI/PCI)?
- What platforms are in scope (web, mobile, API)? Any out of scope?
- What success metrics define "done" for this feature?

If answers affect existing FRs/NFRs, update both the document and the feature's state.json immediately.

### Execution Flow

#### Initial Requirements Creation
1. **Locate or create feature folder**:
   - If working with an existing feature, use its feature ID.
   - If creating a new feature, propose a feature ID (e.g., `001-example-feature`).
   - Ensure the directory `magen-sdd/001-<feature-name>/` exists.

2. **Create or initialize state.json**:
   - Create or open `magen-sdd/001-<feature-name>/state.json`.
   - Initialize with the feature ID.

3. **Initialize timestamps**:
   - If `timestamps.created` is empty, set it to the current time.
   - Always update `timestamps.lastUpdated` when making changes.

4. **Read finalized PRD**:
   - Open `magen-sdd/001-<feature-name>/prd.md`.
   - Identify features, user stories (ST-###), PRD-level NFRs, and constraints.
   - Note any open questions to clarify.

5. **Seed from template**:
   - Use the template below to create the requirements document.
   - Set the **Version** header to "1.0.0" for the initial version.

6. **Populate Overview**:
    - Summarize intent, target users, business value, and scope boundaries.
    - Base this on the finalized PRD; ask targeted questions one at a time if gaps remain, waiting for the user's answer before moving on.

8. **Draft Functional Requirements (FRs)**:
   - Derive from PRD features and user stories; use numbered FRs (FR1, FR2, …). One behavior per FR.
   - Phrase as "System shall …" with trigger, inputs, processing, outputs, error conditions, and verifiable acceptance checks.
   - Do not restate user stories or PRD acceptance criteria; instead, reference PRD IDs (e.g., `refs: Feature A; ST-101`).
   - Capture edge cases and error handling at the FR level when relevant.
   - Optionally tag FRs by category (FR-SYS-1, FR-UI-1, FR-INFRA-1, FR-COMP-1).
   - Document all FRs in the requirements.md file.

9. **Update PRD with FR IDs**:
   - Open the corresponding PRD file (`magen-sdd/001-<feature-name>/prd.md`).
   - Locate the 'Future FR IDs' table.
   - Populate the table with the FR IDs generated in the previous step.
   - **Mark the "Mapping table in PRD file updated" checklist item as complete** in the requirements template.

10. **Non‑Functional Requirements (NFRs)**:
   - Derive detailed technical NFRs from PRD-level NFRs: performance, security, availability, usability, privacy, accessibility, observability.
   - Provide measurable budgets (e.g., p95 latency ≤ 300ms, uptime ≥ 99.9%).
   - Document all NFRs in the requirements.md file.

11. **Constraints**:
   - Document technical, compliance, integrations, data residency, deadlines.
   - Document all constraints in the requirements.md file.

12. **Assumptions**:
   - Explicitly list what is presumed true.
   - Document all assumptions in the requirements.md file.

13. **Open Questions**:
     - Document anything unresolved in the Open Questions section of the requirements document.
     - **When user answers open questions**: Update the relevant sections of the requirements with the new information and **remove the answered question from the "Open Questions" section** (section 13).

14. **Technical Specification** (produce concrete contracts; keep concise and testable)
    - Data model and schemas:
      - Entities, fields, types, nullability, constraints, indexes. 
    - API contracts and routes:
      - Method, path, auth, headers, params, request/response schema, error codes, idempotency, rate limits, versioning.
    - Events and state machines:
      - Event names, topics, payload schemas, ordering/delivery guarantees, retries/DLQ; state diagrams and transitions.
    - Client/UI component contracts:
      - Components, props/inputs/outputs, state shape, loading/error/empty states, accessibility behaviors.
    - Configuration and feature flags:
      - Names, defaults, scope, rollout/kill switch strategy.
    - Security and compliance details:
      - AuthN/AuthZ flows, scopes/permissions, data retention/redaction, secrets handling, audit trails.
    - Observability:
      - Metrics (RED/USE), logs/events schema, trace spans, dashboards, alert rules (thresholds, ownership).
    - Performance and capacity planning:
      - Budgets, expected traffic, load profiles, concurrency, backpressure policies; perf test plan.
    - Deployment and migration plan:
      - Steps, DB migrations, compatibility windows, rollback strategy, safety checks.
    - Error handling and fallback behaviors:
      - Failure modes, retries, user-visible errors, rate limiting, anti-enumeration for slugs/tokens.
    - Analytics/SEO and metadata (if applicable):
      - Analytics events, OpenGraph/meta tags for public pages.
    - Test plan mapping:
      - For each FR/NFR, list unit/integration/e2e/contract tests and how they validate acceptance.

15. **Mark checklist items as complete** in the requirements template as you validate each requirement.

16. **Update state**: Add an entry to the `changelog` array in the feature's state.json.

#### Iteration Process
When the requirements need refinement or have gaps, follow this iteration loop:

1. **Surface uncertainties**: 
   - Identify any vague items in the requirements document and any ambiguities relative to PRD features and stories.

2. **Ask targeted questions**: 
   - Ask one question at a time; minimize cognitive load.
   - Update `timestamps.lastUpdated` in the feature's state.json after each interaction.
   - **When user answers questions**: Update the relevant sections of the requirements with the new information and **remove the answered question from the "Open Questions" section** (section 13).

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

7. **Update checklist items** in the requirements template to reflect current completion status as you make changes.

8. **Update state**: 
   - Add an entry to the `changelog` array in the feature's state.json after significant changes.

**Iteration exit criteria:**
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

#### Update Process
For applying minimal, well-justified updates to an existing requirements document:

1. **Confirm scope** of the change. If unclear, ask one targeted question and wait for the user's response.
   - **When user answers questions**: Update the relevant sections of the requirements with the new information and **remove the answered question from the "Open Questions" section** (section 13).
2. **Identify impacted sections** (e.g., FRs, NFRs, Technical Specification) and ripple effects.
3. **Propose a minimal diff** with explicit FR ID changes (add/remove/modify) and update the FR ↔ Feature/Story mapping table.
4. **Update PRD with FR IDs**:
   - Open the corresponding PRD file (`magen-sdd/001-<feature-name>/prd.md`).
   - Locate the 'Future FR IDs' table.
   - Update the table with any new or modified FR IDs.
   - **Mark the "Mapping table in PRD file updated" checklist item as complete** in the requirements template.
5. **Update the requirements version**:
   - For minor updates: Increment patch version (e.g., 1.0.0 → 1.0.1)
   - For new features: Increment minor version (e.g., 1.0.0 → 1.1.0)
   - For breaking changes: Increment major version (e.g., 1.0.0 → 2.0.0)
   - Update the **Version** header in the requirements document
6. **Validate testability and observability** for changed FRs; update acceptance checks and budgets as needed.
7. **Update checklist items** in the requirements template to reflect any changes in completion status.
8. **Update the feature's state.json**:
   - Set `timestamps.lastUpdated` to now.
   - Append a `changelog` entry with summary and impacted FRs.
   - If previously finalized, keep `requirements.state: in_review` until user re-approves.
9. **Ask the user to review**. Only when the user EXPLICITLY approves, proceed to finalization.

#### Finalization Process
**IMPORTANT: STRICT USER APPROVAL REQUIRED**
- DO NOT finalize requirements automatically after answering open questions.
- ONLY finalize when the user has EXPLICITLY approved finalization with a clear statement like "I approve finalizing the requirements" or "The requirements can be finalized now".
- If the user has not explicitly approved finalization, continue with the iteration process.

**Pre-finalization checklist:**
- User has EXPLICITLY approved finalization with a clear statement (REQUIRED).
- FRs in the requirements document are atomic, numbered, and have acceptance criteria.
- FRs trace back to PRD features and story IDs where applicable.
- NFRs in the requirements document cover key quality attributes (performance, security, privacy, accessibility, availability, observability) with measurable targets.
- Constraints and assumptions in the requirements document are explicit and stable.
- All open questions have been answered or explicitly deferred (not MVP).
- FR style: uses "System shall …" phrasing without restating PRD business context or user stories.
- No duplication: requirements do not restate PRD acceptance criteria; they instead reference PRD IDs.
- No code: the requirements contain no code blocks or code snippets; contracts are expressed with prose and tables only.
- Technical Specification sections are present and concrete where applicable.
- Test plan mapping exists for FRs/NFRs (unit/integration/e2e/contract) and aligns with acceptance verification.

**Finalization steps:**
1. **CONFIRM user has explicitly approved finalization**. If not, return to iteration.
2. **Verify all checklist items are marked complete** in the requirements template. If any items are incomplete, address them before finalizing.
3. **Update the feature's state.json**:
   - Set `requirements.state` to "finalized".
   - Set `timestamps.requirementsFinalized` to the current time.
   - Set `timestamps.lastUpdated` to the current time.
   - Add a finalization entry to the `changelog` array with details and date.
4. **Freeze scope**: 
   - Add a note to the requirements document: "Changes after finalization require a new iteration cycle and version bump."
   - This is now tracked in the feature's state.json with `requirements.state` = "finalized".
5. **Update the requirements version**:
   - For initial version: Set to "1.0.0"
   - For subsequent versions: Use semantic versioning (patch/minor/major based on scope of change)
   - Update the **Version** header in the requirements document
7. **Handoff**: 
   - Indicate the next phase (tasks) will derive from this finalized PRD and requirements set.
   - Set `state` in the feature's state.json to "requirements_complete" to indicate readiness for tasks phase.

**Post-finalization guidance:**
- Treat further discoveries as inputs to a new iteration cycle; do not silently edit finalized requirements.
- Maintain traceability between requirements in the document and test cases/user stories in downstream artifacts.
- Any changes to requirements after finalization should be tracked with a new changelog entry and version increment in the requirements document.

### Next steps
- If the requirements are incomplete or unclear, follow the **Iteration Process** in the Execution Flow above.
- Once complete and approved, follow the **Finalization Process** in the Execution Flow above to mark them finalized.
  - After finalization, proceed to `magen-sdd/.instructions/tasks/build-tasks.md` to generate implementation tasks.



### Embedded Requirements Template
Copy this into `magen-sdd/001-<feature-name>/requirements.md` and replace placeholders:

```markdown
# Requirements: <feature-id>

** Status **: Draft
** Version **: 1.0.0

## Conventions
- System shall… style; do not restate PRD business/user-story context.
- Link each FR to PRD Feature and Story IDs (e.g., refs: Feature A; ST-101).
- Use tables and descriptive prose for contracts (schemas, routes, metrics); do not include code in the requirements document.

## Overview and technical scope
- Link to PRD: [./prd.md](./prd.md)
- Provide a brief technical scope boundary (do not restate PRD business/user-story context).

## Functional Requirements
### System-level (FR-SYS-*)
- FR-SYS-1: The system shall […] — refs: Feature A; ST-101
  - Acceptance verification: […]

### UI/Client (FR-UI-*)
- FR-UI-1: The system shall […] — refs: Feature B; ST-102
  - Acceptance verification: […]

### Infrastructure/Platform (FR-INFRA-*)
- FR-INFRA-1: The system shall […] — refs: Feature C; ST-103
  - Acceptance verification: […]

### Compliance/Security (FR-COMP-*)
- FR-COMP-1: The system shall […] — refs: Feature D; ST-104
  - Acceptance verification: […]

## Traceability
| FR ID      | PRD Feature | PRD Story IDs |
|------------|-------------|---------------|
| FR-SYS-1   | Feature A   | ST-101        |

## Non-Functional Requirements
- NFR1: [Performance requirement]
- NFR2: [Security requirement]
- NFR3: [Usability requirement]

## Constraints
- C1: [Technical constraint]
- C2: [Business constraint]

## Assumptions
- A1: [Assumption 1]
- A2: [Assumption 2]

## Technical specification
### Data model and schemas
- Entities and fields: list entities with key fields.
- Types and nullability: describe expected types and whether fields are required/optional.
- Constraints and indexes: describe uniqueness, foreign keys, and indexing needs.
- Notes: include retention, PII classification, and data lifecycle as needed.

### API contracts and routes
| Method | Path       | Auth  | Request fields (summary) | Response fields (summary) | Errors (summary) | Notes |
|--------|------------|-------|---------------------------|----------------------------|------------------|-------|
| GET    | /api/v1/… | OAuth | …                         | …                          | 4xx/5xx …        | Rate limit: … |

### Events and state machines
- States: enumerate states with entry/exit conditions.
- Transitions: describe triggers and guards for each transition.
- Events: name, topic, payload fields, ordering/delivery guarantees, retries/DLQ.

### Client/UI component contracts
- Component: <Name>
  - Props: …
  - States: loading/error/empty
  - Accessibility: …

### Configuration and feature flags
- FLAG_<NAME>: default=false; scope=tenant; rollout steps=…

### Security and compliance details
- AuthZ matrix, scopes, data retention, audit trails

### Observability
- Metrics: RED/USE targets; logs schema; trace spans; alert rules

### Performance and capacity planning
- Budgets: p95 latency ≤ …; QPS; concurrency; backpressure policy

### Deployment and migration plan
- Steps, safety checks, compatibility window, rollback

### Error handling and fallback behaviors
- Failure modes, retries, user-visible errors; anti-enumeration, rate limits

### Analytics/SEO and metadata (if applicable)
- Analytics events; OpenGraph/meta tags

### Test plan mapping
- FR-SYS-1 → unit:…, integration:…, e2e:…

## Open Questions
- Q1: [Question 1]
- Q2: [Question 2]

## Requirements completion checklist
- [ ] All functional requirements (FRs) are atomic, numbered, and use "System shall..." phrasing
- [ ] Each FR has clear acceptance criteria and traces back to PRD features and user stories
- [ ] All non-functional requirements (NFRs) include measurable targets and budgets
- [ ] Technical constraints and assumptions are explicitly documented
- [ ] **Mapping table in <INSERT LINK TO PRD.md> file updated** (MUST mark complete when PRD is updated with FR IDs)
- [ ] Data model and schemas are defined with types, nullability, and constraints
- [ ] API contracts and routes are specified with method, path, auth, and error codes
- [ ] Events and state machines are documented with transitions and payloads
- [ ] Client/UI component contracts include props, states, and accessibility
- [ ] Configuration and feature flags are defined with scope and rollout strategy
- [ ] Security and compliance details include auth flows and data retention
- [ ] Observability includes metrics, logs, traces, and alert rules
- [ ] Performance and capacity planning includes budgets and load profiles
- [ ] Deployment and migration plan includes steps and rollback strategy
- [ ] Error handling and fallback behaviors are specified
- [ ] Test plan mapping exists for all FRs/NFRs
- [ ] User has explicitly approved the requirements for finalization (all above tasks must be completed or removed)
```

Note: Status metadata (creation time, update time, approval status) is now tracked in state.json instead of in the document itself.
