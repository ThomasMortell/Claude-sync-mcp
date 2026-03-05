import pg from "pg";
import pgvector from "pgvector/pg";

const { Pool } = pg;

export function createPool(databaseUrl: string): pg.Pool {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on("connect", async (client) => {
    await pgvector.registerTypes(client);
  });

  pool.on("error", (err) => {
    console.error("Unexpected pool error:", err);
  });

  return pool;
}
