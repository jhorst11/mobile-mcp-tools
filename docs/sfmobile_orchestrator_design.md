# Orchestrator Design: `sfmobile-native-workflow-orchestrator` (Phase-1 Mini)

## 1) Purpose & Scope
Coordinate the **minimum happy path** from user utterance to a generated project on disk using **two tools only**:
1. `sfmobile-native-template-discovery`
2. `sfmobile-native-project-generation`

Out of scope (for this phase): build validation, code modification, deployment.

---

## 2) User Journey (Copilot mode)
1. User: “I want an iOS app that lists my Salesforce Contacts.”
2. Orchestrator emits an **instruction** to run **Template Discovery**.
3. LLM shows result(s) to the user and asks to confirm the template.
4. Orchestrator emits an **instruction** to run **Project Generation** with the chosen template and credentials.
5. LLM reports project path and suggests next steps (build).

---

## 3) Contracts

### 3.1 Orchestrator Tool Name & Purpose
- **Tool name:** `sfmobile-native-workflow-orchestrator`
- **Purpose:** Orchestrate Phase-1 mini-run by emitting stepwise **instructions** to the host/LLM and folding **tool results** into state until a terminal condition is met.

### 3.2 Orchestrator Input (from host/LLM)
```ts
type OrchestratorInput = {
  userRequest: string;           // e.g., "iOS app that lists Salesforce Contacts"
  platform: "iOS" | "Android";
  // Optional prefilled values (skip ask-human if provided)
  connectedApp?: {
    clientId?: string;           // "3MVG9..."
    callbackUri?: string;        // "myapp://oauth/callback"
  };
  project?: {
    name?: string;               // "ContactListApp"
    packageName?: string;        // "com.myco.contactlistapp"
    organizationName?: string;   // "My Company"
    outputDirectory?: string;    // defaults to cwd
  };
};
```

### 3.3 Orchestrator Output (per tick)
Exactly one of:
```ts
type OrchestratorTick =
  | { instruction: Instruction; state?: Partial<WorkflowState> }  // do this next
  | { ask: AskHuman; state?: Partial<WorkflowState> }             // get info/approval
  | { completed: true; state: Partial<WorkflowState> };           // done
```

Supporting types:
```ts
type Instruction = {
  step: string;                  // "template-discovery" | "project-generation"
  tool: string;                  // MCP tool name
  input: any;                    // tool input JSON
  timeoutMs?: number;
  id?: string;                   // step uuid
};

type AskHuman =
  | { kind: "confirm-template"; options: Array<{ name: string; reason?: string }>; recommended?: string }
  | { kind: "collect-credentials"; fields: Array<CredField> }
  | { kind: "confirm-project-settings"; draft: ProjectDraft };

type CredField = {
  key: "clientId" | "callbackUri";
  label: string;
  placeholder?: string;
  secret?: boolean;              // redact in logs
  validator?: "salesforceClientId" | "uri";
};

type ProjectDraft = {
  projectName: string;
  packageName: string;
  organizationName: string;
  outputDirectory: string;
};
```

### 3.4 Tool Result Envelope (host → orchestrator)
```ts
type ToolResult =
  | { ok: true; tool: string; output: any; elapsedMs?: number }
  | { ok: false; tool: string; error: { type: string; message: string } };
```

---

## 4) Workflow State Model
```ts
type WorkflowState = {
  // Inputs
  userRequest: string;
  platform: "iOS" | "Android";

  // Evolving facts
  selectedTemplate?: string;       // e.g., "salesforce-record-list-ios"
  templateOptions?: string[];      // surfaced from discovery
  projectPath?: string;

  // User-provided or prefilled
  connectedApp?: { clientId?: string; callbackUri?: string };
  project?: {
    name?: string;
    packageName?: string;
    organizationName?: string;
    outputDirectory?: string;
  };

  // Bookkeeping
  lastToolResult?: ToolResult;
  completed?: boolean;
  artifacts?: Record<string, any>; // e.g., discovery metadata
  retries?: Record<string, number>;
  workflowVersion?: string;
};
```

---

## 5) State Machine (nodes & transitions)

### Nodes
1. `template-discovery`
   - If `selectedTemplate` unset → **Instruction** to call `sfmobile-native-template-discovery`.
   - On success:
     - Stash options + recommended template in `artifacts`.
     - Emit **AskHuman (confirm-template)** if multiple viable options; otherwise auto-select recommended.
   - On failure → **AskHuman** to retry or abort (expose error message).

2. `project-generation`
   - Preconditions: `selectedTemplate` chosen AND `connectedApp.clientId/callbackUri` present AND project fields present.
   - If any missing → **AskHuman** for credentials and/or **AskHuman (confirm-project-settings)** with defaults.
   - Then **Instruction** to call `sfmobile-native-project-generation`.
   - On success: stash `projectPath`; **completed = true**.
   - On failure → **AskHuman** to fix inputs or abort.

### Transitions
- Entry → `template-discovery`
- `template-discovery` → `project-generation` (after selection confirmed)
- `project-generation` → `completed`

---

## 6) Tool I/O Mapping

### 6.1 `sfmobile-native-template-discovery`
**Input**
```json
{ "platform": "iOS" }
```
**Output**
```json
{
  "recommendedTemplate": "salesforce-record-list-ios",
  "alternatives": [
    { "name": "salesforce-record-list-ios", "reason": "record list, low complexity" }
  ]
}
```

### 6.2 `sfmobile-native-project-generation`
**Input**
```json
{
  "selectedTemplate": "<chosen>",
  "projectName": "ContactListApp",
  "packageName": "com.myco.contactlistapp",
  "organizationName": "My Company",
  "outputDirectory": "<cwd>",
  "platform": "iOS",
  "connectedAppClientId": "3MVG9...",
  "connectedAppCallbackUri": "myapp://oauth/callback"
}
```
**Output**
```json
{
  "projectPath": "/abs/ContactListApp",
  "filesChanged": ["ios/OAuthConfig.plist"]
}
```

---

## 7) Ask-Human Steps

- **confirm-template** → choose template from options.  
- **collect-credentials** → prompt user for Client ID + Callback URI.  
- **confirm-project-settings** → show draft settings and allow edits.

---

## 8) Observability & UX
- Timeline: shows discovery → project-generation → done.  
- Console: shows friendly messages + diffs.  
- Secrets redacted.  
- Logs: capture `instruction`, `toolResult`, and `stateDiff` each tick.

---

## 9) Error Handling
- Discovery fails → AskHuman: retry or abort.  
- Generation fails → AskHuman: fix inputs, retry, or abort.  
- Max 2 retries before requiring AskHuman.  

---

## 10) Security
- Mark `clientId` and `callbackUri` as `secret: true`.  
- Redact in logs/UI (`••••3MVG`).  

---

## 11) Testing
- Unit: confirm node transitions.  
- Integration: mock tools for happy path + failure.  
- Golden traces: lock expected sequence.  

---

## 12) Node Layout (LangGraph)
- Nodes: `template-discovery` → `project-generation` → `completed`.  
- Entry: `template-discovery`.  

---

## 13) Acceptance Criteria
- Given `{ userRequest, platform: "iOS" }`:  
  - Orchestrator emits template-discovery.  
  - User confirms.  
  - Orchestrator emits project-generation.  
  - On success, completed with `projectPath`.  

---

## 14) Rollout
1. Implement orchestrator per contract.  
2. Wire into host (handle `instruction`, `ask`, `completed`).  
3. Demo: user utterance → template chosen → project generated → `projectPath` surfaced.  
