#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL no definido" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
mkdir -p "$BACKUP_DIR"
STAMP=$(date +"%Y%m%d_%H%M%S")
OUT="$BACKUP_DIR/imperial_fitness_$STAMP.dump"

pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$OUT"
gzip -f "$OUT"
echo "Backup PostgreSQL creado: $OUT.gz"