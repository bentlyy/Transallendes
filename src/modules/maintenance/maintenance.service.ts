import { query } from '../../shared/db.js'
import { NotFoundError } from '../../utils/errors.js'

interface MaintenanceFilters {
  status?: string
  truck_id?: number
  type?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export const findAll = async (tenant_id: string, filters: MaintenanceFilters = {}) => {
  const conditions: string[] = ['m.tenant_id = $1']
  const params: unknown[] = [tenant_id]
  let idx = 2

  if (filters.status) {
    conditions.push(`m.status = $${idx++}`)
    params.push(filters.status)
  }
  if (filters.truck_id) {
    conditions.push(`m.truck_id = $${idx++}`)
    params.push(filters.truck_id)
  }
  if (filters.type) {
    conditions.push(`m.type = $${idx++}`)
    params.push(filters.type)
  }
  if (filters.from) {
    conditions.push(`m.scheduled_date >= $${idx++}`)
    params.push(filters.from)
  }
  if (filters.to) {
    conditions.push(`m.scheduled_date <= $${idx++}`)
    params.push(filters.to)
  }

  const where = conditions.join(' AND ')
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const offset = (page - 1) * limit

  const countResult = await query(`SELECT COUNT(*) FROM maintenance m WHERE ${where}`, params)
  const total = parseInt(countResult.rows[0].count, 10)

  params.push(limit, offset)
  const dataResult = await query(
    `SELECT m.*, t.plate AS truck_plate
     FROM maintenance m
     LEFT JOIN trucks t ON t.id = m.truck_id AND t.tenant_id = m.tenant_id
     WHERE ${where}
     ORDER BY m.scheduled_date DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params,
  )

  return {
    data: dataResult.rows,
    total,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export const findById = async (tenant_id: string, id: number) => {
  const result = await query(
    `SELECT m.*, t.plate AS truck_plate
     FROM maintenance m
     LEFT JOIN trucks t ON t.id = m.truck_id AND t.tenant_id = m.tenant_id
     WHERE m.id = $1 AND m.tenant_id = $2`,
    [id, tenant_id],
  )
  if (result.rows.length === 0) throw new NotFoundError('Maintenance record not found')
  return result.rows[0]
}

export const create = async (tenant_id: string, data: Record<string, unknown>) => {
  const columns: string[] = ['tenant_id']
  const values: unknown[] = [tenant_id]
  const placeholders: string[] = ['$1']
  let idx = 2

  const allowed = [
    'truck_id',
    'type',
    'description',
    'scheduled_date',
    'completed_date',
    'odometer_at_km',
    'cost',
    'provider',
    'status',
    'notes',
  ]

  for (const field of allowed) {
    if (data[field] !== undefined) {
      columns.push(field)
      values.push(data[field])
      placeholders.push(`$${idx++}`)
    }
  }

  const result = await query(
    `INSERT INTO maintenance (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values,
  )
  return result.rows[0]
}

export const update = async (tenant_id: string, id: number, data: Record<string, unknown>) => {
  const existing = await query('SELECT id FROM maintenance WHERE id = $1 AND tenant_id = $2', [id, tenant_id])
  if (existing.rows.length === 0) throw new NotFoundError('Maintenance record not found')

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  const allowed = [
    'truck_id',
    'type',
    'description',
    'scheduled_date',
    'completed_date',
    'odometer_at_km',
    'cost',
    'provider',
    'status',
    'notes',
  ]

  for (const field of allowed) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${idx++}`)
      values.push(data[field])
    }
  }

  if (sets.length === 0) return existing.rows[0]

  values.push(id, tenant_id)
  const result = await query(
    `UPDATE maintenance SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
    values,
  )
  return result.rows[0]
}

export const remove = async (tenant_id: string, id: number) => {
  const result = await query('DELETE FROM maintenance WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenant_id])
  if (result.rows.length === 0) throw new NotFoundError('Maintenance record not found')
}

export const getUpcoming = async (tenant_id: string, days = 30) => {
  const result = await query(
    `SELECT m.*, t.plate AS truck_plate
     FROM maintenance m
     LEFT JOIN trucks t ON t.id = m.truck_id AND t.tenant_id = m.tenant_id
     WHERE m.tenant_id = $1 AND m.status = 'scheduled' AND m.scheduled_date <= NOW() + INTERVAL '1 day' * $2 AND m.scheduled_date >= NOW()
     ORDER BY m.scheduled_date ASC`,
    [tenant_id, days],
  )
  return result.rows
}
