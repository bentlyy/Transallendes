import { query } from '../../shared/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

interface BillingFilters {
  status?: string;
  client_id?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const findAll = async (tenant_id: string, filters: BillingFilters = {}) => {
  const conditions: string[] = ['b.tenant_id = $1'];
  const params: unknown[] = [tenant_id];
  let idx = 2;

  if (filters.status) {
    conditions.push(`b.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.client_id) {
    conditions.push(`b.client_id = $${idx++}`);
    params.push(filters.client_id);
  }
  if (filters.from) {
    conditions.push(`b.created_at >= $${idx++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`b.created_at <= $${idx++}`);
    params.push(filters.to);
  }

  const where = conditions.join(' AND ');
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM billing b WHERE ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const dataResult = await query(
    `SELECT b.*, c.name AS client_name
     FROM billing b
     LEFT JOIN clients c ON c.id = b.client_id AND c.tenant_id = b.tenant_id
     WHERE ${where}
     ORDER BY b.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return {
    data: dataResult.rows,
    total,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const findById = async (tenant_id: string, id: number) => {
  const result = await query(
    `SELECT b.*, c.name AS client_name
     FROM billing b
     LEFT JOIN clients c ON c.id = b.client_id AND c.tenant_id = b.tenant_id
     WHERE b.id = $1 AND b.tenant_id = $2`,
    [id, tenant_id]
  );
  if (result.rows.length === 0) throw new NotFoundError('Invoice not found');
  return result.rows[0];
};

export const createInvoice = async (tenant_id: string, data: { client_id: number; trip_ids: number[]; due_date: string; notes?: string | null }) => {
  const { client_id, trip_ids, due_date, notes } = data;

  const tripsResult = await query(
    `SELECT id, cost FROM trips WHERE id = ANY($1) AND tenant_id = $2`,
    [trip_ids, tenant_id]
  );
  if (tripsResult.rows.length === 0) throw new BadRequestError('No valid trips found');

  const total = tripsResult.rows.reduce((sum: number, row: any) => sum + (Number(row.cost) || 0), 0);

  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
  const seqResult = await query(
    `SELECT COUNT(*) FROM billing WHERE tenant_id = $1 AND invoice_number LIKE $2`,
    [tenant_id, `INV-${yearMonth}-%`]
  );
  const seq = parseInt(seqResult.rows[0].count, 10) + 1;
  const invoiceNumber = `INV-${yearMonth}-${String(seq).padStart(4, '0')}`;

  const result = await query(
    `INSERT INTO billing (tenant_id, client_id, invoice_number, total, due_date, notes, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
    [tenant_id, client_id, invoiceNumber, total, due_date, notes || null]
  );

  const invoice = result.rows[0];

  for (const tripId of trip_ids) {
    await query(
      `UPDATE trips SET billing_status = 'invoiced', invoice_id = $1 WHERE id = $2 AND tenant_id = $3`,
      [invoice.id, tripId, tenant_id]
    );
  }

  return invoice;
};

export const updateStatus = async (tenant_id: string, id: number, data: { status: string; notes?: string | null; paid_at?: string | null }) => {
  const existing = await query('SELECT id FROM billing WHERE id = $1 AND tenant_id = $2', [id, tenant_id]);
  if (existing.rows.length === 0) throw new NotFoundError('Invoice not found');

  const sets: string[] = [`status = $1`];
  const values: unknown[] = [data.status];
  let idx = 2;

  if (data.status === 'paid') {
    sets.push(`paid_at = COALESCE($${idx}::timestamptz, NOW())`);
    values.push(data.paid_at || null);
    idx++;
  }

  if (data.notes !== undefined) {
    sets.push(`notes = $${idx++}`);
    values.push(data.notes);
  }

  values.push(id, tenant_id);
  const result = await query(
    `UPDATE billing SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
    values
  );
  return result.rows[0];
};

export const getStats = async (tenant_id: string) => {
  const byStatus = await query(
    `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS amount
     FROM billing WHERE tenant_id = $1 GROUP BY status`,
    [tenant_id]
  );

  const pending = await query(
    `SELECT COALESCE(SUM(total), 0) AS amount FROM billing WHERE tenant_id = $1 AND status = 'pending'`,
    [tenant_id]
  );

  const overdue = await query(
    `SELECT COALESCE(SUM(total), 0) AS amount FROM billing WHERE tenant_id = $1 AND status = 'overdue'`,
    [tenant_id]
  );

  return {
    byStatus: byStatus.rows,
    pendingAmount: parseFloat(pending.rows[0].amount),
    overdueAmount: parseFloat(overdue.rows[0].amount),
  };
};
