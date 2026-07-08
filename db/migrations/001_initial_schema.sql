-- Create migrations tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- Register this migration
INSERT INTO _migrations (name) VALUES ('001_initial_schema') ON CONFLICT (name) DO NOTHING;
