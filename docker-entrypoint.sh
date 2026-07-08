#!/bin/sh
set -e

cleanup() {
  echo "Shutting down..."
  [ -n "$SIM_PID" ] && kill "$SIM_PID" 2>/dev/null
  exit 0
}
trap cleanup SIGTERM SIGINT

echo "Running database seed..."
npm run seed

echo "Starting GPS simulation..."
npx tsx src/scripts/simulate.ts &
SIM_PID=$!

echo "Starting application..."
exec npm run dev
