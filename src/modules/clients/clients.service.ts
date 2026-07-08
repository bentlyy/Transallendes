import { query } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';

interface ClientFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const findAll = async (tenant_id: string, filters: ClientFilters = {}) => {
  const conditions: string[] = ['c.tenant_id = $1'];
  const params: unknown[] = [tenant_id];
  let idx = 2;

  if (filters.status) {
    conditions.push(`c.status = $${idx++}`);
    params.push(filters.status);
  }

  if (filters.search) {
    conditions.push(`(c.name ILIKE $${idx} OR c.rut ILIKE $${idx} OR c.email ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM clients c WHERE ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const dataResult = await query(
    `SELECT c.* FROM clients c WHERE ${where} ORDER BY c.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return {
    data: dataResult.rows,
    total,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const findById = async (tenant_id: string, id: number) => {
  const result = await query('SELECT * FROM clients WHERE id = $1 AND tenant_id = $2', [id, tenant_id]);
  if (result.rows.length === 0) throw new NotFoundError('Client not found');
  return result.rows[0];
};

export const create = async (tenant_id: string, data: Record<string, unknown>) => {
  const columns: string[] = ['tenant_id'];
  const values: unknown[] = [tenant_id];
  const placeholders: string[] = ['$1'];
  let idx = 2;

  const allowed = ['name', 'rut', 'email', 'phone', 'address', 'contact_name', 'contact_email', 'contact_phone', 'status', 'config'];

  for (const field of allowed) {
    if (data[field] !== undefined) {
      columns.push(field);
      values.push(data[field]);
      placeholders.push(`$${idx++}`);
    }
  }

  const result = await query(
    `INSERT INTO clients (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );
  return result.rows[0];
};

export const update = async (tenant_id: string, id: number, data: Record<string, unknown>) => {
  const existing = await query('SELECT id FROM clients WHERE id = $1 AND tenant_id = $2', [id, tenant_id]);
  if (existing.rows.length === 0) throw new NotFoundError('Client not found');

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = ['name', 'rut', 'email', 'phone', 'address', 'contact_name', 'contact_email', 'contact_phone', 'status', 'config'];

  for (const field of allowed) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${idx++}`);
      values.push(data[field]);
    }
  }

  if (sets.length === 0) return existing.rows[0];

  values.push(id, tenant_id);
  const result = await query(
    `UPDATE clients SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
    values
  );
  return result.rows[0];
};

export const remove = async (tenant_id: string, id: number) => {
  const result = await query('DELETE FROM clients WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenant_id]);
  if (result.rows.length === 0) throw new NotFoundError('Client not found');
};

export const getClientTrips = async (tenant_id: string, clientId: number) => {
  const client = await query('SELECT id FROM clients WHERE id = $1 AND tenant_id = $2', [clientId, tenant_id]);
  if (client.rows.length === 0) throw new NotFoundError('Client not found');

  const result = await query(
    `SELECT t.* FROM trips t WHERE t.client_id = $1 AND t.tenant_id = $2 ORDER BY t.scheduled_start DESC LIMIT 100`,
    [clientId, tenant_id]
  );
  return result.rows;
};

export const getClientTrucks = async (tenant_id: string, clientId: number) => {
  const client = await query('SELECT id FROM clients WHERE id = $1 AND tenant_id = $2', [clientId, tenant_id]);
  if (client.rows.length === 0) throw new NotFoundError('Client not found');

  const result = await query(
    `SELECT t.* FROM trucks t WHERE t.client_id = $1 AND t.tenant_id = $2 ORDER BY t.created_at DESC`,
    [clientId, tenant_id]
  );
  return result.rows;
};

export const getClientStats = async (tenant_id: string, clientId: number) => {
  const client = await query('SELECT id FROM clients WHERE id = $1 AND tenant_id = $2', [clientId, tenant_id]);
  if (client.rows.length === 0) throw new NotFoundError('Client not found');

  const totalTrips = await query(
    `SELECT COUNT(*) FROM trips WHERE client_id = $1 AND tenant_id = $2`,
    [clientId, tenant_id]
  );

  const tripsByStatus = await query(
    `SELECT status, COUNT(*)::int AS count FROM trips WHERE client_id = $1 AND tenant_id = $2 GROUP BY status`,
    [clientId, tenant_id]
  );

  const activeTrucks = await query(
    `SELECT COUNT(*) FROM trucks WHERE client_id = $1 AND tenant_id = $2 AND status = 'active'`,
    [clientId, tenant_id]
  );

  const revenue = await query(
    `SELECT COALESCE(SUM(b.total), 0) AS total_revenue FROM billing b
     JOIN trips t ON t.id = b.trip_id AND t.tenant_id = b.tenant_id
     WHERE t.client_id = $1 AND t.tenant_id = $2 AND b.status = 'paid'`,
    [clientId, tenant_id]
  );

  return {
    totalTrips: parseInt(totalTrips.rows[0].count, 10),
    tripsByStatus: tripsByStatus.rows,
    activeTrucks: parseInt(activeTrucks.rows[0].count, 10),
    totalRevenue: parseFloat(revenue.rows[0].total_revenue),
  };
};
