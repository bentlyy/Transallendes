import { query } from '../../shared/db.js'
import { NotFoundError } from '../../utils/errors.js'

export const findByUser = async (tenant_id: string, userId: number) => {
  const result = await query(
    'SELECT * FROM notifications WHERE tenant_id = $1 AND user_id = $2 ORDER BY created_at DESC',
    [tenant_id, userId],
  )
  const unreadResult = await query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE tenant_id = $1 AND user_id = $2 AND read = false',
    [tenant_id, userId],
  )
  return {
    data: result.rows,
    total: result.rows.length,
    unreadCount: unreadResult.rows[0].count,
  }
}

export const markRead = async (tenant_id: string, id: number, userId: number) => {
  const result = await query(
    'UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1 AND tenant_id = $2 AND user_id = $3 RETURNING *',
    [id, tenant_id, userId],
  )
  if (result.rows.length === 0) throw new NotFoundError('Notification not found')
  return result.rows[0]
}

export const markAllRead = async (tenant_id: string, userId: number) => {
  await query(
    'UPDATE notifications SET read = true, read_at = NOW() WHERE tenant_id = $1 AND user_id = $2 AND read = false',
    [tenant_id, userId],
  )
  return { success: true }
}

export const getUnreadCount = async (tenant_id: string, userId: number) => {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE tenant_id = $1 AND user_id = $2 AND read = false',
    [tenant_id, userId],
  )
  return result.rows[0]
}

export const create = async (
  tenant_id: string,
  data: { user_id: number; title: string; body?: string; type?: string; data?: Record<string, unknown> },
) => {
  const { user_id, title, body, type, data: extraData } = data
  const result = await query(
    `INSERT INTO notifications (tenant_id, user_id, title, message, type, data)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [tenant_id, user_id, title, body || null, type || 'info', extraData ? JSON.stringify(extraData) : null],
  )
  return result.rows[0]
}
