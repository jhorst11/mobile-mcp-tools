import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Prompt } from '../prompt.js';

export const SddInitPrompt: Prompt = {
  register(server: McpServer) {
    server.registerPrompt(
      'sdd-init',
      {
        title: 'Initalize SDD',
        description: 'Initialize the Salesforce Spec Driven Development toolkit',
      },
      () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Check if the magi-sdd directory exists at the project root, if it does there is no need to initialize the SDD toolkit, otherwise invoke the sfmobile-sdd-init tool`,
            },
          },
        ],
      })
    );
  },
};
