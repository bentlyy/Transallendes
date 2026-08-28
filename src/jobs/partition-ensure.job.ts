import cron from 'node-cron'
import { pool } from '../shared/db.js'
import { logger } from '../utils/logger.js'

export function startPartitionEnsure(): void {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Verificando particiones: proximos 3 meses')
    const client = await pool.connect()
    try {
      const now = new Date()
      for (let i = 0; i < 3; i++) {
        const target = new Date(now.getFullYear(), now.getMonth() + i, 1)
        const suffix = `${target.getFullYear()}_${String(target.getMonth() + 1).padStart(2, '0')}`
        const startDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-01`
        const endDate = new Date(target.getFullYear(), target.getMonth() + 1, 1)
        const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-01`

        await client.query(
          `CREATE TABLE IF NOT EXISTS gps_positions_${suffix} PARTITION OF gps_positions
           FOR VALUES FROM ('${startDate}') TO ('${endStr}')`,
        )
      }
      logger.info('Garantia de particiones completada')
    } catch (err) {
      logger.error('La garantia de particiones fallo', { error: (err as Error).message })
    } finally {
      client.release()
    }
  })
}
