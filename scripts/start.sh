#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ] || echo "$DATABASE_URL" | grep -q "placeholder"; then
  echo "ERRORE: DATABASE_URL non è collegata a PostgreSQL."
  echo "Su Railway apri il servizio dell'app (non il database) → Variables"
  echo "→ New Variable → Add a reference → Postgres → DATABASE_URL"
  echo "Poi fai Redeploy."
  exit 1
fi

if [ -z "$AUTH_SECRET" ]; then
  echo "ERRORE: AUTH_SECRET non è impostata sul servizio web."
  exit 1
fi

if [ -n "$AUTH_URL" ]; then
  AUTH_URL=$(printf '%s' "$AUTH_URL" | sed 's:/*$::')
  case "$AUTH_URL" in
    http://*|https://*) ;;
    *)
      AUTH_URL="https://$AUTH_URL"
      ;;
  esac
  export AUTH_URL
  export NEXTAUTH_URL="$AUTH_URL"
  echo "AUTH_URL=$AUTH_URL"
fi

npx prisma migrate deploy
node scripts/ensure-admin.mjs

PORT="${PORT:-3000}"
echo "Avvio Next.js su 0.0.0.0:${PORT} TZ=${TZ:-unset}"
exec npx next start --hostname 0.0.0.0 --port "$PORT"
