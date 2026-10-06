import { pool } from '../shared/db.js'
import { logger } from '../utils/logger.js'

interface Migration {
  name: string
  sql: string
}

const MIGRATIONS: Migration[] = [
  {
    name: '001_add_reports_updated_at_trigger',
    sql: `CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
  },
]

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT NOW()
    )`,
  )
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query('SELECT name FROM _migrations')
  return new Set(rows.map((r) => r.name))
}

async function run(): Promise<void> {
  logger.info('Starting migrations...')
  await ensureMigrationsTable()
  const applied = await getAppliedMigrations()

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) {
      logger.info(`Migration ${migration.name} already applied, skipping`)
      continue
    }

    try {
      await pool.query(migration.sql)
      await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [migration.name])
      logger.info(`Migration ${migration.name} applied successfully`)
    } catch (err) {
      logger.error(`Migration ${migration.name} failed`, { error: (err as Error).message })
      throw err
    }
  }

  logger.info('All migrations completed')
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
