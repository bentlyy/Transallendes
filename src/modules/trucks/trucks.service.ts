import { query } from '../../shared/db.js'
import { NotFoundError } from '../../utils/errors.js'
import { TruckRepository, type TruckFilters } from './trucks.repository.js'

const repo = new TruckRepository()

export const findAll = async (tenant_id: string, filters: TruckFilters = {}) => {
  return repo.findAll(tenant_id, filters)
}

export const findById = async (tenant_id: string, id: number) => {
  const truck = await repo.findById(tenant_id, id)
  if (!truck) throw new NotFoundError('Truck not found')
  return truck
}

export const create = async (tenant_id: string, data: Record<string, unknown>) => {
  return repo.create(tenant_id, data)
}

export const update = async (tenant_id: string, id: number, data: Record<string, unknown>) => {
  const truck = await repo.update(tenant_id, id, data)
  if (!truck) throw new NotFoundError('Truck not found')
  return truck
}

export const remove = async (tenant_id: string, id: number) => {
  const deleted = await repo.remove(tenant_id, id)
  if (!deleted) throw new NotFoundError('Truck not found')
}

export const getLastPosition = async (tenant_id: string, truckId: number) => {
  const exists = await repo.existsById(tenant_id, truckId)
  if (!exists) throw new NotFoundError('Truck not found')
  return repo.getLastGpsPosition(tenant_id, truckId)
}

export const getPositionHistory = async (tenant_id: string, truckId: number, from?: string, to?: string) => {
  const exists = await repo.existsById(tenant_id, truckId)
  if (!exists) throw new NotFoundError('Truck not found')
  return repo.getPositionHistory(tenant_id, truckId, from, to)
}

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
    [tenant_id],
  )
  const row = result.rows[0] as Record<string, unknown>

  const alertCount = await query(
    `SELECT COUNT(DISTINCT truck_id)::int AS count FROM alerts WHERE tenant_id = $1 AND resolved = false AND truck_id IS NOT NULL`,
    [tenant_id],
  )

  const tripDist = await query(
    `SELECT COALESCE(SUM(distance_km), 0)::float AS total_distance FROM trips WHERE tenant_id = $1 AND status = 'completed'`,
    [tenant_id],
  )

  return {
    total: row.total,
    moving: row.moving,
    stopped: row.stopped,
    idle: row.idle,
    engineOff: row.engine_off,
    alert: (alertCount.rows[0] as Record<string, unknown>).count,
    disconnected: row.disconnected,
    avgSpeed: row.avg_speed,
    totalDistance: (tripDist.rows[0] as Record<string, unknown>).total_distance,
    totalFuel: 0,
  }
}
