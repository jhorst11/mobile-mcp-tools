### Build Requirements — LLM Instructions

Objective: Produce a first complete draft of `.magen/specs/<feature-id>/requirements.md` using the template below, then collaborate with the user to close gaps. Each feature has its own state file at `.magen/specs/<feature-id>/state.json`.

### State Management First
1. **Locate or create feature state file**:
   - If working with an existing feature, locate its state.json at `.magen/specs/<feature-id>/state.json`.
   - If creating a new feature, you'll need to initialize a new state.json file.
   - Check the feature's state.json to determine where you are in the process.

### Steps
1. **Locate or create feature folder**:
   - If working with an existing feature, use its feature ID.
   - If creating a new feature, propose a feature ID (e.g., `001-example-feature`).
   - Ensure the directory `.magen/specs/<feature-id>/` exists.

2. **Create or initialize state.json**:
   - Create or open `.magen/specs/<feature-id>/state.json`.
   - Initialize with the feature ID and set `specPath` to `.magen/specs/<feature-id>/`.
   - Set `requirementsPath` to `.magen/specs/<feature-id>/requirements.md`.

3. **Initialize timestamps**:
   - If `timestamps.created` is empty, set it to the current time.
   - Always update `timestamps.lastUpdated` when making changes.

4. **Seed from template**:
   - Use the template below to create the requirements document.
   - Remove the status metadata lines as this will be tracked in state.json instead.

5. **Populate Overview**:
   - Summarize intent, target users, business value, and scope boundaries.
   - If these are not provided, ask the user questions one by one.

6. **Draft Functional Requirements (FRs)**:
   - Use numbered FRs (FR1, FR2, …). One behavior per FR.
   - Each FR should be testable: include trigger, inputs, expected outcome, and acceptance criteria.
   - Capture edge cases and error handling at the FR level when relevant.
   - Document all FRs in the requirements.md file.

7. **Non‑Functional Requirements (NFRs)**:
   - List performance, security, availability, usability, privacy, accessibility, observability.
   - Document all NFRs in the requirements.md file.

8. **Constraints**:
   - Document technical, compliance, integrations, data residency, deadlines.
   - Document all constraints in the requirements.md file.

9. **Assumptions**:
   - Explicitly list what is presumed true.
   - Document all assumptions in the requirements.md file.

10. **Open Questions**:
    - Document anything unresolved.
    - Add each question to `requirements.openQuestions` array in the feature's state.json.

### User Collaboration Prompts
Ask concise questions to fill gaps. Prioritize ambiguous or high‑risk areas.
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
2. **Set completeness score**: Estimate initial `requirements.completenessScore` (0-100) in the feature's state.json.

### Iteration Loop
Once the first draft exists:
- Move to `.magen/specs/instructions/requirements/iterate-requirements.md` and follow its loop to converge on consensus.
- Keep unresolved items in the feature's state.json `requirements.openQuestions` array and revisit until resolved.
- Try to ensure no gaps in functional requirements exist.

### Finalization
When the user agrees that requirements are complete and testable:
- Proceed to `.magen/specs/instructions/requirements/finalize-requirements.md` to mark the document finalized.



### Embedded Requirements Template
Copy this into `.magen/specs/<feature-id>/requirements.md` and replace placeholders:

```markdown
# Requirements: <feature-id>

## Overview
<initial user intent>

## Functional Requirements
- FR1: [Requirement 1]
- FR2: [Requirement 2]
- FR3: [Requirement 3]

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

## Open Questions
- Q1: [Question 1]
- Q2: [Question 2]
```

Note: Status metadata (creation time, update time, approval status) is now tracked in state.json instead of in the document itself.
