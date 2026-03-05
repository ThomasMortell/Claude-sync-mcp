import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type pg from "pg";
import type { EmbeddingProvider } from "./embeddings/provider.js";
import { registerPushContext } from "./tools/push-context.js";
import { registerSearchContext } from "./tools/search-context.js";
import { registerListRecent } from "./tools/list-recent.js";
import { registerGetEntry } from "./tools/get-entry.js";
import { registerDeleteEntry } from "./tools/delete-entry.js";
import { registerListMachines } from "./tools/list-machines.js";

export function createServer(
  pool: pg.Pool,
  embeddings: EmbeddingProvider,
  projectId: string
): McpServer {
  const server = new McpServer({
    name: "claude-sync",
    version: "1.0.0",
  });

  registerPushContext(server, pool, embeddings, projectId);
  registerSearchContext(server, pool, embeddings, projectId);
  registerListRecent(server, pool, projectId);
  registerGetEntry(server, pool, projectId);
  registerDeleteEntry(server, pool, projectId);
  registerListMachines(server, pool, projectId);

  return server;
}
