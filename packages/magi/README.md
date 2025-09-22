# Salesforce Magi MCP Server

This package provides Model Context Protocol (MCP) tools for Salesforce Magi a SDD (Software Design and Development) tool.

## Overview

Magi is a collection of tools to assist with mobile software design and development tasks. It leverages the Model Context Protocol to provide AI-assisted capabilities for mobile development workflows.

## Available Tools

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test
```

### Adding New Tools

To add a new tool to this package:

1. Create a new directory under `src/tools/` for your tool
2. Implement your tool following the `Tool` interface pattern
3. Register your tool in `src/index.ts`
4. Add tests for your tool in the `tests/` directory

## License

MIT
