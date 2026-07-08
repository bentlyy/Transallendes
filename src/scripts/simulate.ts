import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';

interface TripRow {
  id: number;
  truck_id: number;
  driver_id: number;
  origin_city: string;
  destination_city: string;
  status: string;
}

interface TruckRow {
  id: number;
  plate: string;
}

interface Waypoint {
  lat: number;
  lng: number;
}

const ROUTES: Record<string, Waypoint[]> = {
  'Santiago-Rancagua': [
    { lat: -33.4489, lng: -70.6693 },
    { lat: -33.5000, lng: -70.6800 },
    { lat: -33.5500, lng: -70.6900 },
    { lat: -33.6000, lng: -70.7000 },
    { lat: -33.6500, lng: -70.7100 },
    { lat: -33.7000, lng: -70.7200 },
    { lat: -33.7500, lng: -70.7300 },
    { lat: -33.8000, lng: -70.7350 },
    { lat: -33.8500, lng: -70.7400 },
    { lat: -33.9000, lng: -70.7450 },
    { lat: -33.9500, lng: -70.7450 },
    { lat: -34.0000, lng: -70.7450 },
    { lat: -34.0500, lng: -70.7450 },
    { lat: -34.1000, lng: -70.7445 },
    { lat: -34.1708, lng: -70.7445 },
  ],
  'Rancagua-Santiago': [
    { lat: -34.1708, lng: -70.7445 },
    { lat: -34.1200, lng: -70.7445 },
    { lat: -34.0700, lng: -70.7450 },
    { lat: -34.0200, lng: -70.7450 },
    { lat: -33.9700, lng: -70.7450 },
    { lat: -33.9200, lng: -70.7450 },
    { lat: -33.8700, lng: -70.7400 },
    { lat: -33.8200, lng: -70.7350 },
    { lat: -33.7700, lng: -70.7300 },
    { lat: -33.7200, lng: -70.7200 },
    { lat: -33.6700, lng: -70.7100 },
    { lat: -33.6200, lng: -70.7000 },
    { lat: -33.5700, lng: -70.6900 },
    { lat: -33.5200, lng: -70.6800 },
    { lat: -33.4700, lng: -70.6693 },
    { lat: -33.4489, lng: -70.6693 },
  ],
  'Santiago-Valparaíso': [
    { lat: -33.4489, lng: -70.6693 },
    { lat: -33.4300, lng: -70.7000 },
    { lat: -33.4100, lng: -70.7300 },
    { lat: -33.3900, lng: -70.7600 },
    { lat: -33.3700, lng: -70.7900 },
    { lat: -33.3400, lng: -70.8200 },
    { lat: -33.3100, lng: -70.8500 },
    { lat: -33.2700, lng: -70.8800 },
    { lat: -33.2300, lng: -70.9000 },
    { lat: -33.1900, lng: -70.9100 },
    { lat: -33.1500, lng: -70.8900 },
    { lat: -33.1100, lng: -70.8400 },
    { lat: -33.0700, lng: -70.7900 },
    { lat: -33.0500, lng: -70.7400 },
    { lat: -33.0472, lng: -71.6127 },
  ],
  'Rancagua-Talca': [
    { lat: -34.1708, lng: -70.7445 },
    { lat: -34.2200, lng: -70.7500 },
    { lat: -34.3000, lng: -70.7600 },
    { lat: -34.4000, lng: -70.7700 },
    { lat: -34.5000, lng: -70.7800 },
    { lat: -34.6000, lng: -70.7800 },
    { lat: -34.7000, lng: -70.7750 },
    { lat: -34.8000, lng: -70.7700 },
    { lat: -34.9000, lng: -70.7650 },
    { lat: -35.0000, lng: -70.7600 },
    { lat: -35.1000, lng: -70.7500 },
    { lat: -35.2000, lng: -70.7400 },
    { lat: -35.3000, lng: -70.7200 },
    { lat: -35.4000, lng: -70.6800 },
    { lat: -35.4264, lng: -71.6654 },
  ],
  'Valparaíso-Santiago': [
    { lat: -33.0472, lng: -71.6127 },
    { lat: -33.0500, lng: -70.7400 },
    { lat: -33.0700, lng: -70.7900 },
    { lat: -33.1100, lng: -70.8400 },
    { lat: -33.1500, lng: -70.8900 },
    { lat: -33.1900, lng: -70.9100 },
    { lat: -33.2300, lng: -70.9000 },
    { lat: -33.2700, lng: -70.8800 },
    { lat: -33.3100, lng: -70.8500 },
    { lat: -33.3400, lng: -70.8200 },
    { lat: -33.3700, lng: -70.7900 },
    { lat: -33.3900, lng: -70.7600 },
    { lat: -33.4100, lng: -70.7300 },
    { lat: -33.4300, lng: -70.7000 },
    { lat: -33.4489, lng: -70.6693 },
  ],
  'Talca-Santiago': [
    { lat: -35.4264, lng: -71.6654 },
    { lat: -35.4000, lng: -70.6800 },
    { lat: -35.3000, lng: -70.7200 },
    { lat: -35.2000, lng: -70.7400 },
    { lat: -35.1000, lng: -70.7500 },
    { lat: -35.0000, lng: -70.7600 },
    { lat: -34.9000, lng: -70.7650 },
    { lat: -34.8000, lng: -70.7700 },
    { lat: -34.7000, lng: -70.7750 },
    { lat: -34.6000, lng: -70.7800 },
    { lat: -34.5000, lng: -70.7800 },
    { lat: -34.4000, lng: -70.7700 },
    { lat: -34.3000, lng: -70.7600 },
    { lat: -34.2200, lng: -70.7500 },
    { lat: -34.1708, lng: -70.7445 },
    { lat: -34.1200, lng: -70.7445 },
    { lat: -34.0700, lng: -70.7450 },
    { lat: -34.0200, lng: -70.7450 },
    { lat: -33.9700, lng: -70.7450 },
    { lat: -33.9200, lng: -70.7450 },
    { lat: -33.8700, lng: -70.7400 },
    { lat: -33.8200, lng: -70.7350 },
    { lat: -33.7700, lng: -70.7300 },
    { lat: -33.7200, lng: -70.7200 },
    { lat: -33.6700, lng: -70.7100 },
    { lat: -33.6200, lng: -70.7000 },
    { lat: -33.5700, lng: -70.6900 },
    { lat: -33.5200, lng: -70.6800 },
    { lat: -33.4700, lng: -70.6693 },
    { lat: -33.4489, lng: -70.6693 },
  ],
};

