import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Prompt } from '../prompt.js';

export const SddUpdateInstructionsPrompt: Prompt = {
  register(server: McpServer) {
    server.registerPrompt(
      'update-instructions',
      {
        title: 'Update SDD Instructions',
        description: 'Update the Salesforce Spec Driven Development instructions',
      },
      () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Check if the magi-sdd directory exists at the project root (this may be a hidden directory), if it does invoke the magi-update-instructions tool.`,
            },
          },
        ],
      })
    );
  },
};
