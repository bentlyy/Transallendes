import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';

export interface AlertFilters {
  type?: string;
  severity?: string;
  resolved?: boolean;
  truck_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

function buildWhereClause(tenant_id: string, filters: AlertFilters): { text: string; params: any[] } {
  const conditions: string[] = ['tenant_id = $1'];
  const params: any[] = [tenant_id];
  let idx = 2;

  if (filters.type) {
    conditions.push(`type = $${idx++}`);
    params.push(filters.type);
  }
  if (filters.severity) {
    conditions.push(`severity = $${idx++}`);
    params.push(filters.severity);
  }
  if (filters.resolved !== undefined) {
    conditions.push(`resolved = $${idx++}`);
    params.push(filters.resolved);
  }
  if (filters.truck_id) {
    conditions.push(`truck_id = $${idx++}`);
    params.push(filters.truck_id);
  }
  if (filters.date_from) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push(`created_at <= $${idx++}`);
    params.push(filters.date_to);
  }

  return { text: conditions.join(' AND '), params };
}

export async function findAll(tenant_id: string, filters: AlertFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  const offset = (page - 1) * limit;

  const { text: where, params } = buildWhereClause(tenant_id, filters);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM alerts WHERE ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT * FROM alerts WHERE ${where}
     ORDER BY created_at DESC
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
    'SELECT * FROM alerts WHERE tenant_id = $1 AND id = $2',
    [tenant_id, id],
  );

  if (!result.rows.length) {
    throw new NotFoundError(`Alert with id ${id} not found`);
  }

  return result.rows[0];
}

export async function acknowledge(tenant_id: string, id: number, userId: number) {
  const result = await pool.query(
    `UPDATE alerts SET acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW()
     WHERE tenant_id = $2 AND id = $3 RETURNING *`,
    [userId, tenant_id, id],
  );

  if (!result.rows.length) {
    throw new NotFoundError(`Alert with id ${id} not found`);
  }

  return result.rows[0];
}

export async function resolve(tenant_id: string, id: number) {
  const result = await pool.query(
    `UPDATE alerts SET resolved = true, resolved_at = NOW()
     WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    [tenant_id, id],
  );

  if (!result.rows.length) {
    throw new NotFoundError(`Alert with id ${id} not found`);
  }

  return result.rows[0];
}

export async function createAlert(tenant_id: string, data: any) {
  const result = await pool.query(
    `INSERT INTO alerts (
       type, severity, title, message,
       resource_type, resource_id, driver_id, truck_id, trip_id, geofence_id,
       acknowledged, resolved, tenant_id, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,false,$11,NOW())
     RETURNING *`,
    [
      data.type, data.severity, data.title, data.message,
      data.resource_type ?? null, data.resource_id ?? null,
      data.driver_id ?? null, data.truck_id ?? null,
      data.trip_id ?? null, data.geofence_id ?? null,
      tenant_id,
    ],
  );

  return result.rows[0];
}

export async function getStats(tenant_id: string) {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
       COUNT(*) FILTER (WHERE severity IN ('warning', 'emergency'))::int AS high,
       COUNT(*) FILTER (WHERE severity = 'warning')::int AS medium,
       COUNT(*) FILTER (WHERE severity IN ('info', 'low'))::int AS low,
       COUNT(*) FILTER (WHERE acknowledged_at IS NOT NULL)::int AS acknowledged,
       COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::int AS resolved,
       COUNT(*) FILTER (WHERE acknowledged_at IS NULL AND resolved_at IS NULL)::int AS pending
     FROM alerts
     WHERE tenant_id = $1`,
    [tenant_id],
  );

  return result.rows[0];
}

export async function getUnresolvedCount(tenant_id: string) {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS count FROM alerts WHERE tenant_id = $1 AND resolved = false',
    [tenant_id],
  );

  return result.rows[0].count;
}
