#!/bin/sh
# Applies the project migrations in lexical order on first database start.
# Runs inside postgres:16-alpine through /docker-entrypoint-initdb.d, after
# 00_supabase_compat.sql. Any SQL error aborts the initialization.
set -e

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/sql/migrations}"
SEED_FILE="${SEED_FILE:-/sql/seed.sql}"

run_sql() {
  psql -v ON_ERROR_STOP=1 --no-psqlrc --quiet \
    --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --file "$1"
}

for migration in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$migration" ] || continue

  case "$(basename "$migration")" in
    # Supabase Storage bucket and its policies: replaced on-premise by the
    # app_uploads volume served through /api/upload and /uploads.
    *_create_storage_bucket.sql)
      echo "[initdb] Omitida (solo Supabase Storage): $(basename "$migration")"
      continue
      ;;
  esac

  echo "[initdb] Aplicando migración: $(basename "$migration")"
  run_sql "$migration"
done

if [ -f "$SEED_FILE" ]; then
  echo "[initdb] Aplicando datos semilla: $(basename "$SEED_FILE")"
  run_sql "$SEED_FILE"
fi

echo "[initdb] Esquema del Buzón de Sugerencias inicializado."
