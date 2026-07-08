// @ts-nocheck
import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import cron from 'node-cron';

async function getUpcomingMaintenance() {
  const { rows } = await pool.query(`
    SELECT
      m.id, m.truck_id, m.type, m.description, m.scheduled_date, m.tenant_id,
      t.plate AS license_plate, t.driver_id, d.user_id AS driver_user_id
    FROM maintenance m
    JOIN trucks t ON t.id = m.truck_id AND t.tenant_id = m.tenant_id
    LEFT JOIN drivers d ON d.id = t.driver_id AND d.tenant_id = m.tenant_id
    WHERE m.status IN ('scheduled', 'in_progress')
      AND (
        m.scheduled_date <= NOW() + INTERVAL '7 days'
        OR m.scheduled_date <= NOW()
      )
    ORDER BY m.scheduled_date ASC
  `);
  return rows;
}

async function createNotification(tenantId, userId, title, message) {
  if (!userId) return;
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, title, message, 'maintenance_reminder', tenantId]
  );
}

async function createAlert(tenantId, data) {
  await pool.query(
    `INSERT INTO alerts
       (type, severity, title, message, resource_type, resource_id,
        truck_id, driver_id, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [
      data.type, data.severity, data.title, data.message,
      data.resource_type ?? 'maintenance', data.resource_id ?? null,
      data.truck_id ?? null, data.driver_id ?? null,
      tenantId,
    ]
  );
}

async function getAdminUsers(tenantId) {
  const { rows } = await pool.query(
    `SELECT id FROM users
     WHERE tenant_id = $1 AND role IN ('admin', 'superadmin')`,
    [tenantId]
  );
  return rows;
}

export function startMaintenanceReminder() {
  cron.schedule('0 */6 * * *', async () => {
    try {
      const records = await getUpcomingMaintenance();
      if (!records.length) return;

      const tenantAdminCache = {};

      for (const rec of records) {
        const isOverdue = new Date(rec.scheduled_date) <= new Date();
        const daysUntil = Math.ceil(
          (new Date(rec.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const title = isOverdue
          ? `Overdue maintenance: ${rec.description || rec.type} for ${rec.license_plate}`
          : `Upcoming maintenance: ${rec.description || rec.type} for ${rec.license_plate} (${daysUntil}d)`;

        const message = isOverdue
          ? `Maintenance "${rec.description || rec.type}" for truck ${rec.license_plate} was scheduled on ${rec.scheduled_date} and is overdue.`
          : `Maintenance "${rec.description || rec.type}" for truck ${rec.license_plate} is scheduled in ${daysUntil} day(s) on ${rec.scheduled_date}.`;

        if (rec.driver_user_id) {
          await createNotification(rec.tenant_id, rec.driver_user_id, title, message);
        }

        if (isOverdue) {
          await createAlert(rec.tenant_id, {
            type: 'maintenance_overdue',
            severity: 'warning',
            title,
            message,
            resource_type: 'maintenance',
            resource_id: rec.id,
            truck_id: rec.truck_id,
            driver_id: rec.driver_id ?? null,
          });
        }

        if (!tenantAdminCache[rec.tenant_id]) {
          tenantAdminCache[rec.tenant_id] = await getAdminUsers(rec.tenant_id);
        }
        for (const admin of tenantAdminCache[rec.tenant_id]) {
          await createNotification(rec.tenant_id, admin.id, title, message);
        }
      }

      logger.info(`Maintenance reminders sent for ${records.length} records`);
    } catch (err) {
      logger.error('Maintenance reminder error', { error: err });
    }
  });
  logger.info('Maintenance reminder started (every 6h)');
}

