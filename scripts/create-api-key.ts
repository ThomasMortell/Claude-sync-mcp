import { randomBytes, createHash } from "node:crypto";
import dotenv from "dotenv";
import { createPool } from "../src/db/client.js";
import { ensureProject, insertApiKey } from "../src/db/queries.js";

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const projectIdx = args.indexOf("--project");
  const labelIdx = args.indexOf("--label");

  const projectName = projectIdx !== -1 ? args[projectIdx + 1] : "default";
  const label = labelIdx !== -1 ? args[labelIdx + 1] : "default";

  if (!projectName) {
    console.error("Usage: npm run create-key -- --project <name> [--label <label>]");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const pool = createPool(databaseUrl);

  try {
    // Ensure project exists
    const projectId = await ensureProject(pool, projectName);

    // Generate random API key
    const rawKey = randomBytes(32).toString("hex");
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    // Store hashed key
    await insertApiKey(pool, projectId, keyHash, label);

    console.log("\n=== API Key Created ===");
    console.log(`Project:  ${projectName}`);
    console.log(`Label:    ${label}`);
    console.log(`API Key:  ${rawKey}`);
    console.log("\nSave this key now — it cannot be retrieved later.");
    console.log("\nAdd to your Claude Code settings.json:");
    console.log(JSON.stringify({
      mcpServers: {
        "claude-sync": {
          type: "streamable-http",
          url: "http://localhost:3001/mcp",
          headers: {
            Authorization: `Bearer ${rawKey}`,
          },
        },
      },
    }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
