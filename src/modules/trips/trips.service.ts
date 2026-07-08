import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';

export interface TripFilters {
  status?: string;
  client_id?: number;
  driver_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function generateTripNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `TMS-${y}${m}${d}-${rand}`;
}

function buildWhereClause(tenant_id: string, filters: TripFilters): { text: string; params: any[] } {
  const conditions: string[] = ['t.tenant_id = $1'];
  const params: any[] = [tenant_id];
  let idx = 2;

  if (filters.status) {
    conditions.push(`t.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.client_id) {
    conditions.push(`t.client_id = $${idx++}`);
    params.push(filters.client_id);
  }
  if (filters.driver_id) {
    conditions.push(`t.driver_id = $${idx++}`);
    params.push(filters.driver_id);
  }
  if (filters.date_from) {
    conditions.push(`t.departure_at >= $${idx++}`);
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push(`t.departure_at <= $${idx++}`);
    params.push(filters.date_to);
  }
  if (filters.search) {
    conditions.push(`t.trip_number ILIKE $${idx++}`);
    params.push(`%${filters.search}%`);
  }

  return { text: conditions.join(' AND '), params };
}

export async function findAll(tenant_id: string, filters: TripFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  const offset = (page - 1) * limit;

  const { text: where, params } = buildWhereClause(tenant_id, filters);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM trips t WHERE ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT t.*, tr.plate AS truck_license_plate, tr.brand AS truck_brand,
            d.name AS driver_name, d.phone AS driver_phone,
            c.name AS client_name
     FROM trips t
     LEFT JOIN trucks tr ON tr.id = t.truck_id AND tr.tenant_id = $1
     LEFT JOIN drivers d ON d.id = t.driver_id AND d.tenant_id = $1
     LEFT JOIN clients c ON c.id = t.client_id AND c.tenant_id = $1
     WHERE ${where}
     ORDER BY t.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function findById(tenant_id: string, id: number) {
  const result = await pool.query(
    `SELECT t.*, tr.plate AS truck_license_plate, tr.brand AS truck_brand,
            tr.model AS truck_model,
            d.name AS driver_name, d.phone AS driver_phone,
            d.email AS driver_email, d.license_number AS driver_license,
            c.name AS client_name, c.rut AS client_tax_id
     FROM trips t
     LEFT JOIN trucks tr ON tr.id = t.truck_id AND tr.tenant_id = $1
     LEFT JOIN drivers d ON d.id = t.driver_id AND d.tenant_id = $1
     LEFT JOIN clients c ON c.id = t.client_id AND c.tenant_id = $1
     WHERE t.id = $2 AND t.tenant_id = $1`,
    [tenant_id, id],
  );

  if (!result.rows.length) {
    throw new NotFoundError(`Trip with id ${id} not found`);
  }

  return result.rows[0];
}

export async function create(tenant_id: string, data: any) {
  const tripNumber = data.trip_number || generateTripNumber();

  const result = await pool.query(
    `INSERT INTO trips (
       trip_number, client_id, truck_id, driver_id,
       origin_city, origin_country, destination_city, destination_country,
       route, cargo_description, cargo_weight_kg, cargo_value,
       status, departure_at, estimated_arrival_at, actual_arrival_at,
       distance_km, fuel_consumed, cost, billing_status, documents, notes,
       tenant_id, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW(),NOW())
     RETURNING *`,
    [
      tripNumber, data.client_id, data.truck_id ?? null, data.driver_id ?? null,
      data.origin_city, data.origin_country, data.destination_city, data.destination_country,
      data.route ? JSON.stringify(data.route) : null, data.cargo_description ?? null,
      data.cargo_weight_kg ?? null, data.cargo_value ?? null,
      data.status ?? 'pending', data.departure_at ?? null, data.estimated_arrival_at ?? null,
      data.actual_arrival_at ?? null, data.distance_km ?? null, data.fuel_consumed ?? null,
      data.cost ?? null, data.billing_status ?? 'pending',
      data.documents ? JSON.stringify(data.documents) : null, data.notes ?? null,
      tenant_id,
    ],
  );

  return result.rows[0];
}

export async function update(tenant_id: string, id: number, data: any) {
  const fields: string[] = [];
  const params: any[] = [];
  let idx = 1;

  const allowed = [
    'truck_id', 'driver_id', 'origin_city', 'origin_country',
    'destination_city', 'destination_country', 'route', 'cargo_description',
    'cargo_weight_kg', 'cargo_value', 'status', 'departure_at',
    'estimated_arrival_at', 'actual_arrival_at', 'distance_km',
    'fuel_consumed', 'cost', 'billing_status', 'documents', 'notes',
  ];

  for (const field of allowed) {
    if (data[field] !== undefined) {
      const val = field === 'route' || field === 'documents'
        ? JSON.stringify(data[field])
        : data[field];
      fields.push(`${field} = $${idx++}`);
      params.push(val);
    }
  }

  if (!fields.length) {
    return findById(tenant_id, id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(tenant_id, id);

  const result = await pool.query(
    `UPDATE trips SET ${fields.join(', ')} WHERE tenant_id = $${idx} AND id = $${idx + 1} RETURNING *`,
    params,
  );

  if (!result.rows.length) {
    throw new NotFoundError(`Trip with id ${id} not found`);
  }

  return result.rows[0];
}

export async function remove(tenant_id: string, id: number) {
  const result = await pool.query(
    'DELETE FROM trips WHERE tenant_id = $1 AND id = $2 RETURNING id',
    [tenant_id, id],
  );

  if (!result.rows.length) {
    throw new NotFoundError(`Trip with id ${id} not found`);
  }
}

export async function updateStatus(tenant_id: string, id: number, status: string) {
  const previous = await findById(tenant_id, id);

  const result = await pool.query(
    `UPDATE trips SET status = $1, updated_at = NOW() WHERE tenant_id = $2 AND id = $3 RETURNING *`,
    [status, tenant_id, id],
  );

  if (!result.rows.length) {
    throw new NotFoundError(`Trip with id ${id} not found`);
  }

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, tenant_id, created_at)
     VALUES (NULL, 'update_status', 'trip', $1, $2, $3, $4, NOW())`,
    [id, JSON.stringify({ status: previous.status }), JSON.stringify({ status }), tenant_id],
  );

  return result.rows[0];
}

export async function getTripPositions(tenant_id: string, tripId: number) {
  const trip = await findById(tenant_id, tripId);

  if (!trip.truck_id) {
    return [];
  }

  const result = await pool.query(
    `SELECT gps.lat, gps.lng, gps.altitude, gps.speed, gps.heading, gps.timestamp
     FROM gps_positions gps
     WHERE gps.device_id = (SELECT gps_device_id FROM trucks WHERE id = $1 AND tenant_id = $2)
       AND gps.timestamp >= $3
       AND gps.timestamp <= COALESCE($4, NOW())
     ORDER BY gps.timestamp ASC`,
    [
      trip.truck_id,
      tenant_id,
      trip.departure_at || trip.created_at,
      trip.actual_arrival_at,
    ],
  );

  return result.rows;
}

export async function getStats(tenant_id: string) {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS planned,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
       COUNT(*) FILTER (WHERE status = 'delayed')::int AS delayed,
       COALESCE(SUM(distance_km) FILTER (WHERE status = 'completed'), 0)::float AS avg_distance,
       COALESCE(AVG(
         EXTRACT(EPOCH FROM (actual_arrival_at - departure_at)) / 3600
       ) FILTER (WHERE status = 'completed' AND actual_arrival_at IS NOT NULL AND departure_at IS NOT NULL), 0)::float AS avg_duration
     FROM trips
     WHERE tenant_id = $1`,
    [tenant_id],
  );

  const row = result.rows[0];
  return {
    total: row.total,
    inProgress: row.in_progress,
    completed: row.completed,
    cancelled: row.cancelled,
    delayed: row.delayed,
    planned: row.planned,
    avgDuration: row.avg_duration,
    avgDistance: row.avg_distance,
  };
}
