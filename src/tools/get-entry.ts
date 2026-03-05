import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type pg from "pg";
import { getEntryById } from "../db/queries.js";

export function registerGetEntry(
  server: McpServer,
  pool: pg.Pool,
  projectId: string
): void {
  server.tool(
    "get_entry",
    "Get the full details of a specific context entry by its ID",
    {
      id: z.string().uuid().describe("Entry UUID"),
    },
    async (args) => {
      const entry = await getEntryById(pool, projectId, args.id);

      if (!entry) {
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
            text: JSON.stringify(entry),
          },
        ],
      };
    }
  );
}
