### Build PRD — LLM Instructions

You are an expert technical product manager. Generate a complete, clear PRD from the feature brief.

### Prerequisites (MUST)
- A feature brief exists (intent, users, business value, constraints) in conversation context and/or the feature's state.json.
- If starting fresh, initialize the feature per `START.md` and gather the brief from the user.

### Inputs
- Feature brief and domain context provided by the user.
- Known constraints, assumptions, and goals captured during kickoff.

### Output
- A single, well-structured PRD rendered inside using the embedded template below.
- Save the PRD to `.magen/001-<feature-name>/prd.md`.

### Guardrails
- Do not invent scope beyond the feature brief; ask targeted questions and capture unknowns as open questions.
- Maintain internal consistency and traceability from product goals to features and user stories. Technical requirements will be derived later.
 - Interaction cadence: ask one question at a time; wait for the user's response before proceeding.

### Method
1. Capture the feature brief: goals, users, value, and constraints. Clarify unknowns with targeted questions, one at a time; wait for the user's response before moving on.
2. Define product features from goals and scope; document assumptions and constraints.
3. Draft the PRD using sentence case for headings (title in Title Case).
4. Create user stories with testable acceptance criteria. Assign `ST-###` IDs.
5. Include a traceability table (Feature ↔ User Story IDs). Note: detailed technical FRs will be added in the next phase.
6. Validate completeness and internal consistency. If anything is unclear, ask the user precise questions and iterate.
7. Only once the PRD is complete and the user agrees to finalize, proceed to `.magen/.instructions/prd/finalize-prd.md`.

### Section guidance
- Introduction: Purpose and scope of this PRD.
- Product overview: What the product/feature is and is not (in/out of scope).
- Goals and objectives: Measurable outcomes and success metrics.
- Target audience: Primary users, roles, and contexts.
- Features and requirements: Feature breakdown tied to goals; include acceptance criteria at feature level where relevant. FRs will be derived in the next phase.
- User stories and acceptance criteria: Comprehensive stories (primary, alt, edge), each testable and linked to features. FR mapping will be added in the requirements phase.
- Technical requirements / stack: High-level platform, integrations, constraints, data, privacy, security; reflect NFRs at a PRD level.
  - Keep technical details high-level; detailed technical requirements will be captured in the next phase.
  - If building Salesforce mobile components, favor GraphQL wire adapter over Apex controllers.
- Design and user interface: UX principles, wireframes/mockups references, accessibility.

### Quality bar
- Every PRD feature is represented by one or more user stories aligned to goals.
- Each user story has testable acceptance criteria and clear success/failure conditions.
- NFRs are concretely specified at the PRD level (budgets, thresholds, SLAs) and linked to observability.
- No contradictions; all assumptions and constraints are reflected.

### Embedded PRD Template
Fill this template.

```markdown
# <Product/Feature Title>

1. Introduction
   - Purpose
   - Scope

2. Product overview
   - Problem statement
   - In-scope / Out-of-scope

3. Goals and objectives
   - Business goals
   - Success metrics (KPIs)

4. Target audience
   - Users/roles
   - Contexts/platforms

5. Features and requirements
   - Feature 1 (FR mapping will be added in the requirements phase)
     - Description
     - Key acceptance criteria
   - Feature 2 (...)

6. Traceability
   | Feature | User Story IDs | Future FR IDs (added in requirements phase) |
   |---------|-----------------|--------------------------------------------|
   | Feature 1 | ST-101, ST-102 | TBD |

7. User stories and acceptance criteria
   - ST-101: As a <role>, I want <capability> so that <value>.
     - Acceptance criteria:
       - Given/When/Then ...
   - ST-102: ...

8. Technical requirements / stack
   - Architecture and integrations
   - Data model and privacy
   - Performance, availability, security (NFR budgets)
   - Observability (metrics, logs, alerts)

9. Design and user interface
   - UX guidelines
   - Wireframes/mockups (links)
   - Accessibility (WCAG targets)

10. Assumptions and constraints
    - Assumptions
    - Constraints

11. Open questions
    - Q1: ...
```

### Formatting
- Use sentence case for all headings except the title (Title Case).
- Use numbered sections/subsections; tables where helpful; concise language.

### PRD Completion Checklist
Before finalizing the PRD, ensure all open questions have been answered:

- [ ] All feature goals and scope are clearly defined
- [ ] Target audience and user roles are specified
- [ ] Business goals and success metrics are measurable
- [ ] All features have corresponding user stories with testable acceptance criteria
- [ ] User stories cover primary, alternative, and edge case scenarios
- [ ] Traceability table (Feature ↔ User Story IDs) is complete and accurate
- [ ] Technical requirements and constraints are documented at appropriate level
- [ ] Non-functional requirements include measurable budgets and observability
- [ ] Design and UI guidelines are specified
- [ ] All assumptions and constraints are explicitly documented
- [ ] No contradictions exist between sections
- [ ] User has explicitly approved the PRD for finalization

### Next steps
- If the PRD is incomplete or unclear, proceed to `.magen/.instructions/prd/iterate-prd.md`.
- Once complete and approved, follow `.magen/.instructions/prd/finalize-prd.md` to mark it finalized.
- After finalization, proceed to `.magen/.instructions/requirements/build-requirements.md` to derive technical requirements.
