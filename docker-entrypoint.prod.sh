#!/bin/sh
set -e

echo "Waiting for database..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let attempts = 0;
const tryConnect = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('Database ready');
    process.exit(0);
  } catch (e) {
    attempts++;
    if (attempts >= 30) { console.error('Database not reachable'); process.exit(1); }
    setTimeout(tryConnect, 5000);
  }
};
tryConnect();
"

echo "Running database seed..."
node dist/seed/seed.js

echo "Starting application..."
exec node dist/app.js
