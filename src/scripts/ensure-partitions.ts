import { pool } from '../shared/db.js'
import { logger } from '../utils/logger.js'

export async function ensurePartitions(): Promise<void> {
  const client = await pool.connect()
  try {
    const now = new Date()
    const monthsToCreate = 3

    for (let i = 0; i < monthsToCreate; i++) {
      const target = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const suffix = `${target.getFullYear()}_${String(target.getMonth() + 1).padStart(2, '0')}`
      const startDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-01`
      const endDate = new Date(target.getFullYear(), target.getMonth() + 1, 1)
      const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-01`

      await client.query(
        `CREATE TABLE IF NOT EXISTS gps_positions_${suffix} PARTITION OF gps_positions
         FOR VALUES FROM ('${startDate}') TO ('${endStr}')`,
      )
      logger.info(`Partition gps_positions_${suffix} ensured`)
    }
  } catch (err) {
    logger.error('Failed to ensure GPS partitions', { error: (err as Error).message })
  } finally {
    client.release()
  }
}

if (process.argv[1]?.endsWith('ensure-partitions.ts')) {
  ensurePartitions()
    .then(() => {
      logger.info('Partition check complete')
      process.exit(0)
    })
    .catch((err) => {
      logger.error('Partition check failed', { error: (err as Error).message })
      process.exit(1)
    })
}
