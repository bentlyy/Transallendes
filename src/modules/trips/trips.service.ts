import { pool } from '../../shared/db.js'
import { NotFoundError } from '../../utils/errors.js'
import { TripRepository, type TripFilters } from './trips.repository.js'

const repo = new TripRepository()

function generateTripNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(1000 + Math.random() * 9000))
  return `TMS-${y}${m}${d}-${rand}`
}

export async function findAll(tenant_id: string, filters: TripFilters = {}) {
  return repo.findAll(tenant_id, filters)
}

export async function findById(tenant_id: string, id: number) {
  const trip = await repo.findById(tenant_id, id)
  if (!trip) throw new NotFoundError(`Viaje con id ${id} no encontrado`)
  return trip
}

export async function create(tenant_id: string, data: Record<string, unknown>) {
  const tripNumber = (data.trip_number as string) || generateTripNumber()
  return repo.create(tenant_id, { ...data, trip_number: tripNumber })
}

export async function update(tenant_id: string, id: number, data: Record<string, unknown>) {
  const trip = await repo.update(tenant_id, id, data)
  if (!trip) throw new NotFoundError(`Viaje con id ${id} no encontrado`)
  return trip
}

export async function remove(tenant_id: string, id: number) {
  const deleted = await repo.remove(tenant_id, id)
  if (!deleted) throw new NotFoundError(`Viaje con id ${id} no encontrado`)
}

export async function updateStatus(tenant_id: string, id: number, status: string) {
  const previous = await repo.findById(tenant_id, id)
  if (!previous) throw new NotFoundError(`Viaje con id ${id} no encontrado`)

  const updated = await repo.update(tenant_id, id, { status })
  if (!updated) throw new NotFoundError(`Viaje con id ${id} no encontrado`)

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, tenant_id, created_at)
     VALUES (NULL, 'update_status', 'trip', $1, $2, $3, $4, NOW())`,
    [id, JSON.stringify({ status: previous.status }), JSON.stringify({ status }), tenant_id],
  )

  return updated
}

export async function getTripPositions(tenant_id: string, tripId: number) {
  const trip = await repo.findById(tenant_id, tripId)
  if (!trip) throw new NotFoundError(`Viaje con id ${tripId} no encontrado`)

  if (!trip.truck_id) return []

  return repo.getGpsPositions(trip.truck_id, tenant_id, trip.departure_at || trip.created_at, trip.actual_arrival_at)
}

export async function getStats(tenant_id: string) {
  const result = await repo.getStats(tenant_id)
  const row = result
  return {
    total: row.total,
    inProgress: row.in_progress,
    completed: row.completed,
    cancelled: row.cancelled,
    delayed: row.delayed,
    planned: row.planned,
    avgDuration: row.avg_duration,
    avgDistance: row.avg_distance,
  }
}
