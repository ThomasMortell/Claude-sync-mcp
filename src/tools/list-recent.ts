import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type pg from "pg";
import { getRecentEntries } from "../db/queries.js";

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

export function registerListRecent(
  server: McpServer,
  pool: pg.Pool,
  projectId: string
): void {
  server.tool(
    "list_recent",
    "List recent context entries, optionally filtered by machine or type. Returns entries ordered by most recent first.",
    {
      machine_id: z
        .string()
        .optional()
        .describe("Filter to a specific machine"),
      entry_type: z.enum(ENTRY_TYPES).optional().describe("Filter by type"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe("Number of entries to return"),
      offset: z
        .number()
        .min(0)
        .default(0)
        .describe("Pagination offset"),
    },
    async (args) => {
      const entries = await getRecentEntries(pool, {
        projectId,
        machineId: args.machine_id,
        entryType: args.entry_type,
        limit: args.limit,
        offset: args.offset,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              entries: entries.map((e) => ({
                id: e.id,
                title: e.title,
                content: e.content,
                entry_type: e.entry_type,
                tags: e.tags,
                machine_id: e.machine_id,
                created_at: e.created_at,
              })),
              total: entries.length,
              offset: args.offset,
            }),
          },
        ],
      };
    }
  );
}
