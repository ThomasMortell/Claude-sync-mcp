import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type pg from "pg";
import { getMachineStats } from "../db/queries.js";

export function registerListMachines(
  server: McpServer,
  pool: pg.Pool,
  projectId: string
): void {
  server.tool(
    "list_machines",
    "List all machines that have contributed context entries, with their entry counts and last activity timestamps",
    {},
    async () => {
      const machines = await getMachineStats(pool, projectId);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ machines }),
          },
        ],
      };
    }
  );
}
