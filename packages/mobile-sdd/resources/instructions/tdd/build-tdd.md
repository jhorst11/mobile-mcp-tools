# Build TDD — LLM Instructions

You are an expert technical architect. Your goal is to derive technical requirements (FRs/NFRs), constraints, and assumptions from a finalized PRD and produce `magi-sdd/001-<feature-name>/tdd.md`, then collaborate with the user to close gaps. Each feature has its own state file at `magi-sdd/001-<feature-name>/state.json`.

---

### Prerequisites (MUST)

- A finalized PRD MUST exist at `magi-sdd/001-<feature-name>/prd.md`.
- The TDD MUST NOT proceed unless the PRD is finalized.

### Custom Instructions (MUST)

- The model MUST read and follow any custom instructions in `magi-sdd/hooks/tdd-hook.md` if it exists.
- Custom instructions in the hook file take precedence over these default instructions.
- If the hook file contains "## LLM IGNORE FOLLOWING (USER MUST POPULATE)", the model MUST ignore the hook file content and proceed with these default instructions.

---

### Conventions (MUST, MUST NOT, SHOULD, MAY)
- The TDD MUST NOT restate PRD business context or user stories. It MUST link to them instead.
- FRs MUST use strict, testable "System shall …" phrasing. They MUST be implementation-agnostic but concrete.
- Each FR MUST reference PRD Feature and Story IDs (e.g., `refs: Feature A; ST-101`).
- FRs MAY be categorized when helpful: System (FR-SYS-*), UI/Client (FR-UI-*), Infrastructure (FR-INFRA-*), Compliance/Security (FR-COMP-*).
- The Technical Specification MUST describe schemas, API contracts, events, and technical specifications in prose and tables. It MUST NOT include code snippets or code blocks.
- Open questions MUST be documented. Once resolved, they MUST be removed and incorporated into the TDD.
- Checklist items MUST be marked complete only when the work is actually done. Placeholders that are not applicable MUST be removed.

### Visual Format for Questions

When asking clarifying questions about technical requirements, the model MUST use a visually appealing format with clear formatting and visual separators. Example:

```markdown
## Technical Clarification Questions

**TDD Progress:** ████████░░ 80%

---

### 1) Architecture Pattern
**What is the preferred architectural approach for this feature?**

| Option | Pattern | Description |
|--------|---------|-------------|
| **A** | Microservices | Independent services with APIs |
| **B** | Monolithic | Single application with modules |
| **C** | Event-driven | Async communication via events |
| **D** | Mobile-first | Native mobile with backend API |
| **E** | **Other** (please describe): ___________ |

---

### 2) Data Storage Requirements
**What are the data persistence needs?**

| Option | Type | Description |
|--------|------|-------------|
| **A** | Relational | Structured data, ACID compliance |
| **B** | NoSQL | Flexible schema, high scale |
| **C** | Search | Full-text search capabilities |
| **D** | Time-series | Metrics and analytics data |
| **E** | **Other** (please describe): ___________ |

---

**Tip:** You can respond with just the letter (A, B, C, etc.) or provide additional details!
```

---

### State Management (MUST)
1. The model MUST locate or create the feature’s state.json file at `magi-sdd/001-<feature-name>/state.json`.
2. The model MUST confirm `prd.state = finalized` before proceeding.
3. The model MUST update `timestamps.lastUpdated` and append to the changelog on every change.

---

### User Collaboration Prompts (MUST)
- The model MUST prioritize ambiguous or high-risk areas.  
- The model MUST ask one targeted question at a time to resolve a specific technical ambiguity or high-risk area. It SHOULD NOT ask broad, open-ended questions that could be broken down into smaller, more specific inquiries. The model MAY group very closely related, atomic questions (e.g., "What is the format of the `userId`? And what is the format of the `accountId`?") if it improves user clarity.
- The model MUST NOT continue generating without waiting for the user’s answer.  
- The model MAY ask about user roles, journeys, integrations, sensitive data, platforms, and success metrics.  

---

### Execution Flow

