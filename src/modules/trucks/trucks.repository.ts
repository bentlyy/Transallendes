import { query } from '../../shared/db.js'
import type { TruckStatus } from '../../types/index.js'

export interface TruckRow {
  id: number
  tenant_id: string
  plate: string
  brand: string
  model: string
  year: number | null
  vin: string | null
  capacity_kg: number | null
  capacity_m3: number | null
  fuel_type: string | null
  status: TruckStatus
  driver_id: number | null
  client_id: number | null
  gps_device_id: string | null
  gps_provider: string | null
  insurance_expiry: string | null
  technical_review_expiry: string | null
  permits: Record<string, unknown> | null
  notes: string | null
  last_gps_position: Record<string, unknown> | null
  created_at: string
  updated_at: string
  driver_name?: string
  client_name?: string
  lat?: number
  lng?: number
  speed?: number
  heading?: number
  ignition?: boolean
  last_position_update?: string
  fuel_level?: number
}

export interface TruckFilters {
  status?: TruckStatus
  client_id?: number
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class TruckRepository {
  async findAll(tenant_id: string, filters: TruckFilters = {}): Promise<PaginatedResult<TruckRow>> {
    const conditions: string[] = ['t.tenant_id = $1']
    const params: unknown[] = [tenant_id]
    let idx = 2

    if (filters.status) {
      conditions.push(`t.status = $${idx++}`)
      params.push(filters.status)
    }

    if (filters.client_id) {
      conditions.push(`t.client_id = $${idx++}`)
      params.push(filters.client_id)
    }

    if (filters.search) {
      conditions.push(`(t.plate ILIKE $${idx} OR t.brand ILIKE $${idx})`)
      params.push(`%${filters.search}%`)
      idx++
    }

    const where = conditions.join(' AND ')
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit

    const countResult = await query(`SELECT COUNT(*) FROM trucks t WHERE ${where}`, params)
    const total = parseInt(countResult.rows[0].count, 10)

    params.push(limit, offset)
    const dataResult = await query(
      `SELECT t.*,
              d.name AS driver_name,
              c.name AS client_name,
              (t.last_gps_position->>'lat')::float AS lat,
              (t.last_gps_position->>'lng')::float AS lng,
              (t.last_gps_position->>'speed')::float AS speed,
              (t.last_gps_position->>'ignition')::boolean AS ignition,
              t.last_gps_position->>'timestamp' AS last_position_update,
              (t.last_gps_position->>'fuel_level')::float AS fuel_level
       FROM trucks t
       LEFT JOIN drivers d ON d.id = t.driver_id AND d.tenant_id = t.tenant_id
       LEFT JOIN clients c ON c.id = t.client_id AND c.tenant_id = t.tenant_id
       WHERE ${where}
       ORDER BY t.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params,
    )

    return {
      data: dataResult.rows as TruckRow[],
      total,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async findById(tenant_id: string, id: number): Promise<TruckRow | undefined> {
    const result = await query(
      `SELECT t.*,
              d.name AS driver_name,
              c.name AS client_name,
              (t.last_gps_position->>'lat')::float AS lat,
              (t.last_gps_position->>'lng')::float AS lng,
              (t.last_gps_position->>'speed')::float AS speed,
              (t.last_gps_position->>'heading')::float AS heading,
              (t.last_gps_position->>'ignition')::boolean AS ignition,
              t.last_gps_position->>'timestamp' AS last_position_update,
              (t.last_gps_position->>'fuel_level')::float AS fuel_level
       FROM trucks t
       LEFT JOIN drivers d ON d.id = t.driver_id AND d.tenant_id = t.tenant_id
       LEFT JOIN clients c ON c.id = t.client_id AND c.tenant_id = t.tenant_id
       WHERE t.id = $1 AND t.tenant_id = $2`,
      [id, tenant_id],
    )
    return result.rows[0] as TruckRow | undefined
  }

  async existsById(tenant_id: string, id: number): Promise<boolean> {
    const result = await query('SELECT id FROM trucks WHERE id = $1 AND tenant_id = $2', [id, tenant_id])
    return result.rows.length > 0
  }

  async create(tenant_id: string, data: Record<string, unknown>): Promise<TruckRow> {
    const columns: string[] = ['tenant_id']
    const values: unknown[] = [tenant_id]
    const placeholders: string[] = ['$1']
    let idx = 2

    const allowed = [
      'plate', 'brand', 'model', 'year', 'capacity_kg', 'capacity_m3',
      'status', 'driver_id', 'client_id', 'gps_device_id', 'gps_provider',
      'insurance_expiry', 'technical_review_expiry', 'permits', 'notes',
    ]

    for (const field of allowed) {
      if (data[field] !== undefined) {
        columns.push(field)
        values.push(data[field])
        placeholders.push(`$${idx++}`)
      }
    }

    const result = await query(
      `INSERT INTO trucks (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values,
    )
    return result.rows[0] as TruckRow
  }

  async update(tenant_id: string, id: number, data: Record<string, unknown>): Promise<TruckRow | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    const allowed = [
      'plate', 'brand', 'model', 'year', 'capacity_kg', 'capacity_m3',
      'status', 'driver_id', 'client_id', 'gps_device_id', 'gps_provider',
      'insurance_expiry', 'technical_review_expiry', 'permits', 'notes',
    ]

    for (const field of allowed) {
      if (data[field] !== undefined) {
        sets.push(`${field} = $${idx++}`)
        values.push(data[field])
      }
    }

    if (sets.length === 0) return null

    values.push(id, tenant_id)
    const result = await query(
      `UPDATE trucks SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
      values,
    )
    return (result.rows[0] as TruckRow) || null
  }

  async remove(tenant_id: string, id: number): Promise<boolean> {
    const result = await query('DELETE FROM trucks WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenant_id])
    return result.rows.length > 0
  }

  async getLastGpsPosition(tenant_id: string, truckId: number): Promise<Record<string, unknown> | null> {
    const result = await query(
      `SELECT
         latitude AS lat,
         longitude AS lng,
         speed_kmh AS speed,
         direction AS heading,
         ignition,
         recorded_at,
          odometer_km, fuel_level, temperature, battery_level
       FROM gps_positions
       WHERE truck_id = $1 AND tenant_id = $2
       ORDER BY recorded_at DESC LIMIT 1`,
      [truckId, tenant_id],
    )
    return (result.rows[0] as Record<string, unknown>) || null
  }

  async getPositionHistory(
    tenant_id: string,
    truckId: number,
    from?: string,
    to?: string,
  ): Promise<Record<string, unknown>[]> {
    const conditions: string[] = ['truck_id = $1', 'tenant_id = $2']
    const params: unknown[] = [truckId, tenant_id]
    let idx = 3

    if (from) {
      conditions.push(`recorded_at >= $${idx++}`)
      params.push(from)
    }
    if (to) {
      conditions.push(`recorded_at <= $${idx++}`)
      params.push(to)
    }

    const result = await query(
      `SELECT
         latitude AS lat,
         longitude AS lng,
         speed_kmh AS speed,
         direction AS heading,
         ignition,
         recorded_at,
          odometer_km, fuel_level, temperature, battery_level
       FROM gps_positions
       WHERE ${conditions.join(' AND ')}
       ORDER BY recorded_at DESC
       LIMIT 1000`,
      params,
    )
    return result.rows as Record<string, unknown>[]
  }
}
