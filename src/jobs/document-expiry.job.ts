// @ts-nocheck
import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import cron from 'node-cron';

async function getExpiringDocuments() {
  const { rows } = await pool.query(`
    SELECT id, name, type, expiry_date, resource_type, resource_id, tenant_id
    FROM documents
    WHERE status = 'active'
      AND expiry_date IS NOT NULL
      AND expiry_date <= NOW() + INTERVAL '30 days'
    ORDER BY expiry_date ASC
  `);
  return rows;
}

async function createAlert(tenantId, data) {
  await pool.query(
    `INSERT INTO alerts
       (type, severity, title, message, resource_type, resource_id, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      data.type, data.severity, data.title, data.message,
      data.resource_type ?? 'document', data.resource_id ?? null,
      tenantId,
    ]
  );
}

async function createNotification(tenantId, userId, title, message) {
  if (!userId) return;
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, title, message, 'document_expiry', tenantId]
  );
}

async function getRelatedUserIds(document) {
  const userIds = [];

  if (document.resource_type === 'truck') {
    const { rows } = await pool.query(
      `SELECT d.user_id FROM drivers d
       JOIN trucks t ON t.driver_id = d.id AND t.tenant_id = d.tenant_id
       WHERE t.id = $1 AND t.tenant_id = $2 AND d.user_id IS NOT NULL`,
      [document.resource_id, document.tenant_id]
    );
    for (const r of rows) userIds.push(r.user_id);
  }

  if (document.resource_type === 'driver') {
    const { rows } = await pool.query(
      'SELECT user_id FROM drivers WHERE id = $1 AND tenant_id = $2 AND user_id IS NOT NULL',
      [document.resource_id, document.tenant_id]
    );
    for (const r of rows) userIds.push(r.user_id);
  }

  const { rows } = await pool.query(
    `SELECT id FROM users
     WHERE tenant_id = $1 AND role IN ('admin', 'superadmin')`,
    [document.tenant_id]
  );
  for (const r of rows) userIds.push(r.id);

  return [...new Set(userIds)];
}

async function alertExists(docId, tenantId) {
  const { rows } = await pool.query(
    `SELECT id FROM alerts
     WHERE resource_type = 'document' AND resource_id = $1 AND tenant_id = $2
       AND type = 'document_expiring'
       AND created_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [docId, tenantId]
  );
  return rows.length > 0;
}

export function startDocumentExpiry() {
  cron.schedule('0 */6 * * *', async () => {
    try {
      const documents = await getExpiringDocuments();
      if (!documents.length) return;

      for (const doc of documents) {
        const isExpired = new Date(doc.expiry_date) <= new Date();
        const daysUntil = Math.ceil(
          (new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const title = isExpired
          ? `Document expired: ${doc.name} (${doc.type})`
          : `Document expiring soon: ${doc.name} (${doc.type}) in ${daysUntil}d`;

        const message = isExpired
          ? `Document "${doc.name}" (${doc.type}) expired on ${doc.expiry_date}.`
          : `Document "${doc.name}" (${doc.type}) expires on ${doc.expiry_date} (${daysUntil} day(s)).`;

        if (await alertExists(doc.id, doc.tenant_id)) continue;

        await createAlert(doc.tenant_id, {
          type: 'document_expiring',
          severity: isExpired ? 'critical' : 'warning',
          title,
          message,
          resource_type: 'document',
          resource_id: doc.id,
        });

        const userIds = await getRelatedUserIds(doc);
        for (const uid of userIds) {
          await createNotification(doc.tenant_id, uid, title, message);
        }
      }

      logger.info(`Document expiry checks sent for ${documents.length} documents`);
    } catch (err) {
      logger.error('Document expiry error', { error: err });
    }
  });
  logger.info('Document expiry started (every 6h)');
}
