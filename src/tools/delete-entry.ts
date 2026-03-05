import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type pg from "pg";
import { softDeleteEntry } from "../db/queries.js";

export function registerDeleteEntry(
  server: McpServer,
  pool: pg.Pool,
  projectId: string
): void {
  server.tool(
    "delete_entry",
    "Delete a context entry (soft delete). The entry will no longer appear in searches or listings.",
    {
      id: z.string().uuid().describe("Entry UUID to delete"),
    },
    async (args) => {
      const deleted = await softDeleteEntry(pool, projectId, args.id);

      if (!deleted) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Entry not found" }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ deleted: true, id: args.id }),
          },
        ],
      };
    }
  );
}
