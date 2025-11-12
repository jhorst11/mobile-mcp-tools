# @salesforce/mcp-magi

MCP Server for Magi PRD Generation Workflow Tools

## Overview

This package provides a standalone MCP (Model Context Protocol) server that exposes the Magi PRD generation workflow tools. It registers all tools from the `@salesforce/workflow-magi` package and makes them available via stdio transport.

## Usage

### As a Binary

After building the package, you can run it as a binary:

```bash
npm run build
node dist/index.js
```

Or use the binary name:

```bash
npx mcp-magi
```

### As a Library

You can also import and use the server programmatically:

```typescript
import server from '@salesforce/mcp-magi';

// Server is already configured with all Magi tools registered
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm run test
```

### Lint

```bash
npm run lint
```

## Tools

This server registers all tools from `@salesforce/workflow-magi`, including:

- PRD Generation Orchestrator
- Feature Brief Generation, Update, Review, and Finalization tools
- Initial Requirements, Gap Requirements, Requirements Review, and Requirements Update tools
- Gap Analysis tool
- PRD Generation, Review, Update, and Finalization tools
- PRD Failure tool

See the `@salesforce/workflow-magi` package documentation for details on each tool.
