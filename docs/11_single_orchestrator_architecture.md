# Single Orchestrator Architecture

## Executive Summary

This document outlines the architectural transformation from the current multi-tool MCP workflow architecture to a single-orchestrator design where the orchestrator provides dynamic, state-based guidance directly to the LLM, eliminating the need for intermediate "tool nodes" that simply invoke other tools with guidance.

## Current Architecture Analysis

### How It Works Now

1. **Orchestrator Tool** invokes the workflow graph
2. **Workflow Graph** executes nodes sequentially
3. **Tool Nodes** (e.g., `TemplateSelectionNode`, `ProjectGenerationNode`) call `interrupt()` with `MCPToolInvocationData`
4. **Orchestrator** receives the interrupt, extracts tool metadata, and creates an **orchestration prompt**
5. **LLM** receives guidance to invoke another MCP tool (e.g., `sfmobile-native-template-selection`)
6. **MCP Tool** provides guidance back to LLM on what to do
7. **LLM** executes the task and returns results to the orchestrator
8. **Cycle repeats**

### The Problem

- **Double guidance**: Orchestrator says "invoke tool X", then tool X says "do task Y"
- **Unnecessary round trips**: LLM → Orchestrator → Tool → LLM → Orchestrator
- **Tool explosion**: Every agentic task needs its own MCP tool
- **Complex infrastructure**: Managing many tools, schemas, and metadata
- **MCP abuse**: Using MCP for orchestration instead of its intended purpose (providing context/capabilities)

## Proposed Architecture

### Core Principle

**The orchestrator is the only MCP tool.** It provides dynamic, state-aware guidance directly based on the current workflow node, eliminating intermediate tool invocations.

### How It Will Work

1. **Orchestrator Tool** invokes the workflow graph
2. **Workflow Graph** executes nodes sequentially  
3. **Nodes** call `interrupt()` with **guidance data** (not tool invocation data)
4. **Orchestrator** receives the interrupt, extracts guidance, and creates a **task prompt**
5. **LLM** receives complete task instructions and executes directly
6. **LLM** returns results to orchestrator with workflow state data
7. **Orchestrator** resumes workflow with results
8. **Cycle repeats**

### Key Differences

| Current | Proposed |
|---------|----------|
| `MCPToolInvocationData` with tool metadata | `NodeGuidanceData` with task instructions |
| Orchestrator generates "invoke tool X" prompt | Orchestrator generates complete task prompt |
| Separate MCP tool for each agentic task | No additional MCP tools |
| Tool provides guidance to LLM | Orchestrator provides all guidance |
| Multiple round trips per task | Single round trip per task |

## Detailed Implementation Plan

### Phase 1: Define New Data Structures

#### 1.1 Replace `MCPToolInvocationData` with `NodeGuidanceData`

```typescript
// packages/mcp-workflow/src/common/metadata.ts

/**
 * Data structure for node guidance
 * Contains everything needed for the orchestrator to create a task prompt
 */
export interface NodeGuidanceData {
  /**
   * Unique identifier for this node/task type
   * Used for logging and debugging
   */
  nodeId: string;
  
  /**
   * The task prompt that instructs the LLM what to do
   * This is the guidance that was previously in the tool
   */
  taskPrompt: string;
  
  /**
   * Input data/context for the task
   * Derived from workflow state
   */
  taskInput: Record<string, unknown>;
  
  /**
   * Zod schema defining expected output structure
   * Used to validate LLM response
   */
  resultSchema: z.ZodObject<z.ZodRawShape>;
  
  /**
   * Optional: Additional metadata for logging/debugging
   */
  metadata?: {
    nodeName: string;
    description: string;
  };
}
```

#### 1.2 Update Interrupt Mechanism

```typescript
// packages/mcp-workflow/src/nodes/toolExecutor.ts

export interface NodeExecutor {
  /**
   * Executes a node by invoking the underlying mechanism (e.g., LangGraph interrupt)
   * Now passes guidance data instead of tool invocation data
   */
  execute(guidanceData: NodeGuidanceData): unknown;
}

export class LangGraphNodeExecutor implements NodeExecutor {
  execute(guidanceData: NodeGuidanceData): unknown {
    return interrupt(guidanceData);
  }
}
```

