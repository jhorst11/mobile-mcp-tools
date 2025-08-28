/**
 * Type definitions for the SFMobile Native Workflow Orchestrator
 * Based on the design specification in docs/sfmobile_orchestrator_design.md
 */

export type Platform = "iOS" | "Android";

export type OrchestratorInput = {
  userRequest: string;           // e.g., "iOS app that lists Salesforce Contacts"
  platform: Platform;
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

export type Instruction = {
  step: string;                  // "template-discovery" | "project-generation"
  tool: string;                  // MCP tool name
  input: any;                    // tool input JSON
  timeoutMs?: number;
  id?: string;                   // step uuid
};

export type CredField = {
  key: "clientId" | "callbackUri";
  label: string;
  placeholder?: string;
  secret?: boolean;              // redact in logs
  validator?: "salesforceClientId" | "uri";
};

export type ProjectDraft = {
  projectName: string;
  packageName: string;
  organizationName: string;
  outputDirectory: string;
};

export type AskHuman =
  | { kind: "confirm-template"; options: Array<{ name: string; reason?: string }>; recommended?: string }
  | { kind: "collect-credentials"; fields: Array<CredField> }
  | { kind: "confirm-project-settings"; draft: ProjectDraft };

export type OrchestratorTick =
  | { instruction: Instruction; state?: Partial<WorkflowState> }  // do this next
  | { ask: AskHuman; state?: Partial<WorkflowState> }             // get info/approval
  | { completed: true; state: Partial<WorkflowState> };           // done

export type ToolResult =
  | { ok: true; tool: string; output: any; elapsedMs?: number }
  | { ok: false; tool: string; error: { type: string; message: string } };

export type WorkflowState = {
  // Inputs
  userRequest: string;
  platform: Platform;

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

export type WorkflowNode = "template-discovery" | "project-generation" | "completed";

// Template discovery tool types
export type TemplateDiscoveryInput = {
  platform: Platform;
};

export type TemplateDiscoveryOutput = {
  recommendedTemplate: string;
  alternatives: Array<{ name: string; reason?: string }>;
};

// Project generation tool types
export type ProjectGenerationInput = {
  selectedTemplate: string;
  projectName: string;
  packageName: string;
  organizationName: string;
  outputDirectory: string;
  platform: Platform;
  connectedAppClientId: string;
  connectedAppCallbackUri: string;
};

export type ProjectGenerationOutput = {
  projectPath: string;
  filesChanged: string[];
};
