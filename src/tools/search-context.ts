import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type pg from "pg";
import type { EmbeddingProvider } from "../embeddings/provider.js";
import { searchByVector } from "../db/queries.js";

const ENTRY_TYPES = [
  "context",
  "decision",
  "discovery",
  "bugfix",
  "pattern",
  "architecture",
  "gotcha",
  "trade-off",
] as const;

export function registerSearchContext(
  server: McpServer,
  pool: pg.Pool,
  embeddings: EmbeddingProvider,
  projectId: string
): void {
  server.tool(
    "search_context",
    "Semantic search across all shared context entries. Use natural language queries to find relevant decisions, patterns, and knowledge from any connected machine.",
    {
      query: z.string().min(1).describe("Natural language search query"),
      entry_type: z
        .enum(ENTRY_TYPES)
        .optional()
        .describe("Filter by entry type"),
      machine_id: z
        .string()
        .optional()
        .describe("Filter to entries from a specific machine"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Filter to entries containing ALL of these tags"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(10)
        .describe("Maximum results to return"),
      similarity_threshold: z
        .number()
        .min(0)
        .max(1)
        .default(0.3)
        .describe("Minimum cosine similarity score (0-1)"),
    },
    async (args) => {
      const queryEmbedding = await embeddings.embed(args.query);

      const results = await searchByVector(pool, {
        projectId,
        embedding: queryEmbedding,
        entryType: args.entry_type,
        machineId: args.machine_id,
        tags: args.tags,
        similarityThreshold: args.similarity_threshold,
        limit: args.limit,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              results: results.map((r) => ({
                id: r.id,
                title: r.title,
                content: r.content,
                entry_type: r.entry_type,
                tags: r.tags,
                machine_id: r.machine_id,
                similarity: Math.round(r.similarity * 1000) / 1000,
                created_at: r.created_at,
              })),
              total: results.length,
            }),
          },
        ],
      };
    }
  );
}
