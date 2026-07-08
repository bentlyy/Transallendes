// @ts-nocheck
import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import cron from 'node-cron';

async function getTenantsWithAutoReport() {
  const { rows } = await pool.query(`
    SELECT id, name, config
    FROM tenants
    WHERE active = true
      AND config->'auto_report' IS NOT NULL
      AND config->'auto_report'->>'enabled' = 'true'
  `);
  return rows;
}

async function queryReportData(tenantId, since) {
  const { rows } = await pool.query(`
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

async function generateDailyReport(tenantId, tenantName) {
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const data = await queryReportData(tenantId, since);
  return {
    title: `Daily Report - ${tenantName}`,
    type: 'daily',
    generated_at: new Date().toISOString(),
    period: { from: since.toISOString(), to: new Date().toISOString() },
    data,
  };
}

async function generateWeeklyReport(tenantId, tenantName) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const data = await queryReportData(tenantId, since);
  return {
    title: `Weekly Report - ${tenantName}`,
    type: 'weekly',
    generated_at: new Date().toISOString(),
    period: { from: since.toISOString(), to: new Date().toISOString() },
    data,
  };
}

async function generateMonthlyReport(tenantId, tenantName) {
  const since = new Date();
  since.setMonth(since.getMonth() - 1);
  const data = await queryReportData(tenantId, since);
  return {
    title: `Monthly Report - ${tenantName}`,
    type: 'monthly',
    generated_at: new Date().toISOString(),
    period: { from: since.toISOString(), to: new Date().toISOString() },
    data,
  };
}

async function saveReport(tenantId, report) {
  const { rows } = await pool.query(
    `INSERT INTO reports (tenant_id, title, type, data, generated_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())
     RETURNING id`,
    [tenantId, report.title, report.type, JSON.stringify(report)]
  );
  return rows[0];
}

async function notifyAdmins(tenantId, reportTitle) {
  const { rows } = await pool.query(
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

export function startReportGenerator() {
  cron.schedule('0 1 * * *', async () => {
    try {
      const tenants = await getTenantsWithAutoReport();
      if (!tenants.length) return;

      for (const tenant of tenants) {
        try {
          const cfg = tenant.config?.auto_report || {};
          const frequency = cfg.frequency || 'daily';
          const now = new Date();

          let report;
          switch (frequency) {
            case 'daily':
              report = await generateDailyReport(tenant.id, tenant.name);
              break;
            case 'weekly':
              if (now.getDay() !== 1) continue;
              report = await generateWeeklyReport(tenant.id, tenant.name);
              break;
            case 'monthly':
              if (now.getDate() !== 1) continue;
              report = await generateMonthlyReport(tenant.id, tenant.name);
              break;
            default:
              logger.warn(`Unknown report frequency for tenant ${tenant.id}: ${frequency}`);
              continue;
          }

          const saved = await saveReport(tenant.id, report);
          await notifyAdmins(tenant.id, report.title);

          logger.info(`Report generated for tenant ${tenant.name}`, {
            tenant_id: tenant.id,
            report_id: saved.id,
            type: frequency,
          });
        } catch (tenantErr) {
          logger.error(`Report generation failed for tenant ${tenant.id}`, { error: tenantErr });
        }
      }
    } catch (err) {
      logger.error('Report generator error', { error: err });
    }
  });
  logger.info('Report generator started (daily at 1:00 AM)');
}

