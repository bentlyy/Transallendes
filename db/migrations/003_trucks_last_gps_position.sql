-- Add last_gps_position JSONB column to trucks for caching the latest GPS snapshot
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS last_gps_position JSONB;
