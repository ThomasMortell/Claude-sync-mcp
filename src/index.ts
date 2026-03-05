import "dotenv/config";
import { loadConfig } from "./config.js";
import { createPool } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { createEmbeddingProvider } from "./embeddings/provider.js";
import { createApp } from "./transport.js";

async function main() {
  console.log("claude-sync: Starting...");

  // Load config
  const config = loadConfig();

  // Create database pool
  const pool = createPool(config.databaseUrl);

  // Run migrations
  console.log("Running database migrations...");
  await runMigrations(pool);
  console.log("Migrations complete.");

  // Create embedding provider (downloads model on first run)
  const embeddings = await createEmbeddingProvider(config);
  console.log(`Embedding model: ${config.embeddingModel} (${config.embeddingDimensions} dimensions)`);

  // Create Express app
  const app = await createApp(pool, embeddings, config);

  // Start server
  const server = app.listen(config.port, () => {
    console.log(`claude-sync: Listening on port ${config.port}`);
    console.log(`MCP endpoint: http://localhost:${config.port}/mcp`);
    console.log(`Health check: http://localhost:${config.port}/health`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nclaude-sync: Shutting down...");
    server.close();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start claude-sync:", err);
  process.exit(1);
});
