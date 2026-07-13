import { pool } from '../../shared/db.js'
import { NotFoundError } from '../../utils/errors.js'

interface IngestData {
  device_id: string
  latitude: number
  longitude: number
  speed_kmh?: number
  direction?: number
  ignition?: boolean
  odometer_km?: number
  fuel_level?: number
  fuel_consumption?: number
  temperature?: number
  battery_level?: number
  external_power?: boolean
  recorded_at: string
  truck_id?: number
  driver_id?: number
  trip_id?: number
  raw_data?: Record<string, unknown>
}

const COLUMNS = [
  'tenant_id',
  'latitude',
  'longitude',
  'speed_kmh',
  'direction',
  'ignition',
  'odometer_km',
  'fuel_level',
  'fuel_consumption',
  'temperature',
  'battery_level',
  'external_power',
  'recorded_at',
  'truck_id',
  'driver_id',
  'trip_id',
  'raw_data',
]

function toRow(tenant_id: string, d: IngestData) {
  return [
    tenant_id,
    d.latitude,
    d.longitude,
    d.speed_kmh ?? null,
    d.direction ?? null,
    d.ignition ?? null,
    d.odometer_km ?? null,
    d.fuel_level ?? null,
    d.fuel_consumption ?? null,
    d.temperature ?? null,
    d.battery_level ?? null,
    d.external_power ?? null,
    d.recorded_at,
    d.truck_id ?? null,
    d.driver_id ?? null,
    d.trip_id ?? null,
    d.raw_data ? JSON.stringify(d.raw_data) : null,
  ]
}

function lastGpsJson(d: IngestData) {
  return JSON.stringify({
    lat: d.latitude,
    lng: d.longitude,
    speed: d.speed_kmh,
    timestamp: d.recorded_at,
  })
}

export async function ingestPosition(tenant_id: string, data: IngestData) {
  const cols = COLUMNS.join(', ')
  const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(', ')
  const values = toRow(tenant_id, data)

  const { rows } = await pool.query(`INSERT INTO gps_positions (${cols}) VALUES (${placeholders}) RETURNING *`, values)

  if (data.truck_id) {
    await pool.query(`UPDATE trucks SET last_gps_position = $1::jsonb WHERE id = $2 AND tenant_id = $3`, [
      lastGpsJson(data),
      data.truck_id,
      tenant_id,
    ])
  }

  return rows[0]
}

export async function batchIngest(tenant_id: string, dataArray: IngestData[]) {
  if (dataArray.length === 0) return []

  const values: unknown[] = []
  const placeholders: string[] = []
  let idx = 1

  for (const d of dataArray) {
    const row = toRow(tenant_id, d)
    const rowPlaceholders = row.map(() => `$${idx++}`).join(', ')
    placeholders.push(`(${rowPlaceholders})`)
    values.push(...row)
  }

  const cols = COLUMNS.join(', ')
  const { rows } = await pool.query(
    `INSERT INTO gps_positions (${cols}) VALUES ${placeholders.join(', ')} RETURNING *`,
    values,
  )

  const truckLatest = new Map<number, IngestData>()
  for (const d of dataArray) {
    if (d.truck_id) {
      const existing = truckLatest.get(d.truck_id)
      if (!existing || d.recorded_at > existing.recorded_at) {
        truckLatest.set(d.truck_id, d)
      }
    }
  }

  for (const [truckId, data] of truckLatest) {
    await pool.query(`UPDATE trucks SET last_gps_position = $1::jsonb WHERE id = $2 AND tenant_id = $3`, [
      lastGpsJson(data),
      truckId,
      tenant_id,
    ])
  }

  return rows
}

export async function getLatestForTruck(tenant_id: string, truckId: number) {
  const { rows } = await pool.query(
    `SELECT * FROM gps_positions
     WHERE tenant_id = $1 AND truck_id = $2
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [tenant_id, truckId],
  )
  if (!rows[0]) throw new NotFoundError('No GPS position found for this truck')
  return rows[0]
}

export async function getHistory(tenant_id: string, truckId: number, from: string, to: string) {
  const { rows } = await pool.query(
    `SELECT * FROM gps_positions
     WHERE tenant_id = $1 AND truck_id = $2
       AND recorded_at >= $3 AND recorded_at <= $4
     ORDER BY recorded_at ASC`,
    [tenant_id, truckId, from, to],
  )
  return rows
}
