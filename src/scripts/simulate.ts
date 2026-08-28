import { pool } from '../shared/db.js'
import { logger } from '../utils/logger.js'

interface TripRow {
  id: number
  truck_id: number
  driver_id: number
  origin_city: string
  destination_city: string
  status: string
}

interface TruckRow {
  id: number
  plate: string
}

interface Waypoint {
  lat: number
  lng: number
}

const ROUTES: Record<string, Waypoint[]> = {
  'Santiago-Rancagua': [
    { lat: -33.4489, lng: -70.6693 },
    { lat: -33.5, lng: -70.68 },
    { lat: -33.55, lng: -70.69 },
    { lat: -33.6, lng: -70.7 },
    { lat: -33.65, lng: -70.71 },
    { lat: -33.7, lng: -70.72 },
    { lat: -33.75, lng: -70.73 },
    { lat: -33.8, lng: -70.735 },
    { lat: -33.85, lng: -70.74 },
    { lat: -33.9, lng: -70.745 },
    { lat: -33.95, lng: -70.745 },
    { lat: -34.0, lng: -70.745 },
    { lat: -34.05, lng: -70.745 },
    { lat: -34.1, lng: -70.7445 },
    { lat: -34.1708, lng: -70.7445 },
  ],
  'Rancagua-Santiago': [
    { lat: -34.1708, lng: -70.7445 },
    { lat: -34.12, lng: -70.7445 },
    { lat: -34.07, lng: -70.745 },
    { lat: -34.02, lng: -70.745 },
    { lat: -33.97, lng: -70.745 },
    { lat: -33.92, lng: -70.745 },
    { lat: -33.87, lng: -70.74 },
    { lat: -33.82, lng: -70.735 },
    { lat: -33.77, lng: -70.73 },
    { lat: -33.72, lng: -70.72 },
    { lat: -33.67, lng: -70.71 },
    { lat: -33.62, lng: -70.7 },
    { lat: -33.57, lng: -70.69 },
    { lat: -33.52, lng: -70.68 },
    { lat: -33.47, lng: -70.6693 },
    { lat: -33.4489, lng: -70.6693 },
  ],
  'Santiago-Valparaiso': [
    { lat: -33.4489, lng: -70.6693 },
    { lat: -33.43, lng: -70.7 },
    { lat: -33.41, lng: -70.73 },
    { lat: -33.39, lng: -70.76 },
    { lat: -33.37, lng: -70.79 },
    { lat: -33.34, lng: -70.82 },
    { lat: -33.31, lng: -70.85 },
    { lat: -33.27, lng: -70.88 },
    { lat: -33.23, lng: -70.9 },
    { lat: -33.19, lng: -70.91 },
    { lat: -33.15, lng: -70.89 },
    { lat: -33.11, lng: -70.84 },
    { lat: -33.07, lng: -70.79 },
    { lat: -33.05, lng: -70.74 },
    { lat: -33.0472, lng: -71.6127 },
  ],
  'Rancagua-Talca': [
    { lat: -34.1708, lng: -70.7445 },
    { lat: -34.22, lng: -70.75 },
    { lat: -34.3, lng: -70.76 },
    { lat: -34.4, lng: -70.77 },
    { lat: -34.5, lng: -70.78 },
    { lat: -34.6, lng: -70.78 },
    { lat: -34.7, lng: -70.775 },
    { lat: -34.8, lng: -70.77 },
    { lat: -34.9, lng: -70.765 },
    { lat: -35.0, lng: -70.76 },
    { lat: -35.1, lng: -70.75 },
    { lat: -35.2, lng: -70.74 },
    { lat: -35.3, lng: -70.72 },
    { lat: -35.4, lng: -70.68 },
    { lat: -35.4264, lng: -71.6654 },
  ],
  'Valparaiso-Santiago': [
    { lat: -33.0472, lng: -71.6127 },
    { lat: -33.05, lng: -70.74 },
    { lat: -33.07, lng: -70.79 },
    { lat: -33.11, lng: -70.84 },
    { lat: -33.15, lng: -70.89 },
    { lat: -33.19, lng: -70.91 },
    { lat: -33.23, lng: -70.9 },
    { lat: -33.27, lng: -70.88 },
    { lat: -33.31, lng: -70.85 },
    { lat: -33.34, lng: -70.82 },
    { lat: -33.37, lng: -70.79 },
    { lat: -33.39, lng: -70.76 },
    { lat: -33.41, lng: -70.73 },
    { lat: -33.43, lng: -70.7 },
    { lat: -33.4489, lng: -70.6693 },
  ],
  'Talca-Santiago': [
    { lat: -35.4264, lng: -71.6654 },
    { lat: -35.4, lng: -70.68 },
    { lat: -35.3, lng: -70.72 },
    { lat: -35.2, lng: -70.74 },
    { lat: -35.1, lng: -70.75 },
    { lat: -35.0, lng: -70.76 },
    { lat: -34.9, lng: -70.765 },
    { lat: -34.8, lng: -70.77 },
    { lat: -34.7, lng: -70.775 },
    { lat: -34.6, lng: -70.78 },
    { lat: -34.5, lng: -70.78 },
    { lat: -34.4, lng: -70.77 },
    { lat: -34.3, lng: -70.76 },
    { lat: -34.22, lng: -70.75 },
    { lat: -34.1708, lng: -70.7445 },
    { lat: -34.12, lng: -70.7445 },
    { lat: -34.07, lng: -70.745 },
    { lat: -34.02, lng: -70.745 },
    { lat: -33.97, lng: -70.745 },
    { lat: -33.92, lng: -70.745 },
    { lat: -33.87, lng: -70.74 },
    { lat: -33.82, lng: -70.735 },
    { lat: -33.77, lng: -70.73 },
    { lat: -33.72, lng: -70.72 },
    { lat: -33.67, lng: -70.71 },
    { lat: -33.62, lng: -70.7 },
    { lat: -33.57, lng: -70.69 },
    { lat: -33.52, lng: -70.68 },
    { lat: -33.47, lng: -70.6693 },
    { lat: -33.4489, lng: -70.6693 },
  ],
}