### Phase 2: Update Orchestrator Tool

#### 2.1 Modify Orchestrator Processing

```typescript
// packages/mcp-workflow/src/tools/orchestrator/orchestratorTool.ts

private async processRequest(input: OrchestratorInput): Promise<OrchestratorOutput> {
  // ... existing setup code ...
  
  // Check for interrupted workflow state
  let result;
  if (interruptedTask) {
    // Resume workflow with user input from previous task execution
    result = await compiledWorkflow.invoke(
      new Command({ resume: input.userInput }),
      threadConfig
    );
  } else {
    // Start new workflow session
    result = await compiledWorkflow.invoke(
      { userInput: input.userInput },
      threadConfig
    );
  }

  // Process workflow result
  graphState = await compiledWorkflow.getState(threadConfig);
  if (graphState.next.length > 0) {
    // Extract guidance data (instead of tool invocation data)
    const nodeGuidanceData: NodeGuidanceData | undefined =
      '__interrupt__' in result
        ? (result.__interrupt__ as Array<{ value: NodeGuidanceData }>)[0].value
        : undefined;

    if (!nodeGuidanceData) {
      throw new Error('FATAL: Unexpected workflow state without an interrupt');
    }

    // Create complete task prompt (instead of orchestration prompt)
    const taskPrompt = this.createTaskPrompt(
      nodeGuidanceData,
      workflowStateData
    );

    // Save the workflow state
    await this.stateManager.saveCheckpointerState(checkpointer);

    return {
      orchestrationInstructionsPrompt: taskPrompt,
    };
  }

  // Workflow completed
  return {
    orchestrationInstructionsPrompt:
      'The workflow has concluded. No further workflow actions are forthcoming.',
  };
}
```

#### 2.2 Create New Task Prompt Generator

```typescript
// packages/mcp-workflow/src/tools/orchestrator/orchestratorTool.ts

/**
 * Create complete task prompt for LLM with embedded guidance and workflow state
 */
private createTaskPrompt(
  nodeGuidanceData: NodeGuidanceData,
  workflowStateData: WorkflowStateData
): string {
  return `
# Your Role

You are participating in a workflow orchestration process. The orchestrator is providing
you with a specific task to complete. After completing the task, you will return the
results to the orchestrator to continue the workflow.

# Your Task

${nodeGuidanceData.taskPrompt}

## Task Input

The following input data is provided for this task:

\`\`\`json
${JSON.stringify(nodeGuidanceData.taskInput, null, 2)}
\`\`\`

# Output Format

Your response must conform to the following JSON schema:

\`\`\`json
${JSON.stringify(zodToJsonSchema(nodeGuidanceData.resultSchema), null, 2)}
\`\`\`

# Post-Task Instructions

After completing the task:

1. Format your results according to the schema above
2. Invoke the \`${this.toolMetadata.toolId}\` tool to continue the workflow

Provide the following input values to the orchestrator:

- \`${WORKFLOW_PROPERTY_NAMES.userInput}\`: Your formatted task results
- \`${WORKFLOW_PROPERTY_NAMES.workflowStateData}\`: ${JSON.stringify(workflowStateData)}

This will continue the workflow orchestration process.
`;
}
```

### Phase 3: Update Node Architecture

#### 3.1 Replace `AbstractToolNode` with `AbstractGuidanceNode`

```typescript
// packages/mcp-workflow/src/nodes/abstractGuidanceNode.ts

import z from 'zod';
import { StateType, StateDefinition } from '@langchain/langgraph';
import { BaseNode } from './abstractBaseNode.js';
import { NodeGuidanceData } from '../common/metadata.js';
import { Logger, createComponentLogger } from '../logging/logger.js';
import { NodeExecutor, LangGraphNodeExecutor } from './nodeExecutor.js';
import { executeNodeWithLogging } from '../utils/nodeExecutionUtils.js';

/**
 * Abstract base class for nodes that provide guidance to the orchestrator
 * Replaces AbstractToolNode - no longer invokes separate tools
 */
export abstract class AbstractGuidanceNode<
  TState extends StateType<StateDefinition>,
