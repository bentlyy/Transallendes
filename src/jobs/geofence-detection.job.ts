// @ts-nocheck
import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import cron from 'node-cron';

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInCircle(lat, lng, centerLat, centerLng, radiusM) {
  return haversineDistance(lat, lng, centerLat, centerLng) <= radiusM;
}

async function getActiveGeofences() {
  const { rows } = await pool.query(`
    SELECT id, name, type, center_lat, center_lng, radius_meters,
           tenant_id
    FROM geofences
    WHERE active = true
  `);
  return rows;
}

async function getLatestPositions() {
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (gp.truck_id)
      gp.truck_id, gp.tenant_id, gp.latitude, gp.longitude,
      gp.speed_kmh, gp.recorded_at, t.driver_id
    FROM gps_positions gp
    JOIN trucks t ON t.id = gp.truck_id AND t.tenant_id = gp.tenant_id
    WHERE t.status = 'active'
    ORDER BY gp.truck_id, gp.recorded_at DESC
  `);
  return rows;
}

async function getGeofenceStates() {
  const { rows } = await pool.query(`
    SELECT truck_id, geofence_id, inside
    FROM truck_geofence_states
  `);
  return rows;
}

async function upsertGeofenceState(truckId, geofenceId, inside) {
  await pool.query(
    `INSERT INTO truck_geofence_states (truck_id, geofence_id, inside, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (truck_id, geofence_id)
     DO UPDATE SET inside = $3, updated_at = NOW()`,
    [truckId, geofenceId, inside]
  );
}

async function alertExistsForGeofence(truckId, geofenceId, eventType, tenantId) {
  const { rows } = await pool.query(
    `SELECT id FROM alerts
     WHERE truck_id = $1 AND geofence_id = $2 AND type = $3 AND tenant_id = $4
       AND created_at > NOW() - INTERVAL '5 minutes'
     LIMIT 1`,
    [truckId, geofenceId, eventType, tenantId]
  );
  return rows.length > 0;
}

async function createAlert(tenantId, data) {
  await pool.query(
    `INSERT INTO alerts
       (type, severity, title, message, resource_type, resource_id,
        truck_id, driver_id, geofence_id, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      data.type, data.severity, data.title, data.message,
      data.resource_type ?? 'geofence', data.resource_id ?? null,
      data.truck_id ?? null, data.driver_id ?? null,
      data.geofence_id ?? null, tenantId,
    ]
  );
}

// Ensure the truck_geofence_states table exists on first run
async function ensureStateTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS truck_geofence_states (
      truck_id INT NOT NULL,
      geofence_id INT NOT NULL,
      inside BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (truck_id, geofence_id)
    )
  `);
}

export function startGeofenceDetection() {
  cron.schedule('*/60 * * * * *', async () => {
    try {
      await ensureStateTable();

      const [geofences, positions, states] = await Promise.all([
        getActiveGeofences(),
        getLatestPositions(),
        getGeofenceStates(),
      ]);

      if (!geofences.length || !positions.length) return;

      const stateMap = {};
      for (const s of states) {
        stateMap[`${s.truck_id}:${s.geofence_id}`] = s.inside;
      }

      const circleGeofences = geofences.filter(
        (g) => g.type === 'circle' && g.center_lat != null && g.center_lng != null && g.radius_meters != null
      );

      for (const pos of positions) {
        for (const gf of circleGeofences) {
          if (pos.tenant_id !== gf.tenant_id) continue;

          const isInside = pointInCircle(
            pos.latitude, pos.longitude,
            gf.center_lat, gf.center_lng,
            gf.radius_meters
          );

          const key = `${pos.truck_id}:${gf.id}`;
          const wasInside = stateMap[key] ?? false;

          await upsertGeofenceState(pos.truck_id, gf.id, isInside);

          if (isInside && !wasInside && gf.alert_on_entry) {
            if (await alertExistsForGeofence(pos.truck_id, gf.id, 'geofence_enter', pos.tenant_id)) continue;
            await createAlert(pos.tenant_id, {
              type: 'geofence_enter',
              severity: 'info',
              title: `Truck entered geofence: ${gf.name}`,
              message: `Truck entered geofence "${gf.name}"`,
              resource_type: 'geofence',
              resource_id: gf.id,
              truck_id: pos.truck_id,
              driver_id: pos.driver_id ?? null,
              geofence_id: gf.id,
            });
            logger.info(`Geofence enter: truck ${pos.truck_id} -> ${gf.name}`);
          }

          if (!isInside && wasInside && gf.alert_on_exit) {
            if (await alertExistsForGeofence(pos.truck_id, gf.id, 'geofence_exit', pos.tenant_id)) continue;
            await createAlert(pos.tenant_id, {
              type: 'geofence_exit',
              severity: 'info',
              title: `Truck exited geofence: ${gf.name}`,
              message: `Truck exited geofence "${gf.name}"`,
              resource_type: 'geofence',
              resource_id: gf.id,
              truck_id: pos.truck_id,
              driver_id: pos.driver_id ?? null,
              geofence_id: gf.id,
            });
            logger.info(`Geofence exit: truck ${pos.truck_id} -> ${gf.name}`);
          }
        }
      }
    } catch (err) {
      logger.error('Geofence detection error', { error: err });
    }
  });
  logger.info('Geofence detection started (every 60s)');
}

