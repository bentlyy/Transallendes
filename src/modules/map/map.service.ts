import { pool } from '../../shared/db.js'
import { NotFoundError } from '../../utils/errors.js'

interface PositionFilters {
  status?: string
  client_id?: number
  search?: string
}

interface ClusterBounds {
  sw_lat: number
  sw_lng: number
  ne_lat: number
  ne_lng: number
  zoom: number
}

function buildWhereClause(
  tenant_id: string,
  filters: PositionFilters,
  startParam: number,
): { sql: string; params: unknown[] } {
  const clauses: string[] = [`t.tenant_id = $${startParam}`]
  const params: unknown[] = [tenant_id]
  let idx = startParam + 1

  if (filters.status) {
    clauses.push(`t.status = $${idx++}`)
    params.push(filters.status)
  }

  if (filters.client_id) {
    clauses.push(`t.client_id = $${idx++}`)
    params.push(filters.client_id)
  }

  if (filters.search) {
    clauses.push(`(t.plate ILIKE $${idx} OR t.brand ILIKE $${idx} OR t.model ILIKE $${idx})`)
    params.push(`%${filters.search}%`)
    idx++
  }

  return { sql: clauses.join(' AND '), params }
}

export async function getPositions(tenant_id: string, filters: PositionFilters) {
  const where = buildWhereClause(tenant_id, filters, 1)

  const { rows } = await pool.query(
    `SELECT
       t.id AS truck_id,
       t.plate AS license_plate,
       t.brand,
       t.model,
       t.status,
       t.last_gps_position,
       d.id AS driver_id,
       d.name AS driver_name,
       d.phone AS driver_phone,
       tr.id AS current_trip_id,
       tr.status AS trip_status,
       tr.destination_city AS trip_destination
     FROM trucks t
     LEFT JOIN drivers d ON d.id = t.driver_id AND d.tenant_id = t.tenant_id
     LEFT JOIN trips tr ON tr.truck_id = t.id AND tr.tenant_id = t.tenant_id AND tr.status = 'in_progress'
     WHERE ${where.sql} AND t.last_gps_position IS NOT NULL
     ORDER BY t.plate`,
    where.params,
  )

  return rows.map((r) => {
    const pos = r.last_gps_position as Record<string, unknown> | null
    return {
      id: String(r.truck_id),
      truckId: r.truck_id,
      plate: r.license_plate,
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
      speed: pos?.speed ?? null,
      heading: pos?.direction ?? pos?.heading ?? null,
      ignition: pos?.ignition ?? null,
      status: r.status,
      driverName: r.driver_name ?? null,
      lastUpdate: pos?.recorded_at ?? pos?.timestamp ?? null,
      brand: r.brand,
      model: r.model,
      driver: r.driver_id ? { id: r.driver_id, name: r.driver_name, phone: r.driver_phone } : null,
      currentTrip: r.current_trip_id
        ? { id: r.current_trip_id, status: r.trip_status, destination: r.trip_destination }
        : null,
    }
  })
}

export async function getClusters(tenant_id: string, bounds: ClusterBounds, filters: PositionFilters) {
  const where = buildWhereClause(tenant_id, filters, 1)

  const gridSize = Math.max(1, Math.floor(360 / Math.pow(2, bounds.zoom + 1)))

  const { rows } = await pool.query(
    `SELECT
       ROUND(CAST((t.last_gps_position->>'lat') AS numeric), $${where.params.length + 1}) AS grid_lat,
       ROUND(CAST((t.last_gps_position->>'lng') AS numeric), $${where.params.length + 2}) AS grid_lng,
       COUNT(*) AS count,
       ARRAY_AGG(t.id) AS truck_ids
     FROM trucks t
     WHERE ${where.sql}
       AND t.last_gps_position IS NOT NULL
       AND CAST((t.last_gps_position->>'lat') AS numeric) BETWEEN $${where.params.length + 3} AND $${where.params.length + 4}
       AND CAST((t.last_gps_position->>'lng') AS numeric) BETWEEN $${where.params.length + 5} AND $${where.params.length + 6}
     GROUP BY grid_lat, grid_lng
     ORDER BY count DESC`,
    [...where.params, gridSize, gridSize, bounds.sw_lat, bounds.ne_lat, bounds.sw_lng, bounds.ne_lng],
  )

  return rows.map((r) => ({
    lat: Number(r.grid_lat),
    lng: Number(r.grid_lng),
    count: Number(r.count),
    truckIds: r.truck_ids,
  }))
}

export async function getTruckInfo(tenant_id: string, truckId: number) {
  const { rows } = await pool.query(
    `SELECT
       t.*,
       d.id AS driver_id,
       d.name AS driver_name,
       d.phone AS driver_phone,
       d.license_number AS driver_license,
       d.status AS driver_status,
        tr.id AS trip_id,
        tr.origin_city AS trip_origin,
        tr.destination_city AS trip_destination,
        tr.status AS trip_status,
        tr.departure_at,
        tr.estimated_arrival_at,
        tr.actual_arrival_at,
        (
          SELECT json_agg(json_build_object(
           'id', a.id,
           'type', a.type,
           'severity', a.severity,
           'title', a.title,
           'message', a.message,
           'acknowledged', a.acknowledged,
           'created_at', a.created_at
         ) ORDER BY a.created_at DESC)
         FROM alerts a
         WHERE a.truck_id = t.id AND a.tenant_id = t.tenant_id
           AND a.created_at > NOW() - INTERVAL '24 hours'
       ) AS recent_alerts
     FROM trucks t
      LEFT JOIN drivers d ON d.id = t.driver_id AND d.tenant_id = t.tenant_id
      LEFT JOIN trips tr ON tr.truck_id = t.id AND tr.tenant_id = t.tenant_id AND tr.status = 'in_progress'
      WHERE t.id = $1 AND t.tenant_id = $2`,
    [truckId, tenant_id],
  )

  if (!rows[0]) throw new NotFoundError('Camion no encontrado')
  return rows[0]
}
