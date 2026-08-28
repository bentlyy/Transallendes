import { query } from '../../shared/db.js'
import { NotFoundError } from '../../utils/errors.js'

export const getTenants = async () => {
  const result = await query('SELECT * FROM tenants ORDER BY created_at DESC')
  return { data: result.rows, total: result.rows.length }
}

export const getTenantById = async (id: string) => {
  const result = await query('SELECT * FROM tenants WHERE id = $1', [id])
  if (result.rows.length === 0) throw new NotFoundError('Tenant no encontrado')
  const usersResult = await query('SELECT id, email, name, role FROM users WHERE tenant_id = $1', [id])
  return { ...result.rows[0], users: usersResult.rows }
}

export const createTenant = async (data: Record<string, unknown>) => {
  const columns: string[] = ['id', 'name', 'domain']
  const values: unknown[] = [data.id, data.name, data.domain]
  const placeholders: string[] = ['$1', '$2', '$3']
  let idx = 4

  const allowed = ['locale', 'timezone', 'config']
  for (const field of allowed) {
    if (data[field] !== undefined) {
      columns.push(field)
      values.push(field === 'config' ? JSON.stringify(data[field]) : data[field])
      placeholders.push(`$${idx++}`)
    }
  }

  const result = await query(
    `INSERT INTO tenants (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values,
  )
  return result.rows[0]
}

export const updateTenant = async (id: string, data: Record<string, unknown>) => {
  const existing = await query('SELECT id FROM tenants WHERE id = $1', [id])
  if (existing.rows.length === 0) throw new NotFoundError('Tenant no encontrado')

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  const allowed = ['name', 'domain', 'locale', 'timezone', 'config', 'active']
  for (const field of allowed) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${idx++}`)
      values.push(field === 'config' ? JSON.stringify(data[field]) : data[field])
    }
  }

  if (sets.length === 0) return existing.rows[0]

  values.push(id)
  const result = await query(
    `UPDATE tenants SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    values,
  )
  return result.rows[0]
}

export const deleteTenant = async (id: string) => {
  const result = await query('DELETE FROM tenants WHERE id = $1 RETURNING id', [id])
  if (result.rows.length === 0) throw new NotFoundError('Tenant no encontrado')
}

export const getUsers = async () => {
  const result = await query(
    `SELECT u.id, u.email, u.role, u.name, u.tenant_id, t.name AS tenant_name
     FROM users u
     LEFT JOIN tenants t ON t.id = u.tenant_id
     ORDER BY u.created_at DESC`,
  )
  return { data: result.rows, total: result.rows.length }
}

export const getStats = async () => {
  const tenants = await query(
    'SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE active = true)::int AS active FROM tenants',
  )
  const users = await query('SELECT COUNT(*)::int AS count FROM users')
  const trucks = await query('SELECT COUNT(*)::int AS count FROM trucks')
  const trips = await query('SELECT COUNT(*)::int AS count FROM trips')
  const activeTrips = await query("SELECT COUNT(*)::int AS count FROM trips WHERE status = 'in_progress'")

  return {
    totalTenants: tenants.rows[0].total,
    activeTenants: tenants.rows[0].active,
    totalUsers: users.rows[0].count,
    totalTrucks: trucks.rows[0].count,
    totalTrips: trips.rows[0].count,
    activeTrips: activeTrips.rows[0].count,
  }
}
