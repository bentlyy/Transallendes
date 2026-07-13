import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import { BaseJob, type JobContext, type JobResult } from '../shared/job.js';
import cron from 'node-cron';

interface MaintenanceRow {
  id: number;
  truck_id: number;
  type: string;
  description: string | null;
  scheduled_date: string;
  tenant_id: string;
  license_plate: string;
  driver_id: number | null;
  driver_user_id: number | null;
}

interface UserRow {
  id: number;
}

async function getUpcomingMaintenance(): Promise<MaintenanceRow[]> {
  const { rows } = await pool.query<MaintenanceRow>(`
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

async function createNotification(tenantId: string, userId: number | null, title: string, message: string): Promise<void> {
  if (!userId) return;
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, title, message, 'maintenance_reminder', tenantId]
  );
}

interface AlertCreateData {
  type: string;
  severity: string;
  title: string;
  message: string;
  resource_type: string;
  resource_id: number;
  truck_id: number | null;
  driver_id: number | null;
}

async function createAlert(tenantId: string, data: AlertCreateData): Promise<void> {
  await pool.query(
    `INSERT INTO alerts
       (type, severity, title, description, resource_type, resource_id,
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

async function getAdminUsers(tenantId: string): Promise<UserRow[]> {
  const { rows } = await pool.query<UserRow>(
    `SELECT id FROM users
     WHERE tenant_id = $1 AND role IN ('admin', 'superadmin')`,
    [tenantId]
  );
  return rows;
}

class MaintenanceReminderJob extends BaseJob {
  readonly name = 'maintenance-reminder';

  async execute(_ctx: JobContext): Promise<JobResult> {
    const records = await getUpcomingMaintenance();
    if (!records.length) {
      return { success: true, processed: 0, errors: 0, duration: 0 };
    }

    const tenantAdminCache: Record<string, UserRow[]> = {};
    let processed = 0;
    let errors = 0;

    for (const rec of records) {
      try {
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

        processed++;
      } catch (err) {
        errors++;
        logger.error('Maintenance reminder failed for record', { error: err, record_id: rec.id });
      }
    }

    logger.info(`Maintenance reminders sent for ${records.length} records`);
    return { success: true, processed, errors, duration: 0 };
  }
}

export function startMaintenanceReminder(): void {
  const job = new MaintenanceReminderJob();
  cron.schedule('0 */6 * * *', () => { job.run().catch(err => logger.error('Maintenance reminder cron error', { error: err })); });
  logger.info('Maintenance reminder started (every 6h)');
}
