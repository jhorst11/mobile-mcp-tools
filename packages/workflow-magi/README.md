# @salesforce/workflow-magi

Magi PRD Generation Workflow - A workflow package for PRD generation using LangGraph.

## Overview

This package contains the complete Magi workflow for Product Requirements Document (PRD) generation, including:

- Workflow graph definition and orchestration
- Workflow nodes for each step in the PRD generation process
- MCP tools for interacting with the workflow
- Utilities for managing Magi directories and artifacts

## Usage

```typescript
import {
  PRDGenerationOrchestrator,
  MagiFeatureBriefGenerationTool,
  MagiPRDGenerationTool,
  // ... other tools
} from '@salesforce/workflow-magi';

// Use the tools in your MCP server
const orchestrator = new PRDGenerationOrchestrator(server);
const featureBriefTool = new MagiFeatureBriefGenerationTool(server);
```

## Exports

- **Workflow Graph**: `prdGenerationWorkflow`
- **Workflow State**: `PRDGenerationWorkflowState`, `PRDState`
- **Tool Classes**: All Magi PRD tool classes
- **Utilities**: Magi directory management utilities

## Dependencies

- `@salesforce/magen-mcp-workflow` - Common workflow utilities
- `@langchain/langgraph` - Workflow orchestration
- `@modelcontextprotocol/sdk` - MCP SDK
