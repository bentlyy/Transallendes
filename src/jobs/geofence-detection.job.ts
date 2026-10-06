import { pool } from '../shared/db.js'
import { logger } from '../utils/logger.js'
import { BaseJob, type JobContext, type JobResult } from '../shared/job.js'
import cron from 'node-cron'

interface GeofenceRow {
  id: number
  name: string
  type: string
  center_lat: number | null
  center_lng: number | null
  radius_meters: number | null
  alert_on_entry: boolean
  alert_on_exit: boolean
  tenant_id: string
}

interface PositionRow {
  truck_id: number
  tenant_id: string
  latitude: number
  longitude: number
  speed_kmh: number | null
  recorded_at: string
  driver_id: number | null
}

interface GeofenceStateRow {
  truck_id: number
  geofence_id: number
  inside: boolean
}

interface AlertCreateData {
  type: string
  severity: string
  title: string
  message: string
  resource_type: string
  resource_id: number | null
  truck_id: number | null
  driver_id: number | null
  geofence_id: number | null
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function pointInCircle(lat: number, lng: number, centerLat: number, centerLng: number, radiusM: number): boolean {
  return haversineDistance(lat, lng, centerLat, centerLng) <= radiusM
}

async function getActiveGeofences(): Promise<GeofenceRow[]> {
  const { rows } = await pool.query<GeofenceRow>(`
    SELECT id, name, type, center_lat, center_lng, radius_meters,
           tenant_id, true AS alert_on_entry, true AS alert_on_exit
    FROM geofences
    WHERE active = true
  `)
  return rows
}

async function getLatestPositions(): Promise<PositionRow[]> {
  const { rows } = await pool.query<PositionRow>(`
    SELECT DISTINCT ON (gp.truck_id)
      gp.truck_id, gp.tenant_id, gp.latitude, gp.longitude,
      gp.speed_kmh, gp.recorded_at, t.driver_id
    FROM gps_positions gp
    JOIN trucks t ON t.id = gp.truck_id AND t.tenant_id = gp.tenant_id
    WHERE t.status = 'active'
    ORDER BY gp.truck_id, gp.recorded_at DESC
  `)
  return rows
}

async function getGeofenceStates(): Promise<GeofenceStateRow[]> {
  const { rows } = await pool.query<GeofenceStateRow>(`
    SELECT truck_id, geofence_id, inside
    FROM truck_geofence_states
  `)
  return rows
}

async function upsertGeofenceState(truckId: number, geofenceId: number, inside: boolean): Promise<void> {
  await pool.query(
    `INSERT INTO truck_geofence_states (truck_id, geofence_id, inside, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (truck_id, geofence_id)
     DO UPDATE SET inside = $3, updated_at = NOW()`,
    [truckId, geofenceId, inside],
  )
}

async function alertExistsForGeofence(
  truckId: number,
  geofenceId: number,
  eventType: string,
  tenantId: string,
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT id FROM alerts
     WHERE truck_id = $1 AND geofence_id = $2 AND type = $3 AND tenant_id = $4
       AND created_at > NOW() - INTERVAL '5 minutes'
     LIMIT 1`,
    [truckId, geofenceId, eventType, tenantId],
  )
  return rows.length > 0
}

async function createAlert(tenantId: string, data: AlertCreateData): Promise<void> {
  await pool.query(
    `INSERT INTO alerts
       (type, severity, title, description, resource_type, resource_id,
        truck_id, driver_id, geofence_id, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      data.type,
      data.severity,
      data.title,
      data.message,
      data.resource_type ?? 'geofence',
      data.resource_id ?? null,
      data.truck_id ?? null,
      data.driver_id ?? null,
      data.geofence_id ?? null,
      tenantId,
    ],
  )
}

async function ensureStateTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS truck_geofence_states (
      truck_id INT NOT NULL,
      geofence_id INT NOT NULL,
      inside BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (truck_id, geofence_id)
    )
  `)
}

class GeofenceDetectionJob extends BaseJob {
  readonly name = 'geofence-detection'

  async execute(_ctx: JobContext): Promise<JobResult> {
    await ensureStateTable()

    const [geofences, positions, states] = await Promise.all([
      getActiveGeofences(),
      getLatestPositions(),
      getGeofenceStates(),
    ])

    if (!geofences.length || !positions.length) {
      return { success: true, processed: 0, errors: 0, duration: 0 }
    }

    const stateMap: Record<string, boolean> = {}
    for (const s of states) {
      stateMap[`${s.truck_id}:${s.geofence_id}`] = s.inside
    }

    const circleGeofences = geofences.filter(
      (g) => g.type === 'circle' && g.center_lat != null && g.center_lng != null && g.radius_meters != null,
    ) as (GeofenceRow & { center_lat: number; center_lng: number; radius_meters: number })[]

    let processed = 0
    let errors = 0

    for (const pos of positions) {
      for (const gf of circleGeofences) {
        if (pos.tenant_id !== gf.tenant_id) continue

        const isInside = pointInCircle(pos.latitude, pos.longitude, gf.center_lat, gf.center_lng, gf.radius_meters)

        const key = `${pos.truck_id}:${gf.id}`
        const wasInside = stateMap[key] ?? false

        await upsertGeofenceState(pos.truck_id, gf.id, isInside)

        try {
          if (isInside && !wasInside && gf.alert_on_entry) {
            if (await alertExistsForGeofence(pos.truck_id, gf.id, 'geofence_enter', pos.tenant_id)) continue
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
            })
            processed++
            logger.info(`Geofence enter: truck ${pos.truck_id} -> ${gf.name}`)
          }

          if (!isInside && wasInside && gf.alert_on_exit) {
            if (await alertExistsForGeofence(pos.truck_id, gf.id, 'geofence_exit', pos.tenant_id)) continue
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
            })
            processed++
            logger.info(`Geofence exit: truck ${pos.truck_id} -> ${gf.name}`)
          }
        } catch (ruleErr) {
          errors++
          logger.error('Geofence alert failed', { error: ruleErr, truck_id: pos.truck_id, geofence_id: gf.id })
        }
      }
    }

    return { success: true, processed, errors, duration: 0 }
  }
}

export function startGeofenceDetection(): void {
  const job = new GeofenceDetectionJob()
  cron.schedule('*/60 * * * * *', () => {
    job.run().catch((err) => logger.error('Geofence detection cron error', { error: err }))
  })
  logger.info('Geofence detection started (every 60s)')
}
