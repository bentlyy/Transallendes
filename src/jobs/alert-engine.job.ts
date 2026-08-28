import { pool } from '../shared/db.js'
import { logger } from '../utils/logger.js'
import { BaseJob, type JobContext, type JobResult } from '../shared/job.js'
import cron from 'node-cron'

interface ActiveTruckRow {
  truck_id: number
  tenant_id: string
  license_plate: string
  gps_device_id: string
  driver_id: number | null
  position_id: number
  latitude: number
  longitude: number
  speed_kmh: number | null
  ignition: boolean | null
  fuel_level: number | null
  temperature: number | null
  battery_level: number | null
  odometer_km: number | null
  recorded_at: string
  raw_data: Record<string, unknown> | null
}

interface PrevPositionRow {
  truck_id: number
  recorded_at: string
  speed_kmh: number | null
  fuel_level: number | null
  latitude: number
  longitude: number
  ignition: boolean | null
  temperature: number | null
  battery_level: number | null
  odometer_km: number | null
}

interface StopStartRow {
  truck_id: number
  recorded_at: string
  speed_kmh: number | null
}

interface AlertContext {
  previous: PrevPositionRow | null
  stopStartTime: Date | null
}

interface AlertRuleConfig {
  condition: (pos: ActiveTruckRow, ctx: AlertContext) => boolean
  severity: string
  titleTemplate: (pos: ActiveTruckRow) => string
}

const ALERT_TYPES: Record<string, AlertRuleConfig> = {
  speeding: {
    condition: (pos) => (pos.speed_kmh ?? 0) > 90,
    severity: 'warning',
    titleTemplate: (pos) => `Exceso de velocidad: ${pos.speed_kmh} km/h en ${pos.license_plate || pos.gps_device_id}`,
  },
  gps_disconnected: {
    condition: (pos) => {
      const diff = Date.now() - new Date(pos.recorded_at).getTime()
      return diff > 5 * 60 * 1000
    },
    severity: 'critical',
    titleTemplate: (pos) => `GPS desconectado: ${pos.license_plate || pos.gps_device_id} (sin datos >5 min)`,
  },
  fuel_drop: {
    condition: (pos, ctx) => {
      if (pos.fuel_level == null || !ctx.previous || ctx.previous.fuel_level == null) return false
      return ctx.previous.fuel_level - pos.fuel_level > 10
    },
    severity: 'critical',
    titleTemplate: (pos) => `Baja de combustible >10% en ${pos.license_plate || pos.gps_device_id}`,
  },
  stopped_too_long: {
    condition: (pos, ctx) => {
      if ((pos.speed_kmh ?? 0) > 0 || !ctx.stopStartTime) return false
      const stoppedDuration = (Date.now() - ctx.stopStartTime.getTime()) / (1000 * 60 * 60)
      return stoppedDuration >= 2
    },
    severity: 'warning',
    titleTemplate: (pos) => `Detenido >2h: ${pos.license_plate || pos.gps_device_id}`,
  },
  high_temp: {
    condition: (pos) => {
      if (pos.temperature == null) return false
      return pos.temperature > (((pos.raw_data as Record<string, unknown>)?.['temp_threshold'] as number) ?? 70)
    },
    severity: 'warning',
    titleTemplate: (pos) => `Temperatura alta (${pos.temperature}°C) en ${pos.license_plate || pos.gps_device_id}`,
  },
  low_battery: {
    condition: (pos) => {
      if (pos.battery_level == null) return false
      return pos.battery_level < 10
    },
    severity: 'warning',
    titleTemplate: (pos) => `Bateria baja (${pos.battery_level}%) en ${pos.license_plate || pos.gps_device_id}`,
  },
}

async function getActiveTrucksWithPositions(): Promise<ActiveTruckRow[]> {
  const { rows } = await pool.query<ActiveTruckRow>(`
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
  `)
  return rows
}

async function getPreviousPositions(truckIds: number[]): Promise<PrevPositionRow[]> {
  if (!truckIds.length) return []
  const placeholders = truckIds.map((_, i) => `$${i + 1}`).join(',')
  const { rows } = await pool.query<PrevPositionRow>(
    `
    SELECT DISTINCT ON (truck_id) *
    FROM gps_positions
    WHERE truck_id IN (${placeholders})
    ORDER BY truck_id, recorded_at DESC
  `,
    truckIds,
  )
  return rows
}

