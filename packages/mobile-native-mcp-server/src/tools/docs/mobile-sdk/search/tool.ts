import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import { EmbeddingSearch } from './loader.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export async function registerMobileSdkSearchTool(server: McpServer) {
  const embeddingsPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'embeddings',
    'embeddings.jsonl'
  );
  const searcher = new EmbeddingSearch(embeddingsPath);
  await searcher.load();

  const inputSchema = z.object({
    query: z.string(),
    top_k: z.number().optional().default(5),
  });

  const outputSchema = z.object({
    result: z.string(),
  });

  server.registerTool(
    'magen-mobilesdk-search',
    {
      title: 'Mobile SDK Search Tool',
      description: 'Search the Mobile SDK documentation',
      inputSchema: inputSchema.shape,
      outputSchema: outputSchema.shape,
    },
    async ({ query, top_k }) => {
      const results = await searcher.search(query, top_k);

      const resultData = {
        query,
        results: results.map(r => ({
          file_path: r.file_path,
          similarity: r.similarity,
          text: r.text,
          chunk_index: r.chunk_index,
        })),
      };

      const resultString = JSON.stringify(resultData, null, 2);

      // Build instructions for reading full files
      const instructions = `\n\n## Next Steps\n\nTo read the full content of any file from the search results, use the \`magen-mobilesdk-read\` tool with the \`file_path\` from the results above.\n\nExample:\n- To read the full content of "${results[0]?.file_path || 'a file'}", call:\n  \`magen-mobilesdk-read\` with \`file_path: "${results[0]?.file_path || 'en-us/mobile-sdk/guides/example.md'}"\`\n\nThe search results above show only relevant chunks. Use the read tool to get the complete documentation file.`;

      const fullOutput = resultString + instructions;

      return {
        content: [
          {
            type: 'text',
            text: fullOutput,
          },
        ],
        structuredContent: {
          result: fullOutput,
        },
      };
    }
  );
}
