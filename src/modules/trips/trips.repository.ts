import { pool } from '../../shared/db.js'

export interface TripRow {
  id: number
  trip_number: string
  code: string
  client_id: number | null
  truck_id: number | null
  driver_id: number | null
  origin_city: string | null
  origin: string | null
  origin_country: string | null
  destination_city: string | null
  destination: string | null
  destination_country: string | null
  route: Record<string, unknown> | null
  cargo_description: string | null
  cargo_weight_kg: number | null
  cargo_value: number | null
  status: string
  departure_at: string | null
  scheduled_date: string | null
  estimated_arrival_at: string | null
  actual_arrival_at: string | null
  completed_at: string | null
  distance_km: number | null
  distance: number | null
  fuel_consumed: number | null
  fuel_cost: number | null
  cost: number | null
  billing_status: string | null
  documents: Record<string, unknown> | null
  notes: string | null
  tenant_id: string
  created_at: string
  updated_at: string
  truck_plate?: string
  truck_brand?: string
  truck_model?: string
  driver_name?: string
  driver_phone?: string
  driver_email?: string
  driver_license?: string
  client_name?: string
  client_tax_id?: string
}

export interface TripFilters {
  status?: string
  client_id?: number
  driver_id?: number
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export class TripRepository {
  async findAll(tenant_id: string, filters: TripFilters = {}): Promise<PaginatedResult<TripRow>> {
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
    if (filters.driver_id) {
      conditions.push(`t.driver_id = $${idx++}`)
      params.push(filters.driver_id)
    }
    if (filters.date_from) {
      conditions.push(`t.departure_at >= $${idx++}`)
      params.push(filters.date_from)
    }
    if (filters.date_to) {
      conditions.push(`t.departure_at <= $${idx++}`)
      params.push(filters.date_to)
    }
    if (filters.search) {
      conditions.push(`t.trip_number ILIKE $${idx++}`)
      params.push(`%${filters.search}%`)
    }

    const where = conditions.join(' AND ')
    const page = filters.page ?? 1
    const limit = filters.limit ?? 25
    const offset = (page - 1) * limit

    const countResult = await pool.query(`SELECT COUNT(*) FROM trips t WHERE ${where}`, params)
    const total = parseInt(countResult.rows[0].count, 10)

    const dataResult = await pool.query(
      `SELECT t.*,
              t.trip_number AS code,
              t.origin_city AS origin,
              t.destination_city AS destination,
              t.departure_at AS scheduled_date,
              t.actual_arrival_at AS completed_at,
              t.distance_km AS distance,
              t.fuel_consumed AS fuel_cost,
              tr.plate AS truck_plate,
              tr.brand AS truck_brand,
              d.name AS driver_name,
              d.phone AS driver_phone,
              c.name AS client_name
       FROM trips t
       LEFT JOIN trucks tr ON tr.id = t.truck_id AND tr.tenant_id = $1
       LEFT JOIN drivers d ON d.id = t.driver_id AND d.tenant_id = $1
       LEFT JOIN clients c ON c.id = t.client_id AND c.tenant_id = $1
       WHERE ${where}
       ORDER BY t.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    )

    return {
      data: dataResult.rows as TripRow[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findById(tenant_id: string, id: number): Promise<TripRow | undefined> {
    const result = await pool.query(
      `SELECT t.*,
              t.trip_number AS code,
              t.origin_city AS origin,
              t.destination_city AS destination,
              t.departure_at AS scheduled_date,
              t.actual_arrival_at AS completed_at,
              t.distance_km AS distance,
              t.fuel_consumed AS fuel_cost,
              tr.plate AS truck_plate,
              tr.brand AS truck_brand,
              tr.model AS truck_model,
              d.name AS driver_name,
              d.phone AS driver_phone,
              d.email AS driver_email,
              d.license_number AS driver_license,
              c.name AS client_name,
              c.rut AS client_tax_id
       FROM trips t
       LEFT JOIN trucks tr ON tr.id = t.truck_id AND tr.tenant_id = $1
       LEFT JOIN drivers d ON d.id = t.driver_id AND d.tenant_id = $1
       LEFT JOIN clients c ON c.id = t.client_id AND c.tenant_id = $1
       WHERE t.id = $2 AND t.tenant_id = $1`,
      [tenant_id, id],
    )
    return result.rows[0] as TripRow | undefined
  }

  async create(tenant_id: string, data: Record<string, unknown>): Promise<TripRow> {
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
        data.trip_number,
        data.client_id,
        data.truck_id ?? null,
        data.driver_id ?? null,
        data.origin_city,
        data.origin_country,
        data.destination_city,
        data.destination_country,
        data.route ? JSON.stringify(data.route) : null,
        data.cargo_description ?? null,
        data.cargo_weight_kg ?? null,
        data.cargo_value ?? null,
        data.status ?? 'pending',
        data.departure_at ?? null,
        data.estimated_arrival_at ?? null,
        data.actual_arrival_at ?? null,
        data.distance_km ?? null,
        data.fuel_consumed ?? null,
        data.cost ?? null,
        data.billing_status ?? 'pending',
        data.documents ? JSON.stringify(data.documents) : null,
        data.notes ?? null,
        tenant_id,
      ],
    )
    return result.rows[0] as TripRow
  }

  async update(tenant_id: string, id: number, data: Record<string, unknown>): Promise<TripRow | undefined> {
    const fields: string[] = []
    const params: unknown[] = []
    let idx = 1

    const allowed = [
      'truck_id', 'driver_id', 'origin_city', 'origin_country',
      'destination_city', 'destination_country', 'route',
      'cargo_description', 'cargo_weight_kg', 'cargo_value',
      'status', 'departure_at', 'estimated_arrival_at', 'actual_arrival_at',
      'distance_km', 'fuel_consumed', 'cost', 'billing_status',
      'documents', 'notes',
    ]

    for (const field of allowed) {
      if (data[field] !== undefined) {
        const val = field === 'route' || field === 'documents' ? JSON.stringify(data[field]) : data[field]
        fields.push(`${field} = $${idx++}`)
        params.push(val)
      }
    }

    if (!fields.length) return undefined

    fields.push('updated_at = NOW()')
    params.push(tenant_id, id)

    const result = await pool.query(
      `UPDATE trips SET ${fields.join(', ')} WHERE tenant_id = $${idx} AND id = $${idx + 1} RETURNING *`,
      params,
    )
    return result.rows[0] as TripRow | undefined
  }

  async remove(tenant_id: string, id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM trips WHERE tenant_id = $1 AND id = $2 RETURNING id', [tenant_id, id])
    return result.rows.length > 0
  }

  async getGpsPositions(truckId: number, tenant_id: string, from: string, to?: string | null): Promise<Record<string, unknown>[]> {
    const result = await pool.query(
      `SELECT
         gps.latitude AS lat,
         gps.longitude AS lng,
         gps.altitude,
         gps.speed_kmh AS speed,
         gps.direction AS heading,
         gps.recorded_at AS timestamp
       FROM gps_positions gps
       WHERE gps.truck_id = $1
         AND gps.tenant_id = $2
         AND gps.recorded_at >= $3
         AND gps.recorded_at <= COALESCE($4, NOW())
       ORDER BY gps.recorded_at ASC`,
      [truckId, tenant_id, from, to],
    )
    return result.rows as Record<string, unknown>[]
  }

  async getStats(tenant_id: string): Promise<Record<string, unknown>> {
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
    )
    return result.rows[0] as Record<string, unknown>
  }
}
