### Build PRD — LLM Instructions

You are an expert technical product manager. Generate a complete, clear PRD from a finalized requirements document.

### Prerequisites (MUST)
- A finalized requirements document exists at `.magen/specs/<feature-id>/requirements.md` and is marked `Approval Status: Finalized`.
- If not finalized, stop and follow the requirements iteration/finalization guides first.

### Inputs
- Finalized Functional Requirements (FRs), NFRs, Constraints, Assumptions from the requirements document.
- Any domain context provided by the user.

### Output
- A single, well-structured PRD rendered inside `<PRD>...</PRD>` tags using the embedded template below.

### Guardrails
- Do not invent scope beyond finalized requirements. If gaps are discovered, ask targeted questions or start the PRD iteration loop.
- Maintain strict traceability from PRD content to FR IDs.

### Method
1. Read the finalized requirements; extract FRs, NFRs, Constraints, and Assumptions.
2. Group related FRs into features; preserve original FR IDs for traceability.
3. Draft the PRD using sentence case for headings (title in Title Case).
4. Create user stories with acceptance criteria that map to FR IDs (use `ST-###`).
5. Include a traceability table (FR → Feature → User Story IDs).
6. Validate completeness and internal consistency. If anything is unclear, ask the user precise questions.

### Section guidance
- Introduction: Purpose and scope of this PRD.
- Product overview: What the product/feature is and is not (in/out of scope).
- Goals and objectives: Measurable outcomes and success metrics.
- Target audience: Primary users, roles, and contexts.
- Features and requirements: Feature breakdown tied to FRs; include acceptance criteria at feature level when relevant.
- User stories and acceptance criteria: Comprehensive stories (primary, alt, edge), each testable and linked to FRs.
- Technical requirements / stack: Platform, integrations, constraints, data, privacy, security; reflect NFRs.
  - If building Salesforce mobile components, favor GraphQL wire adapter over Apex controllers.
- Design and user interface: UX principles, wireframes/mockups references, accessibility.

### Quality bar
- Every FR is represented by at least one PRD feature and one or more user stories.
- Each user story has testable acceptance criteria and clear success/failure conditions.
- NFRs are concretely specified (budgets, thresholds, SLAs) and linked to observability.
- No contradictions; all assumptions and constraints are reflected.

### Embedded PRD Template
Fill this template and present the final output within `<PRD>...</PRD>` tags.

```markdown
<PRD>

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
   - Feature 1 (maps to FRs: FR1, FR3, ...)
     - Description
     - Key acceptance criteria
   - Feature 2 (...)

6. Traceability
   | FR ID | Feature | User Story IDs |
   |-------|---------|----------------|
   | FR1   | Feature 1 | ST-101, ST-102 |

7. User stories and acceptance criteria
   - ST-101: As a <role>, I want <capability> so that <value>. (FR1)
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

</PRD>
```

### Formatting
- Use sentence case for all headings except the title (Title Case).
- Use numbered sections/subsections; tables where helpful; concise language.

### Next steps
- If the PRD is incomplete or unclear, proceed to `.magen/specs/instructions/design/iterate-design.md`.
- Once complete and approved, follow `.magen/specs/instructions/design/finalize-design.md` to mark it finalized.
