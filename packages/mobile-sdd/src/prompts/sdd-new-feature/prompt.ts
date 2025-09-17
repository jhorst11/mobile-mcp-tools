import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Prompt } from '../prompt.js';

export const SddNewFeaturePrompt: Prompt = {
  register(server: McpServer) {
    server.registerPrompt(
      'new-feature',
      {
        title: 'Build New Feature',
        description: 'Build the requirements and tasks for a new feature',
        argsSchema: {
          id: z
            .string()
            .describe(
              'The id for a new feature in the format NNN-kebab-case (i.e. 001-feature-name)'
            ),
          featureDescription: z
            .string()
            .describe(
              'The description for a new feature. The more details the better, you will be prompted to provide more details if needed.'
            ),
        },
      },
      ({ id }) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Check if the .magen directory exists at the project root (this may be a hidden directory), if it does invoke the sfmobile-sdd-build-feature tool with the following arguments: featureid ${id}. Once the feature is scaffolded follow the provided instructions to build out the PRD.`,
            },
          },
        ],
      })
    );
  },
};
