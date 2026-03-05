-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (384 dims = all-MiniLM-L6-v2 output)
ALTER TABLE entries ADD COLUMN embedding vector(384);

-- HNSW index for cosine similarity search
CREATE INDEX idx_entries_embedding ON entries
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 100)
    WHERE deleted_at IS NULL;
