# Salesforce Mobile SDK MCP Server

An intelligent Model Context Provider (MCP) server that automates the complete Salesforce Mobile SDK development lifecycle, from environment setup to project deployment.

## Overview

This MCP server transforms the complex, manual process of Salesforce mobile development into a conversational, guided experience. Instead of requiring developers to master dozens of different tools and configuration files, they can engage with an AI-powered assistant that orchestrates the entire development workflow.

## Phase 1 & 2 Implementation

The current implementation includes **Phase 1: Foundation** and **Phase 2: Build & Deploy Pipeline** - providing a complete development lifecycle from environment setup to running applications on simulators:

### Available Tools

1. **`env-check-prerequisites`** - Environment Prerequisites Checker
   - Validates Node.js, npm, Git, Salesforce CLI, and platform-specific toolchains
   - Checks version requirements and provides actionable feedback
   - Platform-aware (macOS/Windows/Linux compatibility)

2. **`salesforce-login`** - Salesforce Authentication
   - Initiates web-based OAuth flow using `sf org login web`
   - Stores session information for subsequent operations
   - Supports custom instance URLs and org aliases

3. **`salesforce-provision-connected-app`** - Connected App Guidance
   - Provides step-by-step guidance for manually creating Connected Apps in Salesforce
   - Validates provided consumer keys, callback URLs, and login URLs
   - Supports production, sandbox, and custom domain login URLs
   - References official Salesforce documentation for detailed instructions

4. **`project-scaffold`** - Project Scaffolding Guidance
   - Provides step-by-step guidance for creating Mobile SDK projects
   - Shows exact CLI commands for `forceios`, `forcedroid`, or `forcereact`
   - Supports iOS (Swift), Android (Kotlin), and React Native platforms
   - Validates input parameters and generates platform-specific commands

5. **`project-configure-connection`** - Project Configuration
   - Automatically injects Connected App credentials into project configuration files
   - Platform-aware configuration (bootconfig.plist, bootconfig.xml, bootconfig.json)
   - Detects project type and configures appropriate files

## Installation

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Start the server
npm start
```

## Usage

### As an MCP Client

The server communicates over the Model Context Protocol and can be used with any MCP-compatible client:

```json
{
  "mcpServers": {
    "mobile-sdk": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "./packages/mobile-sdk"
    }
  }
}
```

### Example Workflow

1. **Check Prerequisites**

   ```json
   {
     "tool": "env-check-prerequisites"
   }
   ```

2. **Login to Salesforce**

   ```json
   {
     "tool": "salesforce-login",
     "arguments": {
       "instanceUrl": "https://mycompany.my.salesforce.com",
       "alias": "my-dev-org"
     }
   }
   ```

3. **Get Connected App Guidance and Validate Credentials**

   First, call the tool without parameters to get setup instructions:

   ```json
   {
     "tool": "salesforce-provision-connected-app"
   }
   ```

   Then, after manually creating the Connected App, provide the credentials:

   ```json
   {
     "tool": "salesforce-provision-connected-app",
     "arguments": {
       "consumerKey": "3MVG9...",
       "callbackUrl": "sfdc://success",
       "loginUrl": "https://test.salesforce.com"
     }
   }
   ```

   **Login URL Options:**
   - **Production/Developer orgs**: `https://login.salesforce.com` (default)
   - **Sandbox orgs**: `https://test.salesforce.com`
   - **Custom domains**: `https://mycompany.my.salesforce.com`
   - **Scratch orgs**: Use the specific URL provided with your scratch org

4. **Get Project Scaffolding Guidance**

   First, call without parameters to get general guidance:

   ```json
   {
     "tool": "project-scaffold"
   }
   ```

   Then, to get specific commands for your project:

   ```json
   {
     "tool": "project-scaffold",
     "arguments": {
       "platform": "ios",
       "appName": "MyMobileApp",
       "packageId": "com.company.mymobileapp",
       "organization": "My Company",
       "outputDir": "./projects"
     }
   }
   ```

5. **Configure Connection**
   ```json
   {
     "tool": "project-configure-connection",
     "arguments": {
       "projectPath": "./projects/MyMobileApp",
       "consumerKey": "3MVG9...",
       "callbackUrl": "sfdc://success"
     }
   }
   ```

## Prerequisites

### Required Tools

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git** >= 2.20.0
- **Salesforce CLI** >= 2.0.0
- **Java JDK** >= 11.0.0

### Platform-Specific Requirements

#### iOS Development (macOS only)

- **Xcode Command Line Tools**
- **forceios CLI**: `npm install -g forceios`

#### Android Development

- **Android SDK** (including ADB)
- **forcedroid CLI**: `npm install -g forcedroid`

#### React Native Development

- **forcereact CLI**: `npm install -g forcereact`
- Platform-specific requirements for iOS and/or Android

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Lint the code
npm run lint

# Format the code
npm run format
```

## Architecture

The server follows a modular architecture:

```
src/
├── tools/           # MCP tool implementations
│   ├── environment/ # Environment checking tools
│   ├── salesforce/  # Salesforce integration tools
│   └── project/     # Project management tools
├── schemas/         # Zod schemas for input/output validation
├── utils/           # Shared utilities
│   ├── commandRunner.ts  # Command execution utility
│   └── fileUtils.ts      # File system utilities
└── index.ts         # Main server entry point
```

### Tool Implementation Pattern

Each tool implements the `Tool` interface:

```typescript
interface Tool {
  readonly name: string;
  readonly description: string;
  readonly toolId: string;
  readonly inputSchema: ZodType<any>;
  readonly outputSchema?: ZodType<any>;
  register(server: McpServer, annotations: ToolAnnotations): void;
}
```

## Future Phases

### Phase 2: Build & Deploy Pipeline

- Automated compilation and deployment to simulators
- Cross-platform build orchestration
- Real-time build log streaming

### Phase 3: Quality Gate

- Unified testing across LWC, Apex, and end-to-end tests
- Offline data synchronization testing
- Automated quality reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
