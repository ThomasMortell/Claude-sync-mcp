# claude-sync

Cross-machine context sharing MCP server for Claude Code. Share decisions, patterns, and knowledge across multiple Claude Code instances running on different machines.

## What it does

When you use Claude Code on multiple machines (backend server, frontend laptop, ideas tablet), each instance is isolated. claude-sync gives them a shared memory — push a decision on one machine, search for it on another.

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/claude-sync.git
cd claude-sync
cp .env.example .env
```

Edit `.env` and set:
- `API_KEY_HASH` — see below for generating

### 2. Generate an API key

```bash
# Generate a random key
KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "Your API key: $KEY"

# Hash it for .env
HASH=$(echo -n "$KEY" | shasum -a 256 | cut -d' ' -f1)
echo "API_KEY_HASH=$HASH"
```

Add the hash to your `.env` file.

### 3. Start with Docker Compose

```bash
docker compose up -d
```

The server will be available at `http://localhost:3001`.

### 4. Connect Claude Code

Add to your `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "claude-sync": {
      "type": "streamable-http",
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

For remote access (e.g., deployed on Railway), replace `localhost:3001` with your server URL.

## Deploy on Railway

1. Fork this repo
2. Create a new project on [Railway](https://railway.com)
3. Add a PostgreSQL database (select the pgvector template)
4. Add a new service from your forked repo
5. Set environment variables: `API_KEY_HASH`, `DATABASE_URL` (auto-set by Railway)
6. Deploy

## MCP Tools

| Tool | Description |
|------|------------|
| `push_context` | Store a new context entry (decision, discovery, pattern, etc.) |
| `search_context` | Semantic search across all shared entries |
| `list_recent` | List recent entries, optionally filtered by machine or type |
| `get_entry` | Get full details of a specific entry |
| `delete_entry` | Soft-delete an entry |
| `list_machines` | See which machines have contributed and their activity |

### Entry Types

- `context` — general context
- `decision` — architectural or design decisions
- `discovery` — learning about existing systems
- `bugfix` — something broken, now fixed
- `pattern` — reusable approaches
- `architecture` — structural decisions
- `gotcha` — traps and edge cases
- `trade-off` — pros/cons analysis

## Multi-Key Mode (Teams)

For teams, use database-backed API keys instead of `API_KEY_HASH`:

1. Remove `API_KEY_HASH` from `.env`
2. Run migrations: `docker compose up -d`
3. Generate keys:

```bash
npm run create-key -- --project my-project --label "Alice's laptop"
npm run create-key -- --project my-project --label "Bob's desktop"
```

Each key is scoped to a project. Team members using the same project see shared context.

## Development

```bash
npm install
cp .env.example .env  # configure your env

# Start Postgres with pgvector
docker compose up db -d

# Run in development mode
npm run dev
```

## Architecture

- **TypeScript** + Express + MCP SDK
- **PostgreSQL** + pgvector for storage and vector similarity search
- **Local embeddings** via `all-MiniLM-L6-v2` (runs in-process, no external API calls)
- Stateless MCP transport — each request is independent
- Bearer token auth — single-key or multi-key modes

## License

MIT
