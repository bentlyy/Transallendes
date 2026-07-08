import { query } from '../../shared/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import type { TruckStatus } from '../../types/index.js';

interface TruckFilters {
  status?: TruckStatus;
  client_id?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export const findAll = async (tenant_id: string, filters: TruckFilters = {}) => {
  const conditions: string[] = ['t.tenant_id = $1'];
  const params: unknown[] = [tenant_id];
  let idx = 2;

  if (filters.status) {
    conditions.push(`t.status = $${idx++}`);
    params.push(filters.status);
  }

  if (filters.client_id) {
    conditions.push(`t.client_id = $${idx++}`);
    params.push(filters.client_id);
  }

  if (filters.search) {
    conditions.push(`(t.plate ILIKE $${idx} OR t.brand ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM trucks t WHERE ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const dataResult = await query(
    `SELECT t.*, d.name AS driver_name, c.name AS client_name
     FROM trucks t
     LEFT JOIN drivers d ON d.id = t.driver_id AND d.tenant_id = t.tenant_id
     LEFT JOIN clients c ON c.id = t.client_id AND c.tenant_id = t.tenant_id
     WHERE ${where}
     ORDER BY t.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return {
    data: dataResult.rows,
    total,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const findById = async (tenant_id: string, id: number) => {
  const result = await query(
    `SELECT t.*, d.name AS driver_name, c.name AS client_name
     FROM trucks t
     LEFT JOIN drivers d ON d.id = t.driver_id AND d.tenant_id = t.tenant_id
     LEFT JOIN clients c ON c.id = t.client_id AND c.tenant_id = t.tenant_id
     WHERE t.id = $1 AND t.tenant_id = $2`,
    [id, tenant_id]
  );
  if (result.rows.length === 0) throw new NotFoundError('Truck not found');
  return result.rows[0];
};

export const create = async (tenant_id: string, data: Record<string, unknown>) => {
  const columns: string[] = ['tenant_id'];
  const values: unknown[] = [tenant_id];
  const placeholders: string[] = ['$1'];
  let idx = 2;

  const allowed = ['plate', 'brand', 'model', 'year', 'capacity_kg', 'capacity_m3', 'status', 'driver_id', 'client_id', 'gps_device_id', 'gps_provider', 'insurance_expiry', 'technical_review_expiry', 'permits', 'notes'];

  for (const field of allowed) {
    if (data[field] !== undefined) {
      columns.push(field);
      values.push(data[field]);
      placeholders.push(`$${idx++}`);
    }
  }

  const result = await query(
    `INSERT INTO trucks (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );
  return result.rows[0];
};

export const update = async (tenant_id: string, id: number, data: Record<string, unknown>) => {
  const existing = await query('SELECT id FROM trucks WHERE id = $1 AND tenant_id = $2', [id, tenant_id]);
  if (existing.rows.length === 0) throw new NotFoundError('Truck not found');

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = ['plate', 'brand', 'model', 'year', 'capacity_kg', 'capacity_m3', 'status', 'driver_id', 'client_id', 'gps_device_id', 'gps_provider', 'insurance_expiry', 'technical_review_expiry', 'permits', 'notes'];

  for (const field of allowed) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${idx++}`);
      values.push(data[field]);
    }
  }

  if (sets.length === 0) return existing.rows[0];

  values.push(id, tenant_id);
  const result = await query(
    `UPDATE trucks SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
    values
  );
  return result.rows[0];
};

export const remove = async (tenant_id: string, id: number) => {
  const result = await query('DELETE FROM trucks WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenant_id]);
  if (result.rows.length === 0) throw new NotFoundError('Truck not found');
};

export const getLastPosition = async (tenant_id: string, truckId: number) => {
  const truck = await query('SELECT id FROM trucks WHERE id = $1 AND tenant_id = $2', [truckId, tenant_id]);
  if (truck.rows.length === 0) throw new NotFoundError('Truck not found');

  const result = await query(
    `SELECT * FROM gps_positions WHERE truck_id = $1 AND tenant_id = $2 ORDER BY recorded_at DESC LIMIT 1`,
    [truckId, tenant_id]
  );
  return result.rows[0] || null;
};

export const getPositionHistory = async (tenant_id: string, truckId: number, from?: string, to?: string) => {
  const truck = await query('SELECT id FROM trucks WHERE id = $1 AND tenant_id = $2', [truckId, tenant_id]);
  if (truck.rows.length === 0) throw new NotFoundError('Truck not found');

  const conditions: string[] = ['truck_id = $1', 'tenant_id = $2'];
  const params: unknown[] = [truckId, tenant_id];
  let idx = 3;

  if (from) {
    conditions.push(`recorded_at >= $${idx++}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`recorded_at <= $${idx++}`);
    params.push(to);
  }

  const result = await query(
    `SELECT * FROM gps_positions WHERE ${conditions.join(' AND ')} ORDER BY recorded_at DESC LIMIT 1000`,
    params
  );
  return result.rows;
};

export const getStats = async (tenant_id: string) => {
  const result = await query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'active' AND last_gps_position IS NOT NULL AND (last_gps_position->>'speed')::numeric > 0)::int AS moving,
       COUNT(*) FILTER (WHERE status = 'active' AND last_gps_position IS NOT NULL AND (last_gps_position->>'speed')::numeric = 0)::int AS stopped,
       COUNT(*) FILTER (WHERE status = 'active' AND last_gps_position IS NULL)::int AS idle,
       COUNT(*) FILTER (WHERE status = 'active' AND last_gps_position IS NOT NULL AND (last_gps_position->>'ignition')::boolean = false)::int AS engine_off,
       COUNT(*) FILTER (WHERE status = 'active' AND (last_gps_position->>'recorded_at')::timestamp < NOW() - INTERVAL '30 minutes')::int AS disconnected,
       ROUND(COALESCE(AVG((last_gps_position->>'speed')::numeric) FILTER (WHERE last_gps_position IS NOT NULL), 0), 1)::float AS avg_speed
     FROM trucks
     WHERE tenant_id = $1`,
    [tenant_id]
  );
  const row = result.rows[0];

  const alertCount = await query(
    `SELECT COUNT(DISTINCT truck_id)::int AS count FROM alerts WHERE tenant_id = $1 AND resolved = false AND truck_id IS NOT NULL`,
    [tenant_id]
  );

  const tripDist = await query(
    `SELECT COALESCE(SUM(distance_km), 0)::float AS total_distance FROM trips WHERE tenant_id = $1 AND status = 'completed'`,
    [tenant_id]
  );

  return {
    total: row.total,
    moving: row.moving,
    stopped: row.stopped,
    idle: row.idle,
    engineOff: row.engine_off,
    alert: alertCount.rows[0].count,
    disconnected: row.disconnected,
    avgSpeed: row.avg_speed,
    totalDistance: tripDist.rows[0].total_distance,
    totalFuel: 0,
  };
};
