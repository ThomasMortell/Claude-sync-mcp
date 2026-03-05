import type pg from "pg";
import pgvector from "pgvector";

export interface EntryRow {
  id: string;
  project_id: string;
  title: string | null;
  content: string;
  entry_type: string;
  tags: string[];
  machine_id: string;
  session_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EntryWithSimilarity extends EntryRow {
  similarity: number;
}

export interface MachineStats {
  machine_id: string;
  entry_count: number;
  last_active: Date;
  entry_types: Record<string, number>;
}

export async function ensureProject(
  pool: pg.Pool,
  projectName: string
): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO projects (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [projectName]
  );
  return rows[0].id;
}

export async function insertEntry(
  pool: pg.Pool,
  params: {
    projectId: string;
    title: string | null;
    content: string;
    entryType: string;
    tags: string[];
    machineId: string;
    sessionId: string | null;
    embedding: number[];
  }
): Promise<EntryRow> {
  const { rows } = await pool.query(
    `INSERT INTO entries (project_id, title, content, entry_type, tags, machine_id, session_id, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, project_id, title, content, entry_type, tags, machine_id, session_id, created_at, updated_at`,
    [
      params.projectId,
      params.title,
      params.content,
      params.entryType,
      params.tags,
      params.machineId,
      params.sessionId,
      pgvector.toSql(params.embedding),
    ]
  );
  return rows[0];
}

export async function searchByVector(
  pool: pg.Pool,
  params: {
    projectId: string;
    embedding: number[];
    entryType?: string;
    machineId?: string;
    tags?: string[];
    similarityThreshold: number;
    limit: number;
  }
): Promise<EntryWithSimilarity[]> {
  const { rows } = await pool.query(
    `SELECT id, project_id, title, content, entry_type, tags, machine_id, session_id, created_at, updated_at,
            1 - (embedding <=> $1) AS similarity
     FROM entries
     WHERE project_id = $2
       AND deleted_at IS NULL
       AND embedding IS NOT NULL
       AND ($3::text IS NULL OR entry_type = $3)
       AND ($4::text IS NULL OR machine_id = $4)
       AND ($5::text[] IS NULL OR tags @> $5)
       AND 1 - (embedding <=> $1) >= $6
     ORDER BY embedding <=> $1
     LIMIT $7`,
    [
      pgvector.toSql(params.embedding),
      params.projectId,
      params.entryType ?? null,
      params.machineId ?? null,
      params.tags ?? null,
      params.similarityThreshold,
      params.limit,
    ]
  );
  return rows;
}

export async function getRecentEntries(
  pool: pg.Pool,
  params: {
    projectId: string;
    machineId?: string;
    entryType?: string;
    limit: number;
    offset: number;
  }
): Promise<EntryRow[]> {
  const { rows } = await pool.query(
    `SELECT id, project_id, title, content, entry_type, tags, machine_id, session_id, created_at, updated_at
     FROM entries
     WHERE project_id = $1
       AND deleted_at IS NULL
       AND ($2::text IS NULL OR machine_id = $2)
       AND ($3::text IS NULL OR entry_type = $3)
     ORDER BY created_at DESC
     LIMIT $4 OFFSET $5`,
    [
      params.projectId,
      params.machineId ?? null,
      params.entryType ?? null,
      params.limit,
      params.offset,
    ]
  );
  return rows;
}

export async function getEntryById(
  pool: pg.Pool,
  projectId: string,
  entryId: string
): Promise<EntryRow | null> {
  const { rows } = await pool.query(
    `SELECT id, project_id, title, content, entry_type, tags, machine_id, session_id, created_at, updated_at
     FROM entries
     WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL`,
    [entryId, projectId]
  );
  return rows[0] ?? null;
}

export async function softDeleteEntry(
  pool: pg.Pool,
  projectId: string,
  entryId: string
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE entries SET deleted_at = NOW() WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL`,
    [entryId, projectId]
  );
  return (rowCount ?? 0) > 0;
}

export async function getMachineStats(
  pool: pg.Pool,
  projectId: string
): Promise<MachineStats[]> {
  const { rows } = await pool.query(
    `SELECT
       machine_id,
       COUNT(*)::int AS entry_count,
       MAX(created_at) AS last_active,
       jsonb_object_agg(entry_type, type_count) AS entry_types
     FROM (
       SELECT machine_id, entry_type, COUNT(*)::int AS type_count
       FROM entries
       WHERE project_id = $1 AND deleted_at IS NULL
       GROUP BY machine_id, entry_type
     ) sub
     GROUP BY machine_id
     ORDER BY last_active DESC`,
    [projectId]
  );
  return rows;
}

export async function validateApiKey(
  pool: pg.Pool,
  keyHash: string
): Promise<{ projectId: string } | null> {
  const { rows } = await pool.query(
    `SELECT project_id FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL`,
    [keyHash]
  );
  if (rows.length === 0) return null;

  // Update last_used_at (fire and forget)
  pool
    .query("UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1", [
      keyHash,
    ])
    .catch(() => {});

  return { projectId: rows[0].project_id };
}

export async function insertApiKey(
  pool: pg.Pool,
  projectId: string,
  keyHash: string,
  label: string
): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO api_keys (project_id, key_hash, label) VALUES ($1, $2, $3) RETURNING id`,
    [projectId, keyHash, label]
  );
  return rows[0].id;
}
