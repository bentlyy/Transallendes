import { pool } from '../shared/db.js'
import { logger } from '../utils/logger.js'
import { BaseJob, type JobContext, type JobResult } from '../shared/job.js'
import { gpsProviderRegistry } from '../modules/gps-providers/gps-provider-registry.js'
import cron from 'node-cron'

interface ActiveTruckRow {
  truck_id: number
  tenant_id: string
  gps_device_id: string
  gps_provider: string
  driver_id: number | null
  trip_id: number | null
}

interface InsertPositionData {
  lat?: number | null
  latitude?: number | null
  lng?: number | null
  longitude?: number | null
  speed?: number | null
  speed_kmh?: number | null
  heading?: number | null
  direction?: number | null
  ignition?: boolean | null
  odometer?: number | null
  odometer_km?: number | null
  fuel_level?: number | null
  temperature?: number | null
  battery_level?: number | null
  battery_voltage?: number | null
  timestamp?: string | null
  recorded_at?: string | null
  extra?: Record<string, unknown> | null
  truck_id?: number | null
  driver_id?: number | null
  trip_id?: number | null
}

interface TruckLastPosition {
  lat: number | null
  lng: number | null
  speed: number | null
  heading: number | null
  ignition: boolean | null
  timestamp: string
  odometer: number | null
  fuel_level: number | null
}

async function getActiveTrucksByProvider(): Promise<ActiveTruckRow[]> {
  const { rows } = await pool.query<ActiveTruckRow>(`
    SELECT t.id AS truck_id, t.tenant_id, t.gps_device_id, t.gps_provider, t.driver_id,
           tr.id AS trip_id
    FROM trucks t
    LEFT JOIN trips tr ON tr.truck_id = t.id AND tr.status = 'in_progress'
    WHERE t.status = 'active'
      AND t.gps_device_id IS NOT NULL
      AND t.gps_provider IS NOT NULL
      AND t.gps_provider != ''
  `)
  return rows
}

async function insertPosition(tenantId: string, data: InsertPositionData): Promise<void> {
  await pool.query(
    `INSERT INTO gps_positions
       (tenant_id, latitude, longitude, speed_kmh, direction, ignition,
        odometer_km, fuel_level, temperature, battery_level, recorded_at,
        truck_id, driver_id, trip_id, raw_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
     ON CONFLICT DO NOTHING`,
    [
      tenantId,
      data.lat ?? data.latitude ?? null,
      data.lng ?? data.longitude ?? null,
      data.speed ?? data.speed_kmh ?? null,
      data.heading ?? data.direction ?? null,
      data.ignition ?? null,
      data.odometer ?? data.odometer_km ?? null,
      data.fuel_level ?? null,
      data.temperature ?? null,
      data.battery_level ?? data.battery_voltage ?? null,
      data.timestamp ?? data.recorded_at ?? new Date().toISOString(),
      data.truck_id ?? null,
      data.driver_id ?? null,
      data.trip_id ?? null,
      data.extra ? JSON.stringify(data.extra) : null,
    ],
  )
}

async function updateTruckLastPosition(truckId: number, tenantId: string, gpsData: InsertPositionData): Promise<void> {
  const position: TruckLastPosition = {
    lat: gpsData.lat ?? gpsData.latitude ?? null,
    lng: gpsData.lng ?? gpsData.longitude ?? null,
    speed: gpsData.speed ?? gpsData.speed_kmh ?? null,
    heading: gpsData.heading ?? gpsData.direction ?? null,
    ignition: gpsData.ignition ?? null,
    timestamp: gpsData.timestamp ?? gpsData.recorded_at ?? new Date().toISOString(),
    odometer: gpsData.odometer ?? gpsData.odometer_km ?? null,
    fuel_level: gpsData.fuel_level ?? null,
  }
  await pool.query(
    `UPDATE trucks
     SET last_gps_position = $1::jsonb, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3`,
    [JSON.stringify(position), truckId, tenantId],
  )
}

class GpsPollingJob extends BaseJob {
  readonly name = 'gps-polling'

  async execute(_ctx: JobContext): Promise<JobResult> {
    const trucks = await getActiveTrucksByProvider()
    if (!trucks.length) {
      return { success: true, processed: 0, errors: 0, duration: 0 }
    }

    const byProvider: Record<string, ActiveTruckRow[]> = {}
    for (const t of trucks) {
      const prov = t.gps_provider
      if (!byProvider[prov]) byProvider[prov] = []
      byProvider[prov].push(t)
    }

    let processed = 0
    let errors = 0

    for (const [providerName, group] of Object.entries(byProvider)) {
      const provider = gpsProviderRegistry.getProvider(providerName)
      if (!provider) {
        logger.warn(`GPS provider not registered: ${providerName}`)
        continue
      }

      for (const truck of group) {
        try {
          const gpsData = await provider.getRealtimeData(truck.gps_device_id)
          if (!gpsData) continue

          await insertPosition(truck.tenant_id, {
            ...gpsData,
            truck_id: truck.truck_id,
            driver_id: truck.driver_id,
            trip_id: truck.trip_id,
          })

          await updateTruckLastPosition(truck.truck_id, truck.tenant_id, gpsData)
          processed++
        } catch (err) {
          errors++
          logger.error(`GPS poll failed for truck ${truck.truck_id} via ${providerName}`, {
            error: err,
            truck_id: truck.truck_id,
          })
        }
      }
    }

    return { success: true, processed, errors, duration: 0 }
  }
}

export function startGpsPolling(): void {
  const job = new GpsPollingJob()
  cron.schedule('*/30 * * * * *', () => {
    job.run().catch((err) => logger.error('GPS polling cron error', { error: err }))
  })
  logger.info('GPS polling started (every 30s)')
}
