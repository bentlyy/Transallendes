import 'dotenv/config';
import { resolve } from 'path';
import fs from 'fs';
import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';

const MIGRATIONS_DIR = resolve(process.cwd(), 'db/migrations');
const INIT_SQL_PATH = resolve(process.cwd(), 'db/init.sql');

const run = async (): Promise<void> => {
  logger.info('Migration runner started');

  const { rows: existing } = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' LIMIT 1`
  );
  const schemaExists = existing.length > 0;

  if (!schemaExists && fs.existsSync(INIT_SQL_PATH)) {
    logger.info('Applying init.sql...');
    const initSql = fs.readFileSync(INIT_SQL_PATH, 'utf-8');
    await pool.query(initSql);
    logger.info('init.sql applied');
  } else {
    logger.info('Schema already initialized, skipping init.sql');
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT NOW())`
  );

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.info('No migrations directory found');
    await pool.end();
    return;
  }

  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  logger.info(`Found ${migrationFiles.length} migration files`);

  for (const file of migrationFiles) {
    const already = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
    if (already.rows.length > 0) {
      logger.info(`Migration ${file} already applied, skipping`);
      continue;
    }

    logger.info(`Applying migration ${file}...`);
    const sql = fs.readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8');
    try {
      await pool.query(sql);
    } catch (err) {
      logger.error(`Error in migration ${file}`, {
        error: (err as Error).message,
        sql: sql.slice(0, 200),
      });
      throw err;
    }
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    logger.info(`Migration ${file} applied`);
  }

  logger.info('All migrations applied');
  await pool.end();
};

run().catch((err) => {
  logger.error('Migration runner failed', { error: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});
