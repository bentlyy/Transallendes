-- Add billing (invoices) and reports tables, and invoice_id column on trips

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

ALTER TABLE trips ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES billing(id) ON DELETE SET NULL;
