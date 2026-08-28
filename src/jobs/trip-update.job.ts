import { pool } from '../shared/db.js'
import { logger } from '../utils/logger.js'
import { BaseJob, type JobContext, type JobResult } from '../shared/job.js'
import cron from 'node-cron'

interface TripUpdateRow {
  id: number
  trip_number: string
  driver_id: number | null
  truck_id: number | null
  tenant_id: string
  estimated_arrival_at?: string | null
}

async function pendingToInProgress(): Promise<TripUpdateRow[]> {
  const { rows } = await pool.query<TripUpdateRow>(`
    UPDATE trips
    SET status = 'in_progress', updated_at = NOW()
    WHERE status = 'pending'
      AND departure_at <= NOW()
    RETURNING id, trip_number, driver_id, truck_id, tenant_id
  `)
  return rows
}

async function inProgressToCompleted(): Promise<TripUpdateRow[]> {
  const { rows } = await pool.query<TripUpdateRow>(`
    UPDATE trips
    SET status = 'completed', updated_at = NOW()
    WHERE status = 'in_progress'
      AND actual_arrival_at <= NOW()
      AND actual_arrival_at IS NOT NULL
    RETURNING id, trip_number, driver_id, truck_id, tenant_id
  `)
  return rows
}

async function markDelayed(): Promise<TripUpdateRow[]> {
  const { rows } = await pool.query<TripUpdateRow>(`
    UPDATE trips
    SET status = 'delayed', updated_at = NOW()
    WHERE status = 'in_progress'
      AND estimated_arrival_at IS NOT NULL
      AND estimated_arrival_at + INTERVAL '2 hours' <= NOW()
    RETURNING id, trip_number, driver_id, truck_id, tenant_id, estimated_arrival_at
  `)
  return rows
}

async function createNotification(
  tenantId: string,
  userId: number | null,
  title: string,
  message: string,
): Promise<void> {
  if (!userId) return
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, title, message, 'trip_update', tenantId],
  )
}

interface AlertCreateData {
  type: string
  severity: string
  title: string
  message: string
  resource_type: string
  resource_id: number
  truck_id: number | null
  driver_id: number | null
  trip_id: number | null
}

async function createAlert(tenantId: string, data: AlertCreateData): Promise<void> {
  await pool.query(
    `INSERT INTO alerts
       (type, severity, title, description, resource_type, resource_id,
        truck_id, driver_id, trip_id, tenant_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      data.type,
      data.severity,
      data.title,
      data.message,
      data.resource_type ?? 'trip',
      data.resource_id ?? null,
      data.truck_id ?? null,
      data.driver_id ?? null,
      data.trip_id ?? null,
      tenantId,
    ],
  )
}

async function getDriverUserId(driverId: number | null): Promise<number | null> {
  if (!driverId) return null
  const { rows } = await pool.query<{ user_id: number | null }>('SELECT user_id FROM drivers WHERE id = $1', [driverId])
  return rows[0]?.user_id ?? null
}

class TripUpdateJob extends BaseJob {
  readonly name = 'trip-update'

  async execute(_ctx: JobContext): Promise<JobResult> {
    let processed = 0
    let errors = 0

    const started = await pendingToInProgress()
    for (const trip of started) {
      try {
        const userId = await getDriverUserId(trip.driver_id)
        await createNotification(
          trip.tenant_id,
          userId,
          `Viaje ${trip.trip_number} iniciado`,
          `El viaje ${trip.trip_number} se inicio automaticamente.`,
        )
        processed++
        logger.info(`Viaje auto-iniciado: ${trip.trip_number}`, { trip_id: trip.id })
      } catch (err) {
        errors++
        logger.error(`La notificacion de viaje auto-iniciado fallo`, { error: err, trip_id: trip.id })
      }
    }

    const completed = await inProgressToCompleted()
    for (const trip of completed) {
      try {
        const userId = await getDriverUserId(trip.driver_id)
        await createNotification(
          trip.tenant_id,
          userId,
          `Viaje ${trip.trip_number} completado`,
          `El viaje ${trip.trip_number} se completo automaticamente.`,
        )
        processed++
        logger.info(`Viaje auto-completado: ${trip.trip_number}`, { trip_id: trip.id })
      } catch (err) {
        errors++
        logger.error(`La notificacion de viaje auto-completado fallo`, { error: err, trip_id: trip.id })
      }
    }

    const delayed = await markDelayed()
    for (const trip of delayed) {
      try {
        await createAlert(trip.tenant_id, {
          type: 'trip_delayed',
          severity: 'warning',
          title: `Viaje ${trip.trip_number} retrasado`,
          message: `El viaje ${trip.trip_number} esta retrasado respecto a la llegada estimada (${trip.estimated_arrival_at ?? 'desconocida'}).`,
          resource_type: 'trip',
          resource_id: trip.id,
          truck_id: trip.truck_id ?? null,
          driver_id: trip.driver_id ?? null,
          trip_id: trip.id,
        })
        processed++
        logger.warn(`Viaje auto-retrasado: ${trip.trip_number}`, { trip_id: trip.id })
      } catch (err) {
        errors++
        logger.error(`La alerta de viaje auto-retrasado fallo`, { error: err, trip_id: trip.id })
      }
    }

    return { success: true, processed, errors, duration: 0 }
  }
}

export function startTripUpdate(): void {
  const job = new TripUpdateJob()
  cron.schedule('*/60 * * * * *', () => {
    job.run().catch((err) => logger.error('Error en el cron de actualizacion de viajes', { error: err }))
  })
  logger.info('Actualizacion de viajes iniciada (cada 60s)')
}