function getRouteKey(origin: string, destination: string): string | null {
  const key = `${origin}-${destination}`
  if (ROUTES[key]) return key
  const reverseKey = `${destination}-${origin}`
  if (ROUTES[reverseKey]) return reverseKey
  return null
}

let tracks: Record<number, { waypointIndex: number; routeKey: string; waypoints: Waypoint[] }> = {}

function getRandomSpeed(): number {
  return 60 + Math.random() * 30
}

function addNoise(value: number, amount = 0.001): number {
  return value + (Math.random() - 0.5) * amount
}

function interpolatePosition(wp1: Waypoint, wp2: Waypoint, fraction: number): Waypoint {
  return {
    lat: wp1.lat + (wp2.lat - wp1.lat) * fraction,
    lng: wp1.lng + (wp2.lng - wp1.lng) * fraction,
  }
}

export const simulate = async (): Promise<void> => {
  const client = await pool.connect()
  try {
    const tripsResult = await client.query<TripRow>(
      `SELECT id, truck_id, driver_id, origin_city, destination_city, status
       FROM trips WHERE status = 'in_progress' AND tenant_id = $1`,
      [process.env.DEFAULT_TENANT_ID || 'transallendes'],
    )
    const trips = tripsResult.rows

    if (trips.length === 0) {
      logger.info('No hay viajes activos para simular')
      return
    }

    for (const trip of trips) {
      if (!tracks[trip.truck_id]) {
        const routeKey = getRouteKey(trip.origin_city, trip.destination_city)
        if (!routeKey) {
          logger.warn(`No route defined for ${trip.origin_city} → ${trip.destination_city}`)
          continue
        }
        const waypoints = ROUTES[routeKey]
        const isReversed = routeKey !== `${trip.origin_city}-${trip.destination_city}`
        tracks[trip.truck_id] = {
          waypointIndex: 0,
          routeKey,
          waypoints: isReversed ? [...waypoints].reverse() : waypoints,
        }
      }

      const track = tracks[trip.truck_id]
      const totalWaypoints = track.waypoints.length

      let steps = 1
      if (totalWaypoints > 3) {
        steps = Math.max(1, Math.floor(totalWaypoints / 10))
      }

      for (let s = 0; s < steps; s++) {
        if (track.waypointIndex >= totalWaypoints - 1) {
          logger.info(`Truck ${trip.truck_id} reached destination`)
          await client.query(`UPDATE trips SET status = 'completed', actual_arrival_at = NOW() WHERE id = $1`, [
            trip.id,
          ])
          delete tracks[trip.truck_id]

          await client.query(`UPDATE trucks SET last_gps_position = $1 WHERE id = $2`, [
            JSON.stringify({
              lat: track.waypoints[totalWaypoints - 1].lat,
              lng: track.waypoints[totalWaypoints - 1].lng,
              speed: 0,
              ignition: false,
              recorded_at: new Date().toISOString(),
            }),
            trip.truck_id,
          ])
          break
        }

        const currentWp = track.waypoints[track.waypointIndex]
        const nextWpIndex = Math.min(track.waypointIndex + 1, totalWaypoints - 1)
        const nextWp = track.waypoints[nextWpIndex]
        const fraction = Math.random() * 0.08
        const pos = interpolatePosition(currentWp, nextWp, fraction)
        const speed = getRandomSpeed()
        const ignition = true
        const recordedAt = new Date()

        if (Math.random() < 0.15) {
          track.waypointIndex = Math.min(track.waypointIndex + 1, totalWaypoints - 1)
        }

        const truckResult = await client.query<TruckRow>('SELECT id, plate FROM trucks WHERE id = $1', [trip.truck_id])
        if (truckResult.rows.length === 0) continue
        const truck = truckResult.rows[0]

        const gpsData = {
          lat: addNoise(pos.lat, 0.002),
          lng: addNoise(pos.lng, 0.002),
          speed: Math.round(speed * 10) / 10,
          direction: Math.floor(Math.random() * 360),
          ignition,
          odometer: Math.round(truck.id * 50000 + Math.random() * 10000),
          fuel_level: Math.round((20 + Math.random() * 60) * 10) / 10,
          temperature: Math.round((85 + Math.random() * 15) * 10) / 10,
          recorded_at: recordedAt.toISOString(),
        }

        const partitionSuffix = `${recordedAt.getFullYear()}_${String(recordedAt.getMonth() + 1).padStart(2, '0')}`
        try {
          await client.query(
            `INSERT INTO gps_positions (truck_id, driver_id, trip_id, latitude, longitude, speed_kmh, direction, ignition, odometer_km, fuel_level, temperature, recorded_at, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              trip.truck_id,
              trip.driver_id,
              trip.id,
              gpsData.lat,
              gpsData.lng,
              gpsData.speed,
              gpsData.direction,
              gpsData.ignition,
              gpsData.odometer,
              gpsData.fuel_level,
              gpsData.temperature,
              recordedAt,
              process.env.DEFAULT_TENANT_ID || 'transallendes',
            ],
          )
        } catch (err: unknown) {
          const pgError = err as { code?: string }
          if (pgError.code === '42P01') {
            logger.warn('Falta la tabla de particiones GPS, creandola...')
            await client.query(
              `CREATE TABLE IF NOT EXISTS gps_positions_${partitionSuffix} PARTITION OF gps_positions
               FOR VALUES FROM ('${recordedAt.getFullYear()}-${String(recordedAt.getMonth() + 1).padStart(2, '0')}-01') TO ('${recordedAt.getMonth() === 11 ? recordedAt.getFullYear() + 1 : recordedAt.getFullYear()}-${String(recordedAt.getMonth() + 2).padStart(2, '0')}-01')`,
            )
            await client.query(
              `INSERT INTO gps_positions (truck_id, driver_id, trip_id, latitude, longitude, speed_kmh, direction, ignition, odometer_km, fuel_level, temperature, recorded_at, tenant_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
              [
                trip.truck_id,
                trip.driver_id,
                trip.id,
                gpsData.lat,
                gpsData.lng,
                gpsData.speed,
                gpsData.direction,
                gpsData.ignition,
                gpsData.odometer,
                gpsData.fuel_level,
                gpsData.temperature,
                recordedAt,
                process.env.DEFAULT_TENANT_ID || 'transallendes',
              ],
            )
          } else {
            throw err
          }
        }

        await client.query(`UPDATE trucks SET last_gps_position = $1 WHERE id = $2`, [
          JSON.stringify(gpsData),
          trip.truck_id,
        ])
      }
    }

    logger.info(`Simulation tick: ${trips.length} trips processed`)
  } catch (err) {
    logger.error('Error en la simulacion', { error: (err as Error).message, stack: (err as Error).stack })
    throw err
  } finally {
    client.release()
  }
}

async function runLoop(intervalMs = 10000): Promise<void> {
  logger.info(`GPS simulator starting (interval: ${intervalMs}ms)`)
  const run = async () => {
    try {
      await simulate()
    } catch (err) {
      logger.error('Tic de simulacion fallido', { error: (err as Error).message })
    }
  }
  await run()
  setInterval(run, intervalMs)
}

const isMain = process.argv[1]?.endsWith('simulate.ts') || process.argv[1]?.endsWith('simulate.js')
if (isMain) {
  const interval = parseInt(process.argv[2] || '10000', 10)
  runLoop(interval).catch((err) => {
    logger.error('Fallo el simulador', { error: (err as Error).message })
    process.exit(1)
  })
}
