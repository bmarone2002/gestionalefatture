#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ] || echo "$DATABASE_URL" | grep -q "placeholder"; then
  echo "ERRORE: DATABASE_URL non è collegata a PostgreSQL."
  echo "Su Railway apri il servizio dell'app (non il database) → Variables"
  echo "→ New Variable → Add a reference → Postgres → DATABASE_URL"
  echo "Poi fai Redeploy."
  exit 1
fi

npx prisma migrate deploy
node scripts/ensure-admin.mjs

PORT="${PORT:-3000}"
echo "Avvio Next.js su 0.0.0.0:${PORT}"
exec npx next start --hostname 0.0.0.0 --port "$PORT"
