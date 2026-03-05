import express from "express";
import type pg from "pg";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Config } from "./config.js";
import type { EmbeddingProvider } from "./embeddings/provider.js";
import { createAuthMiddleware } from "./auth/middleware.js";
import { createServer } from "./server.js";
import { ensureProject } from "./db/queries.js";

export async function createApp(
  pool: pg.Pool,
  embeddings: EmbeddingProvider,
  config: Config
): Promise<express.Express> {
  const app = express();

  // Parse JSON bodies
  app.use(express.json());

  // Auth middleware
  app.use(createAuthMiddleware(pool, config));

  // Ensure default project exists for single-key mode
  let defaultProjectId: string | null = null;
  if (config.apiKeyHash) {
    defaultProjectId = await ensureProject(pool, config.defaultProject);
  }

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.0" });
  });

  // MCP endpoint - stateless mode (new server per request)
  app.post("/mcp", async (req, res) => {
    const projectId = req.projectId ?? defaultProjectId;
    if (!projectId) {
      res.status(400).json({ error: "No project associated with this key" });
      return;
    }

    const server = createServer(pool, embeddings, projectId);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Handle GET requests for SSE streams (required by MCP spec)
  app.get("/mcp", async (req, res) => {
    const projectId = req.projectId ?? defaultProjectId;
    if (!projectId) {
      res.status(400).json({ error: "No project associated with this key" });
      return;
    }

    const server = createServer(pool, embeddings, projectId);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  // Handle DELETE for session termination (required by MCP spec)
  app.delete("/mcp", async (_req, res) => {
    // Stateless mode - no sessions to terminate
    res.status(200).json({ message: "No session to terminate (stateless mode)" });
  });

  return app;
}
