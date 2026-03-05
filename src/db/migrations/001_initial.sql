-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Migration tracking
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API Keys (hashed, scoped to project)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL UNIQUE,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;

-- Context entries (core data)
CREATE TABLE entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Content
    title TEXT,
    content TEXT NOT NULL,

    -- Classification
    entry_type TEXT NOT NULL DEFAULT 'context',

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    machine_id TEXT NOT NULL,
    session_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX idx_entries_project ON entries(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_project_type ON entries(project_id, entry_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_project_machine ON entries(project_id, machine_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_project_created ON entries(project_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_tags ON entries USING GIN(tags) WHERE deleted_at IS NULL;
