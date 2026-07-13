import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import { BaseJob, type JobContext, type JobResult } from '../shared/job.js';
import cron from 'node-cron';

interface TenantWithReport {
  id: string;
  name: string;
  config: Record<string, unknown> | null;
}

interface ReportDataRow {
  total_trips: number;
  completed_trips: number;
  in_progress_trips: number;
  delayed_trips: number;
  total_distance_km: number;
  avg_duration_hours: number;
  total_alerts: number;
  critical_alerts: number;
  emergency_alerts: number;
  total_trucks: number;
  active_trucks: number;
  in_maintenance: number;
  overdue_maintenance: number;
  expiring_docs: number;
}

interface Report {
  title: string;
  type: 'daily' | 'weekly' | 'monthly';
  generated_at: string;
  period: { from: string; to: string };
  data: ReportDataRow;
}

async function getTenantsWithAutoReport(): Promise<TenantWithReport[]> {
  const { rows } = await pool.query<TenantWithReport>(`
    SELECT id, name, config
    FROM tenants
    WHERE active = true
      AND config->'auto_report' IS NOT NULL
      AND config->'auto_report'->>'enabled' = 'true'
  `);
  return rows;
}

async function queryReportData(tenantId: string, since: Date): Promise<ReportDataRow> {
  const { rows } = await pool.query<ReportDataRow>(`
    WITH trip_stats AS (
      SELECT
        COUNT(*)::int AS total_trips,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_trips,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_trips,
        COUNT(*) FILTER (WHERE status = 'delayed')::int AS delayed_trips,
        COALESCE(SUM(distance_km) FILTER (WHERE status = 'completed'), 0)::float AS total_distance,
        COALESCE(AVG(
          EXTRACT(EPOCH FROM (actual_arrival_at - departure_at)) / 3600
        ) FILTER (WHERE status = 'completed' AND actual_arrival_at IS NOT NULL), 0)::float AS avg_duration_h
      FROM trips
      WHERE tenant_id = $1
        AND created_at >= $2
    ),
    alert_stats AS (
      SELECT
        COUNT(*)::int AS total_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'emergency')::int AS emergency_alerts
      FROM alerts
      WHERE tenant_id = $1
        AND created_at >= $2
    ),
    fleet_stats AS (
      SELECT
        COUNT(*)::int AS total_trucks,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_trucks,
        COUNT(*) FILTER (WHERE status = 'in_maintenance')::int AS in_maintenance
      FROM trucks
      WHERE tenant_id = $1
    ),
    maintenance_count AS (
      SELECT COUNT(*)::int AS overdue_maintenance
      FROM maintenance
      WHERE tenant_id = $1
        AND status IN ('scheduled', 'in_progress')
        AND scheduled_date <= NOW()
    ),
    expiring_docs AS (
      SELECT COUNT(*)::int AS expiring_docs
      FROM documents
      WHERE tenant_id = $1
        AND status = 'active'
        AND expiry_date IS NOT NULL
        AND expiry_date <= NOW() + INTERVAL '30 days'
    )
    SELECT
      COALESCE(ts.total_trips, 0) AS total_trips,
      COALESCE(ts.completed_trips, 0) AS completed_trips,
      COALESCE(ts.in_progress_trips, 0) AS in_progress_trips,
      COALESCE(ts.delayed_trips, 0) AS delayed_trips,
      COALESCE(ts.total_distance, 0) AS total_distance_km,
      COALESCE(ts.avg_duration_h, 0) AS avg_duration_hours,
      COALESCE(ast.total_alerts, 0) AS total_alerts,
      COALESCE(ast.critical_alerts, 0) AS critical_alerts,
      COALESCE(ast.emergency_alerts, 0) AS emergency_alerts,
      COALESCE(fs.total_trucks, 0) AS total_trucks,
      COALESCE(fs.active_trucks, 0) AS active_trucks,
      COALESCE(fs.in_maintenance, 0) AS in_maintenance,
      COALESCE(mc.overdue_maintenance, 0) AS overdue_maintenance,
      COALESCE(ed.expiring_docs, 0) AS expiring_docs
    FROM trip_stats ts
    CROSS JOIN alert_stats ast
    CROSS JOIN fleet_stats fs
    CROSS JOIN maintenance_count mc
    CROSS JOIN expiring_docs ed
  `, [tenantId, since.toISOString()]);

  return rows[0];
}

