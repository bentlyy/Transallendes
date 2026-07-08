-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. tenants
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    locale TEXT DEFAULT 'es',
    timezone TEXT DEFAULT 'America/Santiago',
    config JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT,
    password TEXT,
    name TEXT,
    role TEXT CHECK (role IN ('superadmin', 'admin', 'client_admin', 'client_viewer', 'driver', 'user')),
    phone TEXT,
    active BOOLEAN DEFAULT true,
    password_changed BOOLEAN DEFAULT false,
    totp_secret TEXT,
    totp_enabled BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    token_version INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email ON users (tenant_id, email);

-- 3. drivers
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    license_type TEXT,
    license_expiry DATE,
    license_number TEXT,
    documents JSONB DEFAULT '[]',
    status TEXT CHECK (status IN ('available', 'on_trip', 'resting', 'inactive')),
    current_location_lat NUMERIC(10,7),
    current_location_lng NUMERIC(10,7),
    total_trips INTEGER DEFAULT 0,
    total_hours NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    UNIQUE(tenant_id, email)
);

-- 4. clients
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    rut TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    status TEXT CHECK (status IN ('active', 'inactive', 'suspended')),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    UNIQUE(tenant_id, email)
);

-- 5. trucks
CREATE TABLE IF NOT EXISTS trucks (
    id SERIAL PRIMARY KEY,
    plate TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    year INTEGER,
    capacity_kg NUMERIC(10,2),
    capacity_m3 NUMERIC(10,2),
    status TEXT CHECK (status IN ('active', 'in_maintenance', 'out_of_service', 'retired')),
    driver_id INTEGER REFERENCES drivers(id),
    client_id INTEGER REFERENCES clients(id),
    gps_device_id TEXT,
    gps_provider TEXT,
    insurance_expiry DATE,
    technical_review_expiry DATE,
    permits JSONB DEFAULT '[]',
    last_gps_position JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    UNIQUE(tenant_id, plate)
);

-- 6. billing (must be created before trips due to FK reference)
CREATE TABLE IF NOT EXISTS billing (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    trip_ids JSONB DEFAULT '[]',
    total NUMERIC(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'CLP',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'overdue', 'cancelled')),
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billing_tenant ON billing (tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_client ON billing (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing (tenant_id, status);

-- 7. trips
CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    trip_number TEXT NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    truck_id INTEGER REFERENCES trucks(id),
    driver_id INTEGER REFERENCES drivers(id),
    origin_city TEXT,
    origin_country TEXT,
    destination_city TEXT,
    destination_country TEXT,
    route JSONB,
    cargo_description TEXT,
    cargo_weight_kg NUMERIC(10,2),
    cargo_value NUMERIC(12,2),
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'delayed')),
    departure_at TIMESTAMPTZ,
    estimated_arrival_at TIMESTAMPTZ,
    actual_arrival_at TIMESTAMPTZ,
    distance_km NUMERIC(10,2),
    fuel_consumed NUMERIC(10,2),
    cost NUMERIC(12,2),
    billing_status TEXT CHECK (billing_status IN ('pending', 'invoiced', 'paid', 'overdue')),
    invoice_id INTEGER REFERENCES billing(id) ON DELETE SET NULL,
    documents JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_trips_tenant_status ON trips (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_tenant_client ON trips (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_trips_tenant_dates ON trips (tenant_id, departure_at, estimated_arrival_at);

-- 8. gps_positions (partitioned by range on recorded_at)
CREATE TABLE IF NOT EXISTS gps_positions (
    id BIGSERIAL,
    truck_id INTEGER NOT NULL REFERENCES trucks(id),
    driver_id INTEGER REFERENCES drivers(id),
    trip_id INTEGER REFERENCES trips(id),
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    speed_kmh NUMERIC(6,2),
    direction INTEGER,
    ignition BOOLEAN,
    odometer_km NUMERIC(10,2),
    fuel_level NUMERIC(5,2),
    fuel_consumption NUMERIC(10,2),
    temperature NUMERIC(5,2),
    battery_level NUMERIC(5,2),
    external_power BOOLEAN,
    raw_data JSONB,
    recorded_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default'
) PARTITION BY RANGE (recorded_at);

-- Partitions from 2025-07 through 2026-12
CREATE TABLE IF NOT EXISTS gps_positions_2025_07 PARTITION OF gps_positions
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS gps_positions_2025_08 PARTITION OF gps_positions
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS gps_positions_2025_09 PARTITION OF gps_positions
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS gps_positions_2025_10 PARTITION OF gps_positions
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS gps_positions_2025_11 PARTITION OF gps_positions
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS gps_positions_2025_12 PARTITION OF gps_positions
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_01 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_02 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_03 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_04 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_05 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_06 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_07 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_08 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_09 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_10 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_11 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS gps_positions_2026_12 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE INDEX IF NOT EXISTS idx_gps_positions_truck_recorded ON gps_positions (truck_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_positions_tenant_recorded ON gps_positions (tenant_id, recorded_at DESC);

-- 9. geofences
CREATE TABLE IF NOT EXISTS geofences (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('circle', 'polygon', 'corridor')),
    center_lat NUMERIC(10,7),
    center_lng NUMERIC(10,7),
    radius_meters NUMERIC(10,2),
    polygon_points JSONB,
    country TEXT,
    city TEXT,
    is_border BOOLEAN DEFAULT false,
    color TEXT DEFAULT '#3b82f6',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- 10. alerts
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    truck_id INTEGER REFERENCES trucks(id),
    driver_id INTEGER REFERENCES drivers(id),
    trip_id INTEGER REFERENCES trips(id),
    client_id INTEGER REFERENCES clients(id),
    geofence_id INTEGER REFERENCES geofences(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    title TEXT NOT NULL,
    description TEXT,
    data JSONB,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_alerts_tenant_type_created ON alerts (tenant_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_resolved ON alerts (tenant_id, resolved) WHERE resolved = false;

-- 11. maintenance
CREATE TABLE IF NOT EXISTS maintenance (
    id SERIAL PRIMARY KEY,
    truck_id INTEGER NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('preventive', 'corrective', 'inspection', 'tire_change', 'oil_change', 'other')),
    description TEXT,
    scheduled_date DATE,
    completed_date DATE,
    odometer_at_km NUMERIC(10,2),
    cost NUMERIC(12,2),
    provider TEXT,
    status TEXT CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- 12. documents
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT,
    file_size INTEGER,
    expiry_date DATE,
    status TEXT CHECK (status IN ('active', 'expired', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_entity ON documents (tenant_id, entity_type, entity_id);

-- 13. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- 14. refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT false,
    token_version INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- 15. notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    type TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- 16. password_reset_tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT NOT NULL DEFAULT 'default'
);

-- 17. _migrations
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- 18. reports
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    format TEXT DEFAULT 'pdf',
    from_date TIMESTAMPTZ,
    to_date TIMESTAMPTZ,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    truck_id INTEGER REFERENCES trucks(id) ON DELETE SET NULL,
    filters JSONB DEFAULT '{}',
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports (tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports (tenant_id, created_at DESC);

-- Triggers for updated_at on tables that have updated_at column
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trucks_updated_at BEFORE UPDATE ON trucks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_geofences_updated_at BEFORE UPDATE ON geofences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Default tenant
INSERT INTO tenants (id, name, domain) VALUES ('transallendes', 'Transallendes', 'localhost') ON CONFLICT DO NOTHING;
