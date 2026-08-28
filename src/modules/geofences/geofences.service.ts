import { pool } from '../../shared/db.js'
import { NotFoundError } from '../../utils/errors.js'

export async function findAll(tenant_id: string) {
  const result = await pool.query('SELECT * FROM geofences WHERE tenant_id = $1 ORDER BY name ASC', [tenant_id])
  return { data: result.rows, total: result.rows.length }
}

export async function findById(tenant_id: string, id: number) {
  const result = await pool.query('SELECT * FROM geofences WHERE tenant_id = $1 AND id = $2', [tenant_id, id])

  if (!result.rows.length) {
    throw new NotFoundError(`Geocerca con id ${id} no encontrada`)
  }

  return result.rows[0]
}

export async function create(tenant_id: string, data: any) {
  const result = await pool.query(
    `INSERT INTO geofences (
       name, type, center_lat, center_lng, radius_meters,
       polygon_points, country, city, color, active, tenant_id, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
     RETURNING *`,
    [
      data.name,
      data.type,
      data.center_lat ?? null,
      data.center_lng ?? null,
      data.radius_meters ?? null,
      data.polygon_points ? JSON.stringify(data.polygon_points) : null,
      data.country ?? null,
      data.city ?? null,
      data.color ?? null,
      data.active ?? true,
      tenant_id,
    ],
  )

  return result.rows[0]
}

export async function update(tenant_id: string, id: number, data: any) {
  const fields: string[] = []
  const params: any[] = []
  let idx = 1

  const allowed = [
    'name',
    'type',
    'center_lat',
    'center_lng',
    'radius_meters',
    'polygon_points',
    'country',
    'city',
    'color',
    'active',
  ]

  for (const field of allowed) {
    if (data[field] !== undefined) {
      const val = field === 'polygon_points' ? JSON.stringify(data[field]) : data[field]
      fields.push(`${field} = $${idx++}`)
      params.push(val)
    }
  }

  if (!fields.length) {
    return findById(tenant_id, id)
  }

  fields.push('updated_at = NOW()')
  params.push(tenant_id, id)

  const result = await pool.query(
    `UPDATE geofences SET ${fields.join(', ')} WHERE tenant_id = $${idx} AND id = $${idx + 1} RETURNING *`,
    params,
  )

  if (!result.rows.length) {
    throw new NotFoundError(`Geocerca con id ${id} no encontrada`)
  }

  return result.rows[0]
}

export async function remove(tenant_id: string, id: number) {
  const result = await pool.query('DELETE FROM geofences WHERE tenant_id = $1 AND id = $2 RETURNING id', [
    tenant_id,
    id,
  ])

  if (!result.rows.length) {
    throw new NotFoundError(`Geocerca con id ${id} no encontrada`)
  }
}

export async function findNearby(tenant_id: string, lat: number, lng: number, radius_meters: number) {
  const result = await pool.query(
    `SELECT *, (
       6371000 * ACOS(
         COS(RADIANS($1)) * COS(RADIANS(center_lat)) *
         COS(RADIANS(center_lng) - RADIANS($2)) +
         SIN(RADIANS($1)) * SIN(RADIANS(center_lat))
       )
     ) AS distance_meters
     FROM geofences
     WHERE tenant_id = $3
       AND active = true
       AND type = 'circle'
       AND center_lat IS NOT NULL
       AND center_lng IS NOT NULL
     HAVING distance_meters <= $4
     ORDER BY distance_meters ASC`,
    [lat, lng, tenant_id, radius_meters],
  )

  return result.rows
}