function generateDailyReport(_tenantId: string, tenantName: string): Report {
  const since = new Date();
  since.setDate(since.getDate() - 1);
  return {
    title: `Daily Report - ${tenantName}`,
    type: 'daily',
    generated_at: new Date().toISOString(),
    period: { from: since.toISOString(), to: new Date().toISOString() },
    data: null as unknown as ReportDataRow,
  };
}

function generateWeeklyReport(_tenantId: string, tenantName: string): Report {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  return {
    title: `Weekly Report - ${tenantName}`,
    type: 'weekly',
    generated_at: new Date().toISOString(),
    period: { from: since.toISOString(), to: new Date().toISOString() },
    data: null as unknown as ReportDataRow,
  };
}

function generateMonthlyReport(_tenantId: string, tenantName: string): Report {
  const since = new Date();
  since.setMonth(since.getMonth() - 1);
  return {
    title: `Monthly Report - ${tenantName}`,
    type: 'monthly',
    generated_at: new Date().toISOString(),
    period: { from: since.toISOString(), to: new Date().toISOString() },
    data: null as unknown as ReportDataRow,
  };
}

async function saveReport(tenantId: string, report: Report): Promise<{ id: number }> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO reports (tenant_id, title, type, data, generated_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())
     RETURNING id`,
    [tenantId, report.title, report.type, JSON.stringify(report)]
  );
  return rows[0];
}

async function notifyAdmins(tenantId: string, reportTitle: string): Promise<void> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM users WHERE tenant_id = $1 AND role IN ('admin', 'superadmin')`,
    [tenantId]
  );
  for (const user of rows) {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, tenant_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user.id, `Report ready: ${reportTitle}`, `The ${reportTitle} has been generated and is available for review.`, 'report_ready', tenantId]
    );
  }
}

class ReportGeneratorJob extends BaseJob {
  readonly name = 'report-generator';

  async execute(_ctx: JobContext): Promise<JobResult> {
    const tenants = await getTenantsWithAutoReport();
    if (!tenants.length) {
      return { success: true, processed: 0, errors: 0, duration: 0 };
    }

    let processed = 0;
    let errors = 0;

    for (const tenant of tenants) {
      try {
        const cfg = (tenant.config as Record<string, unknown>)?.auto_report as Record<string, unknown> || {};
        const frequency = (cfg.frequency as string) || 'daily';
        const now = new Date();

        let report: Report;
        switch (frequency) {
          case 'daily':
            report = generateDailyReport(tenant.id, tenant.name);
            report.data = await queryReportData(tenant.id, new Date(report.period.from));
            break;
          case 'weekly':
            if (now.getDay() !== 1) continue;
            report = generateWeeklyReport(tenant.id, tenant.name);
            report.data = await queryReportData(tenant.id, new Date(report.period.from));
            break;
          case 'monthly':
            if (now.getDate() !== 1) continue;
            report = generateMonthlyReport(tenant.id, tenant.name);
            report.data = await queryReportData(tenant.id, new Date(report.period.from));
            break;
          default:
            logger.warn(`Unknown report frequency for tenant ${tenant.id}: ${frequency}`);
            continue;
        }

        const saved = await saveReport(tenant.id, report);
        await notifyAdmins(tenant.id, report.title);

        processed++;
        logger.info(`Report generated for tenant ${tenant.name}`, {
          tenant_id: tenant.id,
          report_id: saved.id,
          type: frequency,
        });
      } catch (tenantErr) {
        errors++;
        logger.error(`Report generation failed for tenant ${tenant.id}`, { error: tenantErr });
      }
    }

    return { success: true, processed, errors, duration: 0 };
  }
}

export function startReportGenerator(): void {
  const job = new ReportGeneratorJob();
  cron.schedule('0 1 * * *', () => { job.run().catch(err => logger.error('Report generator cron error', { error: err })); });
  logger.info('Report generator started (daily at 1:00 AM)');
}
