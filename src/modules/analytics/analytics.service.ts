import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';

interface AnalyticsFilters {
  from?: string;
  to?: string;
  client_id?: number;
  driver_id?: number;
}

function dateClause(filters: AnalyticsFilters, startParam: number, alias?: string) {
  const prefix = alias ? `${alias}.` : '';
  const clauses: string[] = [];
  const params: string[] = [];
  let idx = startParam;

  if (filters.from) {
    clauses.push(`${prefix}created_at >= $${idx}`);
    params.push(filters.from);
    idx++;
  }
  if (filters.to) {
    clauses.push(`${prefix}created_at <= $${idx}`);
    params.push(filters.to);
    idx++;
  }

  return { sql: clauses.length ? clauses.join(' AND ') : 'TRUE', params, nextParam: idx };
}

function buildKpiQuery(tenant_id: string, filters: AnalyticsFilters) {
  const dc = dateClause(filters, 2);
  const params: unknown[] = [tenant_id, ...dc.params];

  return {
    sql: `
      SELECT
        (SELECT COUNT(*) FROM trucks WHERE tenant_id = $1 AND status = 'active') AS active_trucks,
        (SELECT COUNT(*) FROM trucks WHERE tenant_id = $1 AND status = 'active'
           AND (last_gps_position->>'speed')::numeric < 1) AS stopped_trucks,
        (SELECT COUNT(*) FROM trips WHERE tenant_id = $1 AND status = 'in_progress' AND ${dc.sql}) AS in_progress_trips,
        (SELECT COUNT(*) FROM trips WHERE tenant_id = $1 AND status = 'completed'
           AND created_at >= CURRENT_DATE AND ${dc.sql}) AS todays_completed_trips,
        (SELECT COUNT(*) FROM clients WHERE tenant_id = $1) AS total_clients,
        (SELECT COUNT(*) FROM drivers WHERE tenant_id = $1) AS total_drivers,
        (SELECT COUNT(*) FROM alerts WHERE tenant_id = $1
           AND created_at >= CURRENT_DATE AND ${dc.sql}) AS alerts_today,
        COALESCE(
          (SELECT AVG((last_gps_position->>'speed')::numeric) FROM trucks
           WHERE tenant_id = $1 AND last_gps_position IS NOT NULL), 0
        ) AS avg_speed,
        COALESCE(
          (SELECT SUM(distance_km) FROM trips
           WHERE tenant_id = $1 AND status = 'completed' AND ${dc.sql}), 0
        ) AS total_distance_km,
        COALESCE(
          (SELECT SUM(gp.fuel_consumption) FROM trips t
           JOIN gps_positions gp ON gp.trip_id = t.id
           WHERE t.tenant_id = $1 AND t.status = 'completed' AND ${dc.sql.replaceAll('created_at', 't.created_at')}), 0
        ) AS total_fuel_liters
    `,
    params,
  };
}

export async function getExecutiveDashboard(tenant_id: string, filters: AnalyticsFilters) {
  const q = buildKpiQuery(tenant_id, filters);
  const { rows } = await pool.query(q.sql, q.params);
  return {
    active_trucks: Number(rows[0].active_trucks),
    stopped_trucks: Number(rows[0].stopped_trucks),
    in_progress_trips: Number(rows[0].in_progress_trips),
    todays_completed_trips: Number(rows[0].todays_completed_trips),
    total_clients: Number(rows[0].total_clients),
    total_drivers: Number(rows[0].total_drivers),
    alerts_today: Number(rows[0].alerts_today),
    avg_speed_kmh: Number(rows[0].avg_speed).toFixed(1),
    total_distance_km: Number(rows[0].total_distance_km),
    total_fuel_liters: Number(rows[0].total_fuel_liters),
  };
}

