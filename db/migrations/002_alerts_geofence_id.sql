-- Add geofence_id column to alerts table for geofence enter/exit alerts
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS geofence_id INTEGER REFERENCES geofences(id) ON DELETE SET NULL;

-- Ensure truck_geofence_states table exists (used by geofence-detection job)
CREATE TABLE IF NOT EXISTS truck_geofence_states (
    truck_id INTEGER NOT NULL,
    geofence_id INTEGER NOT NULL,
    inside BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (truck_id, geofence_id)
);
