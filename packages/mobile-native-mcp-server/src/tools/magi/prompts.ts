import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerMagiPrompts(server: McpServer) {
  server.registerPrompt(
    'magi-new-feature',
    {
      title: 'Magi New Feature',
      description: 'Define a new feature for your project',
      argsSchema: { description: z.string() },
    },
    ({ description }) => {
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `call magi mcp tool to initalize a new feature with ${description}`,
            },
          },
        ],
      };
    }
  );
}