#### Initial TDD Creation
1. The model MUST locate or create the feature folder.
2. The model MUST create or open the feature’s `state.json` and initialize if new.
3. The model MUST update timestamps accordingly.
4. The model MUST read the finalized PRD and extract features, user stories, NFRs, and constraints.
5. The model MUST seed the TDD file from the provided template.
6. The model MUST populate the Overview by linking to PRD and asking questions if gaps exist.
7. The model MUST draft FRs as atomic, numbered, and testable “System shall …” statements with acceptance verification.
8. The model MUST update the PRD with FR IDs in the mapping table and mark the checklist item complete.
9. The model MUST derive NFRs with measurable budgets (e.g., p95 latency ≤ 300ms, uptime ≥ 99.9%).  
10. The model MUST document all Constraints and Assumptions.  
11. The model MUST maintain the Open Questions section until all are resolved.  
12. The Technical Specification section MUST cover schemas, APIs, events/state machines, client contracts, config/flags, security, observability, performance, deployment, error handling, analytics/SEO (if applicable), and test mapping.  
13. The model MUST mark checklist items complete as work is done.  
14. The model MUST update state.json with changelog entries.  

**IMPORTANT GATING RULE:** The model MUST NOT proceed to implementation task generation (`magi-sdd/.instructions/tasks/build-tasks.md`) until the TDD is explicitly finalized by the user. The presence of a finalized PRD alone is NOT sufficient.

---

### Iteration Process
- The model MUST surface uncertainties in the Open Questions section.  
- The model MUST ask targeted questions to resolve a specific technical ambiguity or high-risk area using the enhanced visual format. The model MAY group very closely related questions together and present them using the enhanced visual format with tables and clear separators.
- The model MUST update state.json timestamps on every interaction.  
- When user answers are provided, the model MUST incorporate them and remove resolved questions.  
- The model MUST propose FR/NFR edits only with user agreement.  
- The model MUST ensure traceability (FR ↔ PRD Feature ↔ PRD Story).  
- The Technical Specification MUST be kept concise, testable, and code-free.  
- Risks SHOULD be documented in the appropriate sections.  
- Checklist items MUST be updated as progress is made.  

---

### Update Process
- The model MUST confirm the scope of changes. If unclear, it MUST ask one clarifying question using the enhanced visual format.  
- The model MUST identify impacted sections and update them with minimal diffs.  
- The PRD mapping table MUST be updated with any new/changed FR IDs.  
- The TDD version MUST follow semantic versioning.  
- The model MUST update state.json with timestamps and changelog entries.  
- If previously finalized, the TDD state MUST be reset to `in_review` until the user re-approves.  

---

### Finalization Process (STRICT)

- The model MUST NOT finalize a TDD without explicit user approval.  
- The user MUST explicitly approve with a statement like “I approve finalizing the TDD.”  
- The model MUST confirm all checklist items are complete.  
- The TDD MUST contain atomic, numbered FRs, measurable NFRs, explicit constraints/assumptions, no code, and complete technical specifications.  
- The model MUST record `tdd.state = finalized` in `state.json` and update timestamps.  
- The TDD document MUST include a note: “Changes after finalization require a new iteration cycle and version bump.”  
- The model MUST update the TDD version using semantic versioning.

**STRICT GATING RULE:** The model MUST NOT generate implementation tasks until `tdd.state = finalized` is set in the feature’s state.json.  

---

### Embedded TDD Template (MUST use this for drafting)
```markdown
# TDD: <feature-id>

** Status **: Draft
** Version **: 1.0.0

## Conventions
- System shall… style; do not restate PRD business/user-story context.
- Link each FR to PRD Feature and Story IDs (e.g., refs: Feature A; ST-101).
- Use tables and descriptive prose for contracts (schemas, routes, metrics); do not include code in the TDD document.

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

## TDD completion checklist
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
- [ ] User has explicitly approved the TDD for finalization (all above tasks must be completed or removed)
- [ ] The document status has been marked "Finalized"
- [ ] The state.json file has been updated with tdd.state = "finalized"

### Next Steps
- If the TDD is incomplete, the model MUST follow the Iteration Process.  
- Once finalized, the model MAY proceed to `magi-sdd/.instructions/tasks/build-tasks.md` to generate tasks.  