export async function getOperationalDashboard(tenant_id: string, filters: AnalyticsFilters) {
  const dc = dateClause(filters, 2);
  const params: unknown[] = [tenant_id, ...dc.params];

  const { rows } = await pool.query(
    `SELECT
       ROUND(
         (SELECT COUNT(*) FROM trips WHERE tenant_id = $1 AND status = 'in_progress' AND ${dc.sql})::numeric /
         NULLIF((SELECT COUNT(*) FROM trips WHERE tenant_id = $1 AND ${dc.sql}), 0) * 100, 1
       ) AS fleet_utilization_pct,
       ROUND(
         (SELECT COUNT(*) FROM trips WHERE tenant_id = $1 AND status = 'completed'
            AND actual_arrival_at <= estimated_arrival_at AND ${dc.sql})::numeric /
         NULLIF((SELECT COUNT(*) FROM trips WHERE tenant_id = $1 AND status = 'completed' AND ${dc.sql}), 0) * 100, 1
       ) AS on_time_delivery_pct,
       COALESCE(
          (SELECT AVG(EXTRACT(EPOCH FROM (actual_arrival_at - departure_at)) / 60)
          FROM trips WHERE tenant_id = $1 AND status = 'completed' AND ${dc.sql}), 0
       ) AS avg_trip_duration_min`,
    params
  );

  const topClients = await pool.query(
    `SELECT c.id, c.name, COUNT(t.id) AS trips
     FROM clients c
     JOIN trips t ON t.client_id = c.id AND t.tenant_id = c.tenant_id
     WHERE c.tenant_id = $1 AND ${dc.sql}
     GROUP BY c.id, c.name
     ORDER BY trips DESC
     LIMIT 10`,
    params
  );

  const topDrivers = await pool.query(
    `SELECT d.id, d.name, COUNT(t.id) AS trips
     FROM drivers d
     JOIN trips t ON t.driver_id = d.id AND t.tenant_id = d.tenant_id
     WHERE d.tenant_id = $1 AND ${dc.sql}
     GROUP BY d.id, d.name
     ORDER BY trips DESC
     LIMIT 10`,
    params
  );

  return {
    fleet_utilization_pct: Number(rows[0].fleet_utilization_pct),
    on_time_delivery_pct: Number(rows[0].on_time_delivery_pct),
    avg_trip_duration_min: Math.round(Number(rows[0].avg_trip_duration_min)),
    top_clients_by_trips: topClients.rows,
    top_drivers_by_trips: topDrivers.rows,
  };
}

export async function getClientDashboard(
  tenant_id: string,
  clientId: number,
  filters: AnalyticsFilters
) {
  const dc = dateClause(filters, 3);
  const params: unknown[] = [tenant_id, clientId, ...dc.params];

  const { rows: clientRows } = await pool.query(
    `SELECT id, name, business_name, status FROM clients WHERE id = $2 AND tenant_id = $1`,
    [tenant_id, clientId]
  );
  if (!clientRows[0]) throw new NotFoundError('Client not found');

  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'completed') AS completed_trips,
       COUNT(*) FILTER (WHERE status = 'in_progress') AS active_trips,
       COUNT(*) FILTER (WHERE status = 'pending') AS pending_trips,
       COALESCE(SUM(distance_km), 0) AS total_distance_km,
       COALESCE(AVG(distance_km), 0) AS avg_distance_km,
       COALESCE(SUM(cargo_value), 0) AS total_cargo_value,
       COUNT(*) AS total_trips
     FROM trips
     WHERE tenant_id = $1 AND client_id = $2 AND ${dc.sql}`,
    params
  );

  return {
    client: clientRows[0],
    kpis: {
      total_trips: Number(rows[0].total_trips),
      completed_trips: Number(rows[0].completed_trips),
      active_trips: Number(rows[0].active_trips),
      pending_trips: Number(rows[0].pending_trips),
      total_distance_km: Number(rows[0].total_distance_km),
      avg_distance_km: Math.round(Number(rows[0].avg_distance_km)),
      total_cargo_value: Number(rows[0].total_cargo_value),
    },
  };
}

export async function getDriverRankings(tenant_id: string, filters: AnalyticsFilters) {
  const dc = dateClause(filters, 2);
  const params: unknown[] = [tenant_id, ...dc.params];

  const { rows } = await pool.query(
    `SELECT
       d.id,
       d.name,
       d.status,
       COUNT(t.id) AS total_trips,
       COALESCE(SUM(t.distance_km), 0) AS total_distance_km,
       COALESCE(SUM(EXTRACT(EPOCH FROM (t.actual_arrival_at - t.departure_at)) / 3600), 0) AS total_hours
     FROM drivers d
     LEFT JOIN trips t ON t.driver_id = d.id AND t.tenant_id = d.tenant_id AND ${dc.sql.replaceAll('created_at', 't.created_at')}
     WHERE d.tenant_id = $1
     GROUP BY d.id, d.name, d.status
     ORDER BY total_trips DESC`,
    params
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    total_trips: Number(r.total_trips),
    total_distance_km: Number(r.total_distance_km),
    total_hours: Math.round(Number(r.total_hours) * 100) / 100,
  }));
}

export async function getClientRankings(tenant_id: string, filters: AnalyticsFilters) {
  const dc = dateClause(filters, 2);
  const params: unknown[] = [tenant_id, ...dc.params];

  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.name,
       c.status,
       COUNT(t.id) AS total_trips,
       COALESCE(SUM(t.cargo_value), 0) AS total_revenue
     FROM clients c
     LEFT JOIN trips t ON t.client_id = c.id AND t.tenant_id = c.tenant_id AND ${dc.sql.replaceAll('created_at', 't.created_at')}
     WHERE c.tenant_id = $1
     GROUP BY c.id, c.name, c.status
     ORDER BY total_trips DESC`,
    params
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    total_trips: Number(r.total_trips),
    total_revenue: Number(r.total_revenue),
  }));
}
