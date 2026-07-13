import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import { BaseJob, type JobContext, type JobResult } from '../shared/job.js';
import cron from 'node-cron';

interface DocumentRow {
  id: number;
  name: string;
  type: string;
  expiry_date: string;
  resource_type: string;
  resource_id: number;
  tenant_id: string;
}

interface AlertCreateData {
  type: string;
  severity: string;
  title: string;
  message: string;
  resource_type: string;
  resource_id: number;
}

async function getExpiringDocuments(): Promise<DocumentRow[]> {
  const { rows } = await pool.query<DocumentRow>(`
    SELECT id, name, type, expiry_date, resource_type, resource_id, tenant_id
    FROM documents
    WHERE status = 'active'
      AND expiry_date IS NOT NULL
      AND expiry_date <= NOW() + INTERVAL '30 days'
    ORDER BY expiry_date ASC
  `);
  return rows;
}

async function createAlert(tenantId: string, data: AlertCreateData): Promise<void> {
  await pool.query(
    `INSERT INTO alerts
       (type, severity, title, description, resource_type, resource_id, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      data.type, data.severity, data.title, data.message,
      data.resource_type ?? 'document', data.resource_id ?? null,
      tenantId,
    ]
  );
}

async function createNotification(tenantId: string, userId: number | null, title: string, message: string): Promise<void> {
  if (!userId) return;
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, title, message, 'document_expiry', tenantId]
  );
}

async function getRelatedUserIds(document: DocumentRow): Promise<number[]> {
  const userIds: number[] = [];

  if (document.resource_type === 'truck') {
    const { rows } = await pool.query<{ user_id: number }>(
      `SELECT d.user_id FROM drivers d
       JOIN trucks t ON t.driver_id = d.id AND t.tenant_id = d.tenant_id
       WHERE t.id = $1 AND t.tenant_id = $2 AND d.user_id IS NOT NULL`,
      [document.resource_id, document.tenant_id]
    );
    for (const r of rows) userIds.push(r.user_id);
  }

  if (document.resource_type === 'driver') {
    const { rows } = await pool.query<{ user_id: number }>(
      'SELECT user_id FROM drivers WHERE id = $1 AND tenant_id = $2 AND user_id IS NOT NULL',
      [document.resource_id, document.tenant_id]
    );
    for (const r of rows) userIds.push(r.user_id);
  }

  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM users
     WHERE tenant_id = $1 AND role IN ('admin', 'superadmin')`,
    [document.tenant_id]
  );
  for (const r of rows) userIds.push(r.id);

  return [...new Set(userIds)];
}

async function alertExists(docId: number, tenantId: string): Promise<boolean> {
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

class DocumentExpiryJob extends BaseJob {
  readonly name = 'document-expiry';

  async execute(_ctx: JobContext): Promise<JobResult> {
    const documents = await getExpiringDocuments();
    if (!documents.length) {
      return { success: true, processed: 0, errors: 0, duration: 0 };
    }

    let processed = 0;
    let errors = 0;

    for (const doc of documents) {
      try {
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

        processed++;
      } catch (err) {
        errors++;
        logger.error('Document expiry failed for document', { error: err, document_id: doc.id });
      }
    }

    logger.info(`Document expiry checks sent for ${documents.length} documents`);
    return { success: true, processed, errors, duration: 0 };
  }
}

export function startDocumentExpiry(): void {
  const job = new DocumentExpiryJob();
  cron.schedule('0 */6 * * *', () => { job.run().catch(err => logger.error('Document expiry cron error', { error: err })); });
  logger.info('Document expiry started (every 6h)');
}