> extends BaseNode<TState> {
  protected readonly logger: Logger;
  protected readonly componentName: string;
  protected readonly nodeExecutor: NodeExecutor;

  constructor(name: string, nodeExecutor?: NodeExecutor, logger?: Logger) {
    super(name);
    this.componentName = `WorkflowNode:${this.constructor.name}`;
    this.logger = logger ?? createComponentLogger(this.componentName);
    this.nodeExecutor = nodeExecutor ?? new LangGraphNodeExecutor();
  }

  /**
   * Protected method to execute node with logging and validation
   * Now uses guidance data instead of tool invocation data
   */
  protected executeWithGuidance<TResultSchema extends z.ZodObject<z.ZodRawShape>>(
    guidanceData: NodeGuidanceData,
    validator?: (result: unknown, schema: TResultSchema) => z.infer<TResultSchema>
  ): z.infer<TResultSchema> {
    return executeNodeWithLogging(
      this.nodeExecutor,
      this.logger,
      guidanceData,
      validator
    );
  }
}
```

#### 3.2 Create Guidance Generation Pattern

Each node that previously invoked a tool will now generate guidance directly:

```typescript
// Example: packages/mobile-native-mcp-server/src/workflow/nodes/templateSelection.ts

export class TemplateSelectionNode extends AbstractGuidanceNode<State> {
  constructor(nodeExecutor?: NodeExecutor, logger?: Logger) {
    super('templateSelection', nodeExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    // Check if already completed (idempotency)
    if (state.selectedTemplate) {
      this.logger.debug('Template already selected, skipping');
      return {};
    }

    // Validate prerequisites
    if (!state.templateDetails || Object.keys(state.templateDetails).length === 0) {
      return {
        workflowFatalErrorMessages: ['No template details available for selection'],
      };
    }

    // Create guidance data (instead of tool invocation data)
    const guidanceData: NodeGuidanceData = {
      nodeId: 'templateSelection',
      taskPrompt: this.createTemplateSelectionPrompt(),
      taskInput: {
        platform: state.platform,
        templateDetails: state.templateDetails,
      },
      resultSchema: z.object({
        selectedTemplate: z.string().describe('The name of the selected template'),
      }),
      metadata: {
        nodeName: this.name,
        description: 'Select the most appropriate template for the mobile app',
      },
    };

    // Execute with guidance
    const validatedResult = this.executeWithGuidance(guidanceData);

    if (!validatedResult.selectedTemplate) {
      return {
        workflowFatalErrorMessages: ['Template selection did not return a selectedTemplate'],
      };
    }

    // Extract template properties metadata
    const templatePropertiesMetadata = this.extractTemplatePropertiesMetadata(
      validatedResult.selectedTemplate,
      state.templateDetails
    );

    return {
      selectedTemplate: validatedResult.selectedTemplate,
      templatePropertiesMetadata,
    };
  };

  /**
   * Generate the task prompt for template selection
   * This is the guidance that was previously in the MCP tool
   */
  private createTemplateSelectionPrompt(): string {
    return `
# ROLE
You are a template selection expert responsible for choosing the most appropriate
mobile app template based on user requirements and available options.

# TASK
Analyze the provided template details and select the single most appropriate template
for the target platform.

# CONTEXT
You have been provided with:
- Target platform (iOS or Android)
- Detailed information about available templates including:
  - Template names and descriptions
  - Features and capabilities
  - Use cases and intended audiences
  - Required properties and configurations

# INSTRUCTIONS
1. Review all available template details carefully
2. Consider the target platform requirements
3. Evaluate which template best matches the intended use case
4. Select exactly ONE template by providing its name
5. Ensure the selected template supports the target platform

# OUTPUT
Provide your selection in the specified JSON format with the template name.
`;
  }

  // ... rest of the node implementation ...
}
```

### Phase 4: Remove Workflow Tool Infrastructure

#### 4.1 Delete Obsolete Tool Classes

Remove the following:
- `AbstractWorkflowTool` class
- All workflow-specific MCP tool implementations (e.g., `TemplateSelectionTool`, `ProjectGenerationTool`, etc.)
- Tool metadata files for workflow tools
- `finalizeWorkflowToolOutput()` method and related utilities

#### 4.2 Keep Only Orchestrator Tool

The only remaining MCP tool will be:
- `OrchestratorTool` - the single entry point for the workflow

#### 4.3 Update Utility Tools (Optional Enhancement)

Consider whether utility tools like `GetInputTool` and `InputExtractionTool` should:
- **Option A**: Remain as separate tools (they're more generic utilities)
- **Option B**: Be absorbed into the orchestrator with dynamic guidance
- **Recommendation**: Start with Option B for consistency, can always split out if needed

### Phase 5: Update Node Factories

#### 5.1 Update `createGetUserInputNode`

```typescript
// packages/mcp-workflow/src/nodes/index.ts

export function createGetUserInputNode<TState extends StateType<StateDefinition>>(
  options: GetUserInputNodeOptions
): AbstractGuidanceNode<TState> {
  const { requiredProperties, userInputProperty, nodeName } = options;
  const effectiveNodeName = nodeName ?? 'getUserInput';

  return new (class extends AbstractGuidanceNode<TState> {
    constructor() {
      super(effectiveNodeName);
    }

    execute = (state: TState): Partial<TState> => {
      // Generate guidance for input collection
      const guidanceData: NodeGuidanceData = {
        nodeId: `getUserInput-${effectiveNodeName}`,
        taskPrompt: this.createInputPrompt(requiredProperties),
        taskInput: {
          requiredProperties: this.serializeProperties(requiredProperties),
        },
        resultSchema: this.createInputResultSchema(requiredProperties),
      };

      const result = this.executeWithGuidance(guidanceData);
      return { [userInputProperty]: result } as Partial<TState>;
    };

    private createInputPrompt(properties: PropertyMetadataCollection): string {
      return `
# ROLE
You are an input gathering assistant responsible for collecting required information
from the user.

# TASK
Request the following information from the user and wait for their response:

${this.formatPropertiesForPrompt(properties)}

# INSTRUCTIONS
1. Present a clear, friendly prompt listing each required property
2. Explain what information is needed using the property descriptions
3. **CRITICAL**: WAIT for the user to provide their response
4. After receiving the user's response, format it according to the schema
5. Return the formatted result to the orchestrator

# IMPORTANT
You CANNOT proceed until the user provides their input. This is a blocking operation.
`;
    }

    // ... helper methods ...
  })();
}
```

#### 5.2 Update `createUserInputExtractionNode`

Similar pattern - generate guidance for extraction instead of invoking a tool.

### Phase 6: Migration Strategy

#### 6.1 Incremental Migration Approach

1. **Phase 6.1.1**: Create new guidance-based infrastructure alongside existing tool-based infrastructure
2. **Phase 6.1.2**: Migrate one workflow node at a time to use guidance
3. **Phase 6.1.3**: Test thoroughly after each node migration
4. **Phase 6.1.4**: Once all nodes migrated, remove old infrastructure

#### 6.2 Testing Strategy

For each migrated node:
1. **Unit tests**: Verify guidance generation produces correct prompts
2. **Integration tests**: Verify orchestrator correctly processes guidance
3. **E2E tests**: Verify workflow completes successfully end-to-end
4. **Comparison tests**: Compare behavior with old tool-based approach

#### 6.3 Rollback Plan

- Keep old tool-based infrastructure until migration is complete and tested
- Use feature flags to switch between old and new approaches during testing
- Maintain ability to revert individual nodes if issues are discovered

### Phase 7: Benefits Realization

#### 7.1 Simplified Architecture

**Before**:
- 1 Orchestrator tool
- ~15-20 workflow-specific MCP tools
- Complex tool metadata management
- Tool registration and lifecycle management

**After**:
- 1 Orchestrator tool
- No workflow-specific tools
- Simple guidance data structures
- Minimal metadata management

#### 7.2 Performance Improvements

- **Reduced round trips**: LLM → Orchestrator → LLM (instead of LLM → Orchestrator → Tool → LLM → Orchestrator)
- **Faster execution**: Fewer network calls and context switches
- **Better UX**: Less waiting time between steps

#### 7.3 Developer Experience

- **Easier to understand**: Single tool instead of tool explosion
- **Easier to debug**: Clear flow of guidance from node → orchestrator → LLM
- **Easier to extend**: Add new nodes by defining guidance, not creating tools
- **Easier to test**: Mock guidance data instead of tool infrastructure

#### 7.4 Reduced MCP Pollution

- Fewer tools registered with MCP server
- Better performance (MCP clients handle fewer tools)
- More appropriate use of MCP (tools provide capabilities, not orchestration)

### Phase 8: Implementation Checklist

- [ ] **Phase 1**: Define `NodeGuidanceData` structure
- [ ] **Phase 1**: Update interrupt mechanism to use guidance data
- [ ] **Phase 2**: Modify orchestrator to process guidance data
- [ ] **Phase 2**: Implement `createTaskPrompt()` method
- [ ] **Phase 3**: Create `AbstractGuidanceNode` base class
- [ ] **Phase 3**: Implement guidance generation pattern
- [ ] **Phase 4**: Remove workflow tool infrastructure
- [ ] **Phase 5**: Update node factory functions
- [ ] **Phase 6**: Execute migration plan
- [ ] **Phase 7**: Verify benefits realization
- [ ] **Phase 8**: Update documentation

### Phase 9: Documentation Updates

#### 9.1 Architecture Documentation

Update the following documentation:
- `docs/8_prd_workflow_architecture.md` - Reflect new single-tool architecture
- `docs/5_mobile_native_app_generation.md` - Update workflow diagrams and descriptions
- `docs/1_project_overview.md` - Update high-level architecture description

#### 9.2 Developer Guide

Create/update documentation for:
- How to create new workflow nodes with guidance
- Guidance prompt engineering best practices
- Testing guidance-based nodes
- Migration guide for existing workflows

#### 9.3 API Documentation

Update package READMEs:
- `packages/mcp-workflow/README.md` - Document new architecture
- `packages/mobile-native-mcp-server/README.md` - Update workflow examples

### Phase 10: Future Enhancements

#### 10.1 Dynamic Guidance Templates

Create reusable guidance templates for common patterns:
- Input collection template
- Data extraction template
- Selection/decision template
- Review/approval template
- Update/modification template

#### 10.2 Guidance Composition

Allow composing complex guidance from smaller pieces:

```typescript
const guidanceData: NodeGuidanceData = {
  nodeId: 'complexTask',
  taskPrompt: composeGuidance([
    roleGuidance('template selection expert'),
    taskGuidance('select appropriate template'),
    contextGuidance(state.templateDetails),
    instructionsGuidance(selectionSteps),
    outputGuidance(resultSchema),
  ]),
  // ...
};
```

#### 10.3 Guidance Validation

Implement validation for guidance prompts:
- Check for required sections (role, task, instructions, output)
- Validate prompt clarity and completeness
- Lint for common issues (ambiguity, missing context, etc.)

## Risk Assessment

### Risks

1. **LLM Prompt Length**: Consolidated guidance may create longer prompts
   - **Mitigation**: Use prompt compression techniques, template references
   
2. **Loss of Tool Modularity**: Guidance is now embedded in nodes
   - **Mitigation**: Extract guidance into separate, testable functions
   
3. **Migration Complexity**: Large codebase with many nodes to migrate
   - **Mitigation**: Incremental migration with thorough testing
   
4. **Behavioral Changes**: LLM may respond differently to direct guidance
   - **Mitigation**: Extensive comparison testing during migration

### Assumptions

1. LLMs perform equivalently with direct guidance vs. tool-based guidance
2. Orchestrator can effectively manage dynamic guidance generation
3. Single-tool architecture doesn't hit MCP protocol limitations
4. Reduced round trips provide meaningful performance improvements

## Success Criteria

1. ✅ **All workflow nodes migrated** from tool-based to guidance-based
2. ✅ **Zero additional MCP tools** beyond the orchestrator
3. ✅ **Performance improvement**: Measurable reduction in execution time
4. ✅ **Test coverage maintained**: All existing tests pass with new architecture
5. ✅ **Documentation updated**: Complete and accurate documentation
6. ✅ **Developer satisfaction**: Easier to understand and extend workflows

## Conclusion

This architectural change represents a significant simplification of the Magen workflow engine. By eliminating the intermediate tool layer and providing guidance directly from the orchestrator, we reduce complexity, improve performance, and create a more appropriate use of the MCP protocol.

The migration will be incremental and carefully tested to ensure we maintain all existing functionality while realizing the benefits of the new architecture.

