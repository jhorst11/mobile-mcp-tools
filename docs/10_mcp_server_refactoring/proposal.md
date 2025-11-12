# Proposal: Refactoring `@mobile-native-mcp-server`

**Status:** Proposed
**Date:** 2025-11-12

## Summary

This document proposes a refactoring of the `@mobile-native-mcp-server` package to improve modularity and separation of concerns. The existing package will be split into three new packages:

1.  `@mobile-native-mcp/workflow-magen`: Will contain the workflow definition (graph, nodes, tools) for native mobile project generation.
2.  `@mobile-native-mcp/workflow-magi`: Will contain the workflow definition (graph, nodes, tools) for the Magi (PRD generation) workflow.
3.  `@mobile-native-mcp/mcp-magen`: Will be the main MCP server package, consuming the two workflow packages to expose their capabilities.

This change continues the architectural improvements started with the abstraction of `@mcp-workflow`.

## Motivation

The `@mobile-native-mcp-server` package currently has multiple responsibilities:
- It defines the Magen (mobile native project management) workflow.
- It defines the Magi (PRD generation) workflow.
- It instantiates and configures the MCP server that serves both workflows.

This monolithic structure makes it difficult to maintain, test, and reuse individual workflows. As we plan to introduce new workflows like CAMA, this package would continue to grow in complexity.

By separating the workflow definitions from the server implementation, we aim to achieve:
-   **Improved Modularity:** Each workflow is a self-contained unit.
-   **Enhanced Reusability:** Workflows can be composed into different MCP servers or used in other contexts.
-   **Better Maintainability:** Smaller, focused packages are easier to understand and manage.
-   **Scalability:** The architecture will cleanly support the addition of new workflows in the future.

## Current Architecture

Currently, `@mobile-native-mcp-server` contains all the logic for both Magen and Magi workflows.

-   `src/index.ts`: The main entry point that initializes the `McpServer` and registers all tools for both Magen and Magi.
-   `src/workflow/graph.ts`: Defines the state graph and orchestration for the Magen workflow.
-   `src/workflow/magi/prd/graph.ts`: Defines the state graph and orchestration for the Magi workflow.
-   `src/tools/`: Contains tool implementations for both workflows, mixed in the same directory structure.
-   `src/workflow/nodes/`: Contains node implementations for the Magen workflow.
-   `src/workflow/magi/prd/nodes/`: Contains node implementations for the Magi workflow.

This colocation of distinct functionalities leads to a tightly coupled system.

## Proposed Architecture

We propose splitting `@mobile-native-mcp-server` into three distinct packages within the `packages/` directory. A diagram illustrating the dependencies between the new packages would show `mcp-magen` depending on `workflow-magen` and `workflow-magi`.

### 1. `@mobile-native-mcp/workflow-magen`

-   **Responsibility**: Encapsulates the entire Magen workflow for mobile native project management.
-   **Contents**:
    -   The Magen workflow graph (from `src/workflow/graph.ts`).
    -   All associated nodes (from `src/workflow/nodes/...`).
    -   All tools required by the Magen workflow (e.g., `SFMobileNativeTemplateDiscoveryTool`, `SFMobileNativeProjectGenerationTool`, etc.).
-   **Dependencies**: Will depend on `@mcp-workflow`.

### 2. `@mobile-native-mcp/workflow-magi`

-   **Responsibility**: Encapsulates the entire Magi workflow for PRD generation.
-   **Contents**:
    -   The Magi workflow graph (from `src/workflow/magi/prd/graph.ts`).
    -   All associated nodes (from `src/workflow/magi/prd/nodes/...`).
    -   All tools required by the Magi workflow (e.g., `MagiFeatureBriefGenerationTool`, `MagiPRDGenerationTool`, etc.).
-   **Dependencies**: Will depend on `@mcp-workflow`.

### 3. `@mobile-native-mcp/mcp-magen`

-   **Responsibility**: Acts as the primary MCP server, composing and exposing workflows. This package will replace the existing `@mobile-native-mcp-server`.
-   **Contents**:
    -   A simplified `src/index.ts` that initializes the `McpServer`.
    -   It will import workflows and tools from `@mobile-native-mcp/workflow-magen` and `@mobile-native-mcp/workflow-magi`.
    -   It will register the imported tools and orchestrators with the server.
-   **Dependencies**: Will depend on `@mobile-native-mcp/workflow-magen` and `@mobile-native-mcp/workflow-magi`.

## Proposed Package Structure

The proposed package structure under the `packages/` directory will be as follows. This illustrates the separation of concerns between workflow definitions and MCP server implementations.

```
packages/
  ├── mcp-workflow (common workflow utilities)
  │
  ├── workflow-magen (Magen workflow definition)
  │   └── depends on: mcp-workflow
  │
  ├── workflow-magi (Magi workflow definition)
  │   └── depends on: mcp-workflow
  │
  ├── mcp-magen (Primary MCP server)
  │   └── depends on: workflow-magen, workflow-magi
  │
  ├── workflow-cama (CAMA workflow definition)
  │   └── depends on: mcp-workflow
  │
  ├── mcp-cama (CAMA MCP server)
  │   └── depends on: workflow-cama
  │
  └── mcp-magi (Standalone Magi MCP server)
      └── depends on: workflow-magi
```

## Future Scope

This refactoring paves the way for a more scalable and maintainable architecture. Future development can follow this pattern:

-   **`@mobile-native-mcp/workflow-cama`**: A new package can be created to define the CAMA workflow, isolated from other workflows.
-   **`@mobile-native-mcp/mcp-cama`**: A dedicated MCP server for CAMA could be created, consuming only the `workflow-cama` package if needed.
-   **`@mobile-native-mcp/mcp-magi`**: A standalone MCP server for Magi could be created for scenarios where only PRD generation is required, simply by depending on `workflow-magi`.

This model provides significant flexibility in how we build, deploy, and scale our MCP services.
