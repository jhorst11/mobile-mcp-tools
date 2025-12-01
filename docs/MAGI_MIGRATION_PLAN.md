# Workflow-Magi Migration Plan

## Overview

The `workflow-magi` package contains a comprehensive PRD (Product Requirements Document) generation workflow with 15 nodes that currently use the old `AbstractToolNode` architecture. This document outlines the plan to migrate them to the new `AbstractGuidanceNode` architecture.

## Current State Assessment

### Nodes to Migrate (15 total)

1. **PRDFailureNode** - Handles workflow failures
2. **PRDFeatureBriefGenerationNode** - Generates feature briefs
3. **PRDFeatureBriefReviewNode** - Reviews feature briefs
4. **PRDFeatureBriefUpdateNode** - Updates feature briefs
5. **PRDFeatureBriefFinalizationNode** - Finalizes feature briefs
6. **PRDInitialRequirementsGenerationNode** - Generates initial requirements
7. **PRDRequirementsReviewNode** - Reviews requirements
8. **PRDRequirementsUpdateNode** - Updates requirements
9. **PRDGapAnalysisNode** - Analyzes requirement gaps
10. **PRDGapRequirementsGenerationNode** - Generates requirements for gaps
11. **PRDRequirementsFinalizationNode** - Finalizes requirements
12. **PRDGenerationNode** - Generates PRD document
13. **PRDReviewNode** - Reviews PRD
14. **PRDUpdateNode** - Updates PRD
15. **PRDFinalizationNode** - Finalizes PRD

### Tools to Remove (After Migration)

All 15 corresponding MCP tools in `src/tools/prd/`:
- `magi-prd-failure`
- `magi-prd-feature-brief`
- `magi-prd-feature-brief-review`
- `magi-prd-feature-brief-update`
- `magi-prd-feature-brief-finalization`
- `magi-prd-initial-requirements`
- `magi-prd-requirements-review`
- `magi-prd-requirements-update`
- `magi-prd-gap-analysis`
- `magi-prd-gap-requirements`
- `magi-prd-requirements-finalization`
- `magi-prd-generation`
- `magi-prd-review`
- `magi-prd-update`
- `magi-prd-finalization`

**Note:** Keep `magi-prd-orchestrator` - that's the workflow orchestrator itself!

## Migration Strategy

### Option 1: Full Manual Migration (Time-Intensive)
- Migrate each of the 15 nodes individually
- Extract guidance from each corresponding tool
- Test each migration
- **Estimated effort:** 3-4 hours

### Option 2: Pattern-Based Batch Migration (Recommended)
Given that we've already established the pattern with mobile-native-mcp-server, we can:
1. Create a migration script/template
2. Apply the pattern systematically
3. Test in batches
- **Estimated effort:** 1-2 hours

### Option 3: Defer Migration (Not Recommended)
- Keep workflow-magi using old architecture
- Creates inconsistency across packages
- Miss out on benefits

## Recommended Approach: Option 2

### Phase 1: Migrate Similar Node Types Together

#### Batch 1: Failure & Initialization (2 nodes)
- PRDFailureNode
- PRDMagiInitializationNode (if it's a tool node)

#### Batch 2: Feature Brief Nodes (4 nodes)  
- PRDFeatureBriefGenerationNode
- PRDFeatureBriefReviewNode
- PRDFeatureBriefUpdateNode
- PRDFeatureBriefFinalizationNode

#### Batch 3: Requirements Nodes (6 nodes)
- PRDInitialRequirementsGenerationNode
- PRDRequirementsReviewNode
- PRDRequirementsUpdateNode
- PRDGapAnalysisNode
- PRDGapRequirementsGenerationNode
- PRDRequirementsFinalizationNode

#### Batch 4: PRD Document Nodes (4 nodes)
- PRDGenerationNode
- PRDReviewNode
- PRDUpdateNode
- PRDFinalizationNode

### Phase 2: Cleanup
- Remove obsolete tool directories (15 tools)
- Update index.ts registrations
- Remove test files for deleted tools
- Update documentation

## Benefits of Migration

### Performance
- Eliminate 15 intermediate tool invocations
- Faster workflow execution
- Better user experience

### Simplicity  
- **Before:** 1 orchestrator + 15 workflow tools = 16 tools
- **After:** 1 orchestrator = 1 tool
- **Reduction:** 94% fewer tools!

### Maintainability
- Guidance co-located with node logic
- Easier to understand flow
- Simpler testing

## Migration Pattern (Template)

For each node, the pattern is:

```typescript
// Before (Old Pattern)
import { AbstractToolNode, MCPToolInvocationData } from '@salesforce/magen-mcp-workflow';
import { TOOL_METADATA } from '../../../tools/prd/magi-prd-xyz/metadata.js';

export class XYZNode extends AbstractToolNode<PRDState> {
  execute = (state: PRDState): Partial<PRDState> => {
    const toolInvocationData: MCPToolInvocationData<typeof TOOL_METADATA.inputSchema> = {
      llmMetadata: { /* ... */ },
      input: { /* ... */ },
    };
    return this.executeToolWithLogging(toolInvocationData, TOOL_METADATA.resultSchema);
  };
}

// After (New Pattern)
import { AbstractGuidanceNode, NodeGuidanceData } from '@salesforce/magen-mcp-workflow';
import z from 'zod';

export class XYZNode extends AbstractGuidanceNode<PRDState> {
  execute = (state: PRDState): Partial<PRDState> => {
    const guidanceData: NodeGuidanceData = {
      nodeId: 'xyz',
      taskPrompt: this.generateXYZGuidance(state),
      taskInput: { /* state data */ },
      resultSchema: z.object({ /* schema */ }),
    };
    return this.executeWithGuidance(guidanceData);
  };

  private generateXYZGuidance(state: PRDState): string {
    // Guidance extracted from the old tool
    return `Task instructions...`;
  }
}
```

## Risks & Mitigations

### Risk 1: Breaking Changes
- **Mitigation:** Test each batch before moving to next
- **Mitigation:** Keep backward compatibility in mcp-workflow

### Risk 2: Complex Node Logic
- **Mitigation:** Some nodes have file I/O - preserve that logic
- **Mitigation:** Follow established patterns from mobile-native migration

### Risk 3: Test Coverage
- **Mitigation:** Update tests as we migrate
- **Mitigation:** Consider adding integration tests

## Success Criteria

- ✅ All 15 nodes migrated to AbstractGuidanceNode
- ✅ All 15 obsolete tools removed
- ✅ Tool registrations updated
- ✅ All linting passes
- ✅ Documentation updated
- ✅ Reduced from 16 tools to 1 tool

## Next Steps

1. **Confirm approach** with team
2. **Start with Batch 1** (Failure & Initialization)
3. **Validate pattern** works for magi workflow
4. **Continue with remaining batches**
5. **Cleanup obsolete code**
6. **Update documentation**

## Estimated Timeline

- **Batch 1:** 30 minutes
- **Batch 2:** 1 hour
- **Batch 3:** 1.5 hours  
- **Batch 4:** 1 hour
- **Cleanup:** 30 minutes
- **Total:** ~4.5 hours for complete migration

## Questions to Consider

1. Should we migrate all at once or incrementally?
2. Do we need to update the PRD workflow documentation?
3. Are there any dependencies between nodes we should be aware of?
4. Should we add integration tests for the new architecture?

---

**Status:** Planning Complete - Ready to Execute  
**Date:** December 1, 2025



