#!/bin/sh
set -e
cd "$(dirname "$0")/.."
mkdir -p backups
FILE="backups/archivia-$(date +%Y%m%d-%H%M%S).sql"
docker compose exec -T db pg_dump -U archivia archivia > "$FILE"
echo "Backup creato: $FILE"
