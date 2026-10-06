import { query } from '../../shared/db.js'
import { NotFoundError } from '../../utils/errors.js'
import type { DriverStatus } from '../../types/index.js'

interface DriverFilters {
  status?: DriverStatus
  search?: string
  page?: number
  limit?: number
}

export const findAll = async (tenant_id: string, filters: DriverFilters = {}) => {
  const conditions: string[] = ['d.tenant_id = $1']
  const params: unknown[] = [tenant_id]
  let idx = 2

  if (filters.status) {
    conditions.push(`d.status = $${idx++}`)
    params.push(filters.status)
  }

  if (filters.search) {
    conditions.push(`(d.name ILIKE $${idx} OR d.email ILIKE $${idx} OR d.phone ILIKE $${idx})`)
    params.push(`%${filters.search}%`)
    idx++
  }

  const where = conditions.join(' AND ')
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const offset = (page - 1) * limit

  const countResult = await query(`SELECT COUNT(*) FROM drivers d WHERE ${where}`, params)
  const total = parseInt(countResult.rows[0].count, 10)

  params.push(limit, offset)
  const dataResult = await query(
    `SELECT d.* FROM drivers d WHERE ${where} ORDER BY d.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    params,
  )

  return {
    data: dataResult.rows,
    total,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export const findById = async (tenant_id: string, id: number) => {
  const result = await query('SELECT * FROM drivers WHERE id = $1 AND tenant_id = $2', [id, tenant_id])
  if (result.rows.length === 0) throw new NotFoundError('Driver not found')
  return result.rows[0]
}

export const create = async (tenant_id: string, data: Record<string, unknown>) => {
  const columns: string[] = ['tenant_id']
  const values: unknown[] = [tenant_id]
  const placeholders: string[] = ['$1']
  let idx = 2

  const allowed = ['name', 'email', 'phone', 'license_type', 'license_expiry', 'license_number', 'documents', 'status']

  for (const field of allowed) {
    if (data[field] !== undefined) {
      columns.push(field)
      values.push(data[field])
      placeholders.push(`$${idx++}`)
    }
  }

  const result = await query(
    `INSERT INTO drivers (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values,
  )
  return result.rows[0]
}

export const update = async (tenant_id: string, id: number, data: Record<string, unknown>) => {
  const existing = await query('SELECT id FROM drivers WHERE id = $1 AND tenant_id = $2', [id, tenant_id])
  if (existing.rows.length === 0) throw new NotFoundError('Driver not found')

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  const allowed = ['name', 'email', 'phone', 'license_type', 'license_expiry', 'license_number', 'documents', 'status']

  for (const field of allowed) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${idx++}`)
      values.push(data[field])
    }
  }

  if (sets.length === 0) return existing.rows[0]

  values.push(id, tenant_id)
  const result = await query(
    `UPDATE drivers SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
    values,
  )
  return result.rows[0]
}

export const remove = async (tenant_id: string, id: number) => {
  const result = await query('DELETE FROM drivers WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenant_id])
  if (result.rows.length === 0) throw new NotFoundError('Driver not found')
}

export const getDriverTrips = async (tenant_id: string, driverId: number) => {
  const driver = await query('SELECT id FROM drivers WHERE id = $1 AND tenant_id = $2', [driverId, tenant_id])
  if (driver.rows.length === 0) throw new NotFoundError('Driver not found')

  const result = await query(
    `SELECT t.*,
            t.trip_number AS code,
            t.origin_city AS origin,
            t.destination_city AS destination,
            t.departure_at AS scheduled_date,
            t.distance_km AS distance,
            tr.plate AS truck_plate
     FROM trips t
     LEFT JOIN trucks tr ON tr.id = t.truck_id AND tr.tenant_id = $1
     WHERE t.driver_id = $2 AND t.tenant_id = $1
     ORDER BY t.created_at DESC LIMIT 100`,
    [tenant_id, driverId],
  )
  return { data: result.rows, total: result.rows.length }
}

export const getStats = async (tenant_id: string) => {
  const total = await query('SELECT COUNT(*) FROM drivers WHERE tenant_id = $1', [tenant_id])

  const byStatus = await query(
    `SELECT status, COUNT(*)::int AS count FROM drivers WHERE tenant_id = $1 GROUP BY status`,
    [tenant_id],
  )

  return {
    total: parseInt(total.rows[0].count, 10),
    byStatus: byStatus.rows,
  }
}
