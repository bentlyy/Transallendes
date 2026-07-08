// @ts-nocheck
import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import cron from 'node-cron';

async function pendingToInProgress() {
  const { rows } = await pool.query(`
    UPDATE trips
    SET status = 'in_progress', updated_at = NOW()
    WHERE status = 'pending'
      AND departure_at <= NOW()
    RETURNING id, trip_number, driver_id, truck_id, tenant_id
  `);
  return rows;
}

async function inProgressToCompleted() {
  const { rows } = await pool.query(`
    UPDATE trips
    SET status = 'completed', updated_at = NOW()
    WHERE status = 'in_progress'
      AND actual_arrival_at <= NOW()
      AND actual_arrival_at IS NOT NULL
    RETURNING id, trip_number, driver_id, truck_id, tenant_id
  `);
  return rows;
}

async function markDelayed() {
  const { rows } = await pool.query(`
    UPDATE trips
    SET status = 'delayed', updated_at = NOW()
    WHERE status = 'in_progress'
      AND estimated_arrival_at IS NOT NULL
      AND estimated_arrival_at + INTERVAL '2 hours' <= NOW()
    RETURNING id, trip_number, driver_id, truck_id, tenant_id, estimated_arrival_at
  `);
  return rows;
}

async function createNotification(tenantId, userId, title, message) {
  if (!userId) return;
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, title, message, 'trip_update', tenantId]
  );
}

async function createAlert(tenantId, data) {
  await pool.query(
    `INSERT INTO alerts
       (type, severity, title, message, resource_type, resource_id,
        truck_id, driver_id, trip_id, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      data.type, data.severity, data.title, data.message,
      data.resource_type ?? 'trip', data.resource_id ?? null,
      data.truck_id ?? null, data.driver_id ?? null,
      data.trip_id ?? null, tenantId,
    ]
  );
}

async function getDriverUserId(driverId) {
  if (!driverId) return null;
  const { rows } = await pool.query(
    'SELECT user_id FROM drivers WHERE id = $1',
    [driverId]
  );
  return rows[0]?.user_id ?? null;
}

export function startTripUpdate() {
  cron.schedule('*/60 * * * * *', async () => {
    try {
      const started = await pendingToInProgress();
      for (const trip of started) {
        const userId = await getDriverUserId(trip.driver_id);
        await createNotification(
          trip.tenant_id,
          userId,
          `Trip ${trip.trip_number} started`,
          `Trip ${trip.trip_number} has automatically started.`,
        );
        logger.info(`Trip auto-started: ${trip.trip_number}`, { trip_id: trip.id });
      }

      const completed = await inProgressToCompleted();
      for (const trip of completed) {
        const userId = await getDriverUserId(trip.driver_id);
        await createNotification(
          trip.tenant_id,
          userId,
          `Trip ${trip.trip_number} completed`,
          `Trip ${trip.trip_number} has automatically completed.`,
        );
        logger.info(`Trip auto-completed: ${trip.trip_number}`, { trip_id: trip.id });
      }

      const delayed = await markDelayed();
      for (const trip of delayed) {
        await createAlert(trip.tenant_id, {
          type: 'trip_delayed',
          severity: 'warning',
          title: `Trip ${trip.trip_number} delayed`,
          message: `Trip ${trip.trip_number} is delayed past estimated arrival (${trip.estimated_arrival_at}).`,
          resource_type: 'trip',
          resource_id: trip.id,
          truck_id: trip.truck_id ?? null,
          driver_id: trip.driver_id ?? null,
          trip_id: trip.id,
        });
        logger.warn(`Trip auto-delayed: ${trip.trip_number}`, { trip_id: trip.id });
      }
    } catch (err) {
      logger.error('Trip update error', { error: err });
    }
  });
  logger.info('Trip update started (every 60s)');
}

