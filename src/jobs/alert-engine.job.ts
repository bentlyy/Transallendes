// @ts-nocheck
import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import cron from 'node-cron';

const ALERT_TYPES = {
  speeding: {
    condition: (pos) => (pos.speed_kmh ?? 0) > 90,
    severity: 'warning',
    titleTemplate: (pos) => `Speeding: ${pos.speed_kmh} km/h on ${pos.license_plate || pos.device_id}`,
  },
  gps_disconnected: {
    condition: (pos, ctx) => {
      const diff = Date.now() - new Date(pos.recorded_at || pos.timestamp).getTime();
      return diff > 5 * 60 * 1000;
    },
    severity: 'critical',
    titleTemplate: (pos) => `GPS disconnected: ${pos.license_plate || pos.device_id} (no data >5 min)`,
  },
  fuel_drop: {
    condition: (pos, ctx) => {
      if (pos.fuel_level == null || !ctx.previous || ctx.previous.fuel_level == null) return false;
      return ctx.previous.fuel_level - pos.fuel_level > 10;
    },
    severity: 'critical',
    titleTemplate: (pos) => `Fuel drop >10% on ${pos.license_plate || pos.device_id}`,
  },
  stopped_too_long: {
    condition: (pos, ctx) => {
      if ((pos.speed_kmh ?? 0) > 0 || !ctx.stopStartTime) return false;
      const stoppedDuration = (Date.now() - ctx.stopStartTime.getTime()) / (1000 * 60 * 60);
      return stoppedDuration >= 2;
    },
    severity: 'warning',
    titleTemplate: (pos) => `Stopped >2h: ${pos.license_plate || pos.device_id}`,
  },
  high_temp: {
    condition: (pos) => {
      if (pos.temperature == null) return false;
      return pos.temperature > (pos.extra?.temp_threshold ?? 70);
    },
    severity: 'warning',
    titleTemplate: (pos) => `High temperature (${pos.temperature}°C) on ${pos.license_plate || pos.device_id}`,
  },
  low_battery: {
    condition: (pos) => {
      if (pos.battery_level == null) return false;
      return pos.battery_level < 10;
    },
    severity: 'warning',
    titleTemplate: (pos) => `Low battery (${pos.battery_level}%) on ${pos.license_plate || pos.device_id}`,
  },
};

async function getActiveTrucksWithPositions() {
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (t.id)
      t.id AS truck_id,
      t.tenant_id,
      t.plate AS license_plate,
      t.gps_device_id,
      t.driver_id,
      gp.id AS position_id,
      gp.latitude,
      gp.longitude,
      gp.speed_kmh,
      gp.ignition,
      gp.fuel_level,
      gp.temperature,
      gp.battery_level,
      gp.odometer_km,
      gp.recorded_at,
      gp.raw_data
    FROM trucks t
    JOIN gps_positions gp ON gp.truck_id = t.id
    WHERE t.status = 'active'
      AND t.gps_device_id IS NOT NULL
    ORDER BY t.id, gp.recorded_at DESC
  `);
  return rows;
}

async function getPreviousPositions(truckIds) {
  if (!truckIds.length) return [];
  const placeholders = truckIds.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (truck_id) *
    FROM gps_positions
    WHERE truck_id IN (${placeholders})
    ORDER BY truck_id, recorded_at DESC
  `, truckIds);
  return rows;
}

async function getStopStartTimes(truckIds) {
  if (!truckIds.length) return {};
  const placeholders = truckIds.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await pool.query(`
    SELECT truck_id, recorded_at, speed_kmh
    FROM gps_positions
    WHERE truck_id IN (${placeholders})
    ORDER BY truck_id, recorded_at DESC
    LIMIT 10
  `, truckIds);

  const result = {};
  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.truck_id]) grouped[row.truck_id] = [];
    grouped[row.truck_id].push(row);
  }
  for (const [truckId, positions] of Object.entries(grouped)) {
    const sorted = positions.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    for (const p of sorted) {
      if ((p.speed_kmh ?? 0) === 0) {
        result[truckId] = { stopStartTime: new Date(p.recorded_at) };
      }
    }
  }
  return result;
}

async function alertExists(type, truckId, tenantId) {
  const { rows } = await pool.query(
    `SELECT id FROM alerts
     WHERE type = $1 AND truck_id = $2 AND tenant_id = $3
       AND created_at > NOW() - INTERVAL '5 minutes'
     LIMIT 1`,
    [type, truckId, tenantId]
  );
  return rows.length > 0;
}

async function createAlert(tenantId, data) {
  await pool.query(
    `INSERT INTO alerts (type, severity, title, description, truck_id, driver_id, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      data.type, data.severity, data.title, data.message ?? data.title,
      data.truck_id ?? null, data.driver_id ?? null,
      tenantId,
    ]
  );
}

export function startAlertEngine() {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const positions = await getActiveTrucksWithPositions();
      if (!positions.length) return;

      const truckIds = [...new Set(positions.map(p => p.truck_id))];
      const currentMap = {};
      for (const p of positions) {
        currentMap[p.truck_id] = currentMap[p.truck_id] || p;
        if (new Date(p.recorded_at) > new Date(currentMap[p.truck_id].recorded_at)) {
          currentMap[p.truck_id] = p;
        }
      }

      const [prevPositions, stopTimes] = await Promise.all([
        getPreviousPositions(truckIds),
        getStopStartTimes(truckIds),
      ]);

      const prevMap = {};
      for (const p of prevPositions) {
        const tid = p.truck_id;
        if (!prevMap[tid] || new Date(p.recorded_at) > new Date(prevMap[tid].recorded_at)) {
          prevMap[tid] = p;
        }
      }

      for (const pos of Object.values(currentMap)) {
        const context = {
          previous: prevMap[pos.truck_id] || null,
          stopStartTime: stopTimes[pos.truck_id]?.stopStartTime || null,
        };

        for (const [typeName, rule] of Object.entries(ALERT_TYPES)) {
          try {
            if (!rule.condition(pos, context)) continue;
            if (await alertExists(typeName, pos.truck_id, pos.tenant_id)) continue;

            const title = rule.titleTemplate(pos);
            await createAlert(pos.tenant_id, {
              type: typeName,
              severity: rule.severity,
              title,
              message: title,
              resource_type: 'truck',
              resource_id: pos.truck_id,
              truck_id: pos.truck_id,
              driver_id: pos.driver_id ?? null,
            });
            logger.warn(`Alert triggered: ${typeName}`, { truck_id: pos.truck_id, tenant_id: pos.tenant_id });
          } catch (ruleErr) {
            logger.error(`Alert rule ${typeName} failed`, { error: ruleErr, truck_id: pos.truck_id });
          }
        }
      }
    } catch (err) {
      logger.error('Alert engine error', { error: err });
    }
  });
  logger.info('Alert engine started (every 30s)');
}
