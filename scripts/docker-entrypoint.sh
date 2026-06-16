#!/bin/sh
set -e

echo "[Entrypoint] $(date -u +%Y-%m-%dT%H:%M:%SZ) Running database migrations..."
node scripts/migrate.js

if [ -f dist/main.js ]; then
  MAIN=dist/main.js
elif [ -f dist/src/main.js ]; then
  MAIN=dist/src/main.js
else
  echo "[Entrypoint] Error: compiled entrypoint not found in dist/"
  find dist 2>/dev/null || true
  exit 1
fi

echo "[Entrypoint] $(date -u +%Y-%m-%dT%H:%M:%SZ) Starting application (${MAIN})..."
exec node "$MAIN"