async function getStopStartTimes(truckIds: number[]): Promise<Record<number, { stopStartTime: Date }>> {
  if (!truckIds.length) return {}
  const placeholders = truckIds.map((_, i) => `$${i + 1}`).join(',')
  const { rows } = await pool.query<StopStartRow>(
    `
    SELECT truck_id, recorded_at, speed_kmh
    FROM gps_positions
    WHERE truck_id IN (${placeholders})
    ORDER BY truck_id, recorded_at DESC
    LIMIT 10
  `,
    truckIds,
  )

  const result: Record<number, { stopStartTime: Date }> = {}
  const grouped: Record<number, StopStartRow[]> = {}
  for (const row of rows) {
    if (!grouped[row.truck_id]) grouped[row.truck_id] = []
    grouped[row.truck_id].push(row)
  }
  for (const [truckId, positions] of Object.entries(grouped)) {
    const sorted = positions.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    for (const p of sorted) {
      if ((p.speed_kmh ?? 0) === 0) {
        result[Number(truckId)] = { stopStartTime: new Date(p.recorded_at) }
      }
    }
  }
  return result
}

async function alertExists(type: string, truckId: number, tenantId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT id FROM alerts
     WHERE type = $1 AND truck_id = $2 AND tenant_id = $3
       AND created_at > NOW() - INTERVAL '5 minutes'
     LIMIT 1`,
    [type, truckId, tenantId],
  )
  return rows.length > 0
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
}

async function createAlert(tenantId: string, data: AlertCreateData): Promise<void> {
  await pool.query(
    `INSERT INTO alerts (type, severity, title, description, truck_id, driver_id, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [data.type, data.severity, data.title, data.message, data.truck_id ?? null, data.driver_id ?? null, tenantId],
  )
}

class AlertEngineJob extends BaseJob {
  readonly name = 'alert-engine'

  async execute(_ctx: JobContext): Promise<JobResult> {
    const positions = await getActiveTrucksWithPositions()
    if (!positions.length) {
      return { success: true, processed: 0, errors: 0, duration: 0 }
    }

    const truckIds = [...new Set(positions.map((p) => p.truck_id))]
    const currentMap: Record<number, ActiveTruckRow> = {}
    for (const p of positions) {
      currentMap[p.truck_id] = currentMap[p.truck_id] || p
      if (new Date(p.recorded_at) > new Date(currentMap[p.truck_id].recorded_at)) {
        currentMap[p.truck_id] = p
      }
    }

    const [prevPositions, stopTimes] = await Promise.all([getPreviousPositions(truckIds), getStopStartTimes(truckIds)])

    const prevMap: Record<number, PrevPositionRow> = {}
    for (const p of prevPositions) {
      const tid = p.truck_id
      if (!prevMap[tid] || new Date(p.recorded_at) > new Date(prevMap[tid].recorded_at)) {
        prevMap[tid] = p
      }
    }

    let processed = 0
    let errors = 0

    for (const pos of Object.values(currentMap)) {
      const context: AlertContext = {
        previous: prevMap[pos.truck_id] || null,
        stopStartTime: stopTimes[pos.truck_id]?.stopStartTime || null,
      }

      for (const [typeName, rule] of Object.entries(ALERT_TYPES)) {
        try {
          if (!rule.condition(pos, context)) continue
          if (await alertExists(typeName, pos.truck_id, pos.tenant_id)) continue

          const title = rule.titleTemplate(pos)
          await createAlert(pos.tenant_id, {
            type: typeName,
            severity: rule.severity,
            title,
            message: title,
            resource_type: 'truck',
            resource_id: pos.truck_id,
            truck_id: pos.truck_id,
            driver_id: pos.driver_id ?? null,
          })
          processed++
          logger.warn(`Alerta generada: ${typeName}`, { truck_id: pos.truck_id, tenant_id: pos.tenant_id })
        } catch (ruleErr) {
          errors++
          logger.error(`La regla de alerta ${typeName} fallo`, { error: ruleErr, truck_id: pos.truck_id })
        }
      }
    }

    return { success: true, processed, errors, duration: 0 }
  }
}

export function startAlertEngine(): void {
  const job = new AlertEngineJob()
  cron.schedule('*/30 * * * * *', () => {
    job.run().catch((err) => logger.error('Error en el cron del motor de alertas', { error: err }))
  })
  logger.info('Motor de alertas iniciado (cada 30s)')
}