function getRouteKey(origin: string, destination: string): string | null {
  const key = `${origin}-${destination}`;
  if (ROUTES[key]) return key;
  const reverseKey = `${destination}-${origin}`;
  if (ROUTES[reverseKey]) return reverseKey;
  return null;
}

let tracks: Record<number, { waypointIndex: number; routeKey: string; waypoints: Waypoint[] }> = {};

function getRandomSpeed(): number {
  return 60 + Math.random() * 30;
}

function addNoise(value: number, amount: number = 0.001): number {
  return value + (Math.random() - 0.5) * amount;
}

function interpolatePosition(wp1: Waypoint, wp2: Waypoint, fraction: number): Waypoint {
  return {
    lat: wp1.lat + (wp2.lat - wp1.lat) * fraction,
    lng: wp1.lng + (wp2.lng - wp1.lng) * fraction,
  };
}

export const simulate = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    const tripsResult = await client.query<TripRow>(
      `SELECT id, truck_id, driver_id, origin_city, destination_city, status
       FROM trips WHERE status = 'in_progress' AND tenant_id = $1`,
      [process.env.DEFAULT_TENANT_ID || 'transallendes']
    );
    const trips = tripsResult.rows;

    if (trips.length === 0) {
      logger.info('No active trips to simulate');
      return;
    }

    for (const trip of trips) {
      if (!tracks[trip.truck_id]) {
        const routeKey = getRouteKey(trip.origin_city, trip.destination_city);
        if (!routeKey) {
          logger.warn(`No route defined for ${trip.origin_city} → ${trip.destination_city}`);
          continue;
        }
        const waypoints = ROUTES[routeKey];
        const isReversed = routeKey !== `${trip.origin_city}-${trip.destination_city}`;
        tracks[trip.truck_id] = {
          waypointIndex: 0,
          routeKey,
          waypoints: isReversed ? [...waypoints].reverse() : waypoints,
        };
      }

      const track = tracks[trip.truck_id];
      const totalWaypoints = track.waypoints.length;

      let steps = 1;
      if (totalWaypoints > 3) {
        steps = Math.max(1, Math.floor(totalWaypoints / 10));
      }

      for (let s = 0; s < steps; s++) {
        if (track.waypointIndex >= totalWaypoints - 1) {
          logger.info(`Truck ${trip.truck_id} reached destination`);
          await client.query(
            `UPDATE trips SET status = 'completed', actual_arrival_at = NOW() WHERE id = $1`,
            [trip.id]
          );
          delete tracks[trip.truck_id];

          await client.query(
            `UPDATE trucks SET last_gps_position = $1 WHERE id = $2`,
            [JSON.stringify({ lat: track.waypoints[totalWaypoints - 1].lat, lng: track.waypoints[totalWaypoints - 1].lng, speed: 0, ignition: false, recorded_at: new Date().toISOString() }), trip.truck_id]
          );
          break;
        }

        const currentWp = track.waypoints[track.waypointIndex];
        const nextWpIndex = Math.min(track.waypointIndex + 1, totalWaypoints - 1);
        const nextWp = track.waypoints[nextWpIndex];
        const fraction = Math.random() * 0.08;
        const pos = interpolatePosition(currentWp, nextWp, fraction);
        const speed = getRandomSpeed();
        const ignition = true;
        const recordedAt = new Date();

        if (Math.random() < 0.15) {
          track.waypointIndex = Math.min(track.waypointIndex + 1, totalWaypoints - 1);
        }

        const truckResult = await client.query<TruckRow>(
          'SELECT id, plate FROM trucks WHERE id = $1', [trip.truck_id]
        );
        if (truckResult.rows.length === 0) continue;
        const truck = truckResult.rows[0];

        const gpsData = {
          lat: addNoise(pos.lat, 0.002),
          lng: addNoise(pos.lng, 0.002),
          speed: Math.round(speed * 10) / 10,
          direction: Math.floor(Math.random() * 360),
          ignition,
          odometer: Math.round((truck.id * 50000) + Math.random() * 10000),
          fuel_level: Math.round((20 + Math.random() * 60) * 10) / 10,
          temperature: Math.round((85 + Math.random() * 15) * 10) / 10,
          recorded_at: recordedAt.toISOString(),
        };

        try {
          const partitionSuffix = `${recordedAt.getFullYear()}_${String(recordedAt.getMonth() + 1).padStart(2, '0')}`;
          await client.query(
            `INSERT INTO gps_positions (truck_id, driver_id, trip_id, latitude, longitude, speed_kmh, direction, ignition, odometer_km, fuel_level, temperature, recorded_at, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [trip.truck_id, trip.driver_id, trip.id, gpsData.lat, gpsData.lng, gpsData.speed, gpsData.direction, gpsData.ignition, gpsData.odometer, gpsData.fuel_level, gpsData.temperature, recordedAt, process.env.DEFAULT_TENANT_ID || 'transallendes']
          );
        } catch (err: unknown) {
          const pgError = err as { code?: string };
          if (pgError.code === '42P01') {
            logger.warn('GPS partition table missing, creating...');
            await client.query(
              `CREATE TABLE IF NOT EXISTS gps_positions_${partitionSuffix} PARTITION OF gps_positions
               FOR VALUES FROM ('${recordedAt.getFullYear()}-${String(recordedAt.getMonth() + 1).padStart(2, '0')}-01') TO ('${recordedAt.getMonth() === 11 ? recordedAt.getFullYear() + 1 : recordedAt.getFullYear()}-${String(recordedAt.getMonth() + 2).padStart(2, '0')}-01')`
            );
            await client.query(
              `INSERT INTO gps_positions (truck_id, driver_id, trip_id, latitude, longitude, speed_kmh, direction, ignition, odometer_km, fuel_level, temperature, recorded_at, tenant_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
              [trip.truck_id, trip.driver_id, trip.id, gpsData.lat, gpsData.lng, gpsData.speed, gpsData.direction, gpsData.ignition, gpsData.odometer, gpsData.fuel_level, gpsData.temperature, recordedAt, process.env.DEFAULT_TENANT_ID || 'transallendes']
            );
          } else {
            throw err;
          }
        }

        await client.query(
          `UPDATE trucks SET last_gps_position = $1 WHERE id = $2`,
          [JSON.stringify(gpsData), trip.truck_id]
        );
      }
    }

    logger.info(`Simulation tick: ${trips.length} trips processed`);
  } catch (err) {
    logger.error('Simulation error', { error: (err as Error).message, stack: (err as Error).stack });
    throw err;
  } finally {
    client.release();
  }
};

async function runLoop(intervalMs: number = 10000): Promise<void> {
  logger.info(`GPS simulator starting (interval: ${intervalMs}ms)`);
  const run = async () => {
    try {
      await simulate();
    } catch (err) {
      logger.error('Simulation tick failed', { error: (err as Error).message });
    }
  };
  await run();
  setInterval(run, intervalMs);
}

const isMain = process.argv[1]?.endsWith('simulate.ts') || process.argv[1]?.endsWith('simulate.js');
if (isMain) {
  const interval = parseInt(process.argv[2] || '10000', 10);
  runLoop(interval).catch((err) => {
    logger.error('Simulator failed', { error: (err as Error).message });
    process.exit(1);
  });
}
