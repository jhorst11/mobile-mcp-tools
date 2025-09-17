### Build Requirements — LLM Instructions

Objective: Derive technical requirements (FRs/NFRs), constraints, and assumptions from a finalized PRD and produce `.magen/001-<feature-name>/requirements.md`, then collaborate with the user to close gaps. Each feature has its own state file at `.magen/001-<feature-name>/state.json`.

### Prerequisites (MUST)
- A finalized PRD exists at `.magen/001-<feature-name>/prd.md`.
- The feature's state.json has `prd.state` = "finalized".

### Conventions (style and separation of concerns)
- Do not restate PRD business context or user stories in this document. Link to them.
- Use strict, testable "System shall …" statements for FRs; keep them implementation-agnostic but concrete.
- Tight traceability only: each FR references PRD Feature and Story IDs (e.g., `refs: Feature A; ST-101`).
- Categorize FRs when helpful: System (FR-SYS-*), UI/Client (FR-UI-*), Infrastructure (FR-INFRA-*), Compliance/Security (FR-COMP-*).
- Describe data schemas, API contracts, events, and technical specifications, but do not include code in the requirements document.
- Ask one question at a time when clarifying; wait for the user’s answer before proceeding.

### State Management First
1. **Locate or create feature state file**:
   - If working with an existing feature, locate its state.json at `.magen/001-<feature-name>/state.json`.
   - If creating a new feature, you'll need to initialize a new state.json file.
   - Check the feature's state.json to determine where you are in the process.
   - Confirm `prd.state` is "finalized" before proceeding.

### Steps
1. **Locate or create feature folder**:
   - If working with an existing feature, use its feature ID.
   - If creating a new feature, propose a feature ID (e.g., `001-example-feature`).
   - Ensure the directory `.magen/001-<feature-name>/` exists.

2. **Create or initialize state.json**:
   - Create or open `.magen/001-<feature-name>/state.json`.
   - Initialize with the feature ID and set `specPath` to `.magen/001-<feature-name>/`.
   - Set `requirementsPath` to `.magen/001-<feature-name>/requirements.md`.
   - Set `prd.path` to `.magen/001-<feature-name>/prd.md` (if not already set).

3. **Initialize timestamps**:
   - If `timestamps.created` is empty, set it to the current time.
   - Always update `timestamps.lastUpdated` when making changes.

4. **Read finalized PRD**:
   - Open `.magen/001-<feature-name>/prd.md`.
   - Identify features, user stories (ST-###), PRD-level NFRs, and constraints.
   - Note any open questions to clarify.

5. **Seed from template**:
   - Use the template below to create the requirements document.
   - Remove the status metadata lines as this will be tracked in state.json instead.

6. **Populate Overview**:
    - Summarize intent, target users, business value, and scope boundaries.
    - Base this on the finalized PRD; ask targeted questions one at a time if gaps remain, waiting for the user's answer before moving on.

7. **Draft Functional Requirements (FRs)**:
   - Derive from PRD features and user stories; use numbered FRs (FR1, FR2, …). One behavior per FR.
   - Phrase as "System shall …" with trigger, inputs, processing, outputs, error conditions, and verifiable acceptance checks.
   - Do not restate user stories or PRD acceptance criteria; instead, reference PRD IDs (e.g., `refs: Feature A; ST-101`).
   - Capture edge cases and error handling at the FR level when relevant.
   - Optionally tag FRs by category (FR-SYS-1, FR-UI-1, FR-INFRA-1, FR-COMP-1).
   - Document all FRs in the requirements.md file.

8. **Update PRD with FR IDs**:
   - Open the corresponding PRD file (`.magen/001-<feature-name>/prd.md`).
   - Locate the 'Future FR IDs' table.
   - Populate the table with the FR IDs generated in the previous step.

9. **Non‑Functional Requirements (NFRs)**:
   - Derive detailed technical NFRs from PRD-level NFRs: performance, security, availability, usability, privacy, accessibility, observability.
   - Provide measurable budgets (e.g., p95 latency ≤ 300ms, uptime ≥ 99.9%).
   - Document all NFRs in the requirements.md file.

10. **Constraints**:
   - Document technical, compliance, integrations, data residency, deadlines.
   - Document all constraints in the requirements.md file.

11. **Assumptions**:
   - Explicitly list what is presumed true.
   - Document all assumptions in the requirements.md file.

12. **Open Questions**:
    - Document anything unresolved.
    - Add each question to `requirements.openQuestions` array in the feature's state.json.

13. **Technical Specification** (produce concrete contracts; keep concise and testable)
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

### State Updates
After completing the initial draft:
1. **Update changelog**: Add an entry to the `changelog` array in the feature's state.json.

### Iteration Loop
Once the first draft exists:
- Move to `.magen/.instructions/requirements/iterate-requirements.md` and follow its loop to converge on consensus.
- Ensure each FR traces back to PRD features and stories; fill any gaps.

### Requirements Completion Checklist
Before finalizing the requirements, ensure all open questions have been answered:

- [ ] All functional requirements (FRs) are atomic, numbered, and use "System shall..." phrasing
- [ ] Each FR has clear acceptance criteria and traces back to PRD features and user stories
- [ ] All non-functional requirements (NFRs) include measurable targets and budgets
- [ ] Technical constraints and assumptions are explicitly documented
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
- [ ] User has explicitly approved the requirements for finalization

### Finalization
When the user agrees that requirements are complete and testable:
- Proceed to `.magen/.instructions/requirements/finalize-requirements.md` to mark the document finalized.
  - After finalization, proceed to `.magen/.instructions/tasks/build-tasks.md` to generate implementation tasks.



### Embedded Requirements Template
Copy this into `.magen/001-<feature-name>/requirements.md` and replace placeholders:

```markdown
# Requirements: <feature-id>

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
```

Note: Status metadata (creation time, update time, approval status) is now tracked in state.json instead of in the document itself.
