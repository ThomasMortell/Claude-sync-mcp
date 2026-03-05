import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type pg from "pg";
import type { EmbeddingProvider } from "../embeddings/provider.js";
import { insertEntry } from "../db/queries.js";

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

export function registerPushContext(
  server: McpServer,
  pool: pg.Pool,
  embeddings: EmbeddingProvider,
  projectId: string
): void {
  server.tool(
    "push_context",
    "Store a new context entry (decision, discovery, pattern, etc.) that will be shared across all connected Claude Code instances",
    {
      content: z
        .string()
        .min(1)
        .describe("The context, decision, or knowledge to store"),
      entry_type: z
        .enum(ENTRY_TYPES)
        .default("context")
        .describe("Classification of this entry"),
      title: z.string().optional().describe("Optional short title"),
      tags: z
        .array(z.string())
        .default([])
        .describe("Freeform tags for categorization"),
      machine_id: z
        .string()
        .min(1)
        .describe("Identifier for the source machine (e.g. hostname)"),
      session_id: z
        .string()
        .optional()
        .describe("Claude Code session ID if available"),
    },
    async (args) => {
      const textToEmbed = args.title
        ? `${args.title}\n\n${args.content}`
        : args.content;

      const embedding = await embeddings.embed(textToEmbed);

      const entry = await insertEntry(pool, {
        projectId,
        title: args.title ?? null,
        content: args.content,
        entryType: args.entry_type,
        tags: args.tags,
        machineId: args.machine_id,
        sessionId: args.session_id ?? null,
        embedding,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              id: entry.id,
              created_at: entry.created_at,
              message: "Context stored successfully",
            }),
          },
        ],
      };
    }
  );
}
