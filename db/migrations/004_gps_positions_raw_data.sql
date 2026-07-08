-- Add raw_data JSONB column to gps_positions for provider-specific payloads
ALTER TABLE gps_positions ADD COLUMN IF NOT EXISTS raw_data JSONB;
