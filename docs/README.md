# Documentation

This project maintains comprehensive documentation to help developers understand and implement mobile capabilities in Salesforce Lightning Web Components.

## Documentation Structure

The documentation is organized in the `/docs` directory:

- **`/docs/`** - Project documentation including:
  - [Project Overview](./1_project_overview.md) - High-level project goals and architecture
  - [Mobile Native App Generation](./5_mobile_native_app_generation.md) - Comprehensive MCP server design for native app generation
  - [Execution Architecture](./10_execution_architecture.md) - Command execution and progress reporting architecture
  - [Single Orchestrator Architecture](./11_single_orchestrator_architecture.md) - New simplified workflow orchestration design
  - [Mobile Native Migration Complete](./MIGRATION_COMPLETE.md) - ✅ Mobile-native-mcp-server migration completion
  - [Workflow-Magi Migration Plan](./MAGI_MIGRATION_PLAN.md) - Migration plan for workflow-magi package
  - [Workflow-Magi Migration Complete](./MAGI_MIGRATION_COMPLETE.md) - ✅ Workflow-magi migration completion
  - [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Detailed implementation progress
  - [README](./README.md) - Documentation index and navigation

## Getting Started with Documentation

1. **Start with the [Project Overview](./1_project_overview.md)** to understand the project's purpose and architecture
2. **Review [Mobile Native App Generation](./5_mobile_native_app_generation.md)** for comprehensive native app development approach and detailed workflow architecture

## Contributing to Documentation

When adding new features or making schema changes:

1. Review existing documentation patterns in `/docs/`
2. Update relevant documentation sections to reflect your changes
3. Add new documentation files following the established structure
4. Ensure all code examples and type definitions are accurate

## Creating Sequence Diagrams

1.  Install `mermaid-cli`

        $ npm install -g mermaid-cli

2.  Create a new file with the `.mmd` extension.

3.  For generation of e.g. a PNG image:

        $ mmdc -i sequence_diagram.mmd -o sequence_diagram.png
