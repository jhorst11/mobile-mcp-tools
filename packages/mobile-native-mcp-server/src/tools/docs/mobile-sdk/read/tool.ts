import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import fs from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

export async function registerMobileSdkReadTool(server: McpServer) {
  const contentBasePath = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');

  const inputSchema = z.object({
    file_path: z
      .string()
      .describe(
        'The file path relative to the content directory (e.g., "en-us/mobile-sdk/guides/analytics-intro.md")'
      ),
  });

  const outputSchema = z.object({
    content: z.string(),
    file_path: z.string(),
  });

  server.registerTool(
    'magen-mobilesdk-read',
    {
      title: 'Mobile SDK Read Tool',
      description: 'Read the full content of a Mobile SDK documentation file',
      inputSchema: inputSchema.shape,
      outputSchema: outputSchema.shape,
    },
    async ({ file_path }) => {
      // Resolve the file path relative to the content directory
      const fullPath = resolve(contentBasePath, file_path);

      // Security check: ensure the resolved path is within the content directory
      const resolvedBasePath = resolve(contentBasePath);
      if (!fullPath.startsWith(resolvedBasePath)) {
        throw new Error(`Invalid file path: ${file_path} - path traversal detected`);
      }

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${file_path}`);
      }

      // Read the file content
      const content = fs.readFileSync(fullPath, 'utf-8');

      const result = {
        content,
        file_path,
      };

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
        structuredContent: result,
      };
    }
  );
}
