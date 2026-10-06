#!/usr/bin/env bash
# ==============================================================================
# Buzón de Sugerencias - Comedor UNSCH
# Mantenimiento Nocturno y Purga Automatizada (Cron) - Operaciones OTI
# Purga de Hash Efímeros (48h) | Depuración de Imágenes Huérfanas | Archivador 90d
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Configuración
POSTGRES_DB="${POSTGRES_DB:-buzon_comedor}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
LOGS_DIR="${PROJECT_ROOT}/logs"
mkdir -p "${LOGS_DIR}"
LOG_FILE="${LOGS_DIR}/maintenance.log"

LOG_TIME() {
  TZ="America/Lima" date +"%Y-%m-%d %H:%M:%S UTC-5"
}

log() {
  local msg="[$(LOG_TIME)] $1"
  echo "${msg}"
  echo "${msg}" >> "${LOG_FILE}"
}

log "========================================================================"
log "INICIO DE RUTINA NOCTURNA DE MANTENIMIENTO - BUZÓN COMEDOR UNSCH"

# ------------------------------------------------------------------------------
# 1. Purga de Hash Efímeros (submission_rate_limits y menu_rating_limits > 48h)
# ------------------------------------------------------------------------------
log "1. Ejecutando depuración de hash efímeros anti-spam (> 48 horas)..."

EPHEMERAL_SQL="
BEGIN;
DELETE FROM public.submission_rate_limits
 WHERE created_at <= now() - interval '48 hours'
    OR submission_date < CURRENT_DATE - 2;

DELETE FROM public.menu_rating_limits
 WHERE created_at <= now() - interval '48 hours'
    OR rating_date < CURRENT_DATE - 2;
COMMIT;
"

if command -v docker >/dev/null 2>&1 && docker compose -f "${COMPOSE_FILE}" ps --services 2>/dev/null | grep -q "^db$"; then
  docker compose -f "${COMPOSE_FILE}" exec -T db sh -c \
    "psql -U \"${POSTGRES_USER}\" -d \"${POSTGRES_DB}\" -c \"${EPHEMERAL_SQL}\""
  log "Depuración de hash efímeros en PostgreSQL ejecutada vía contenedor db."
elif command -v psql >/dev/null 2>&1; then
  psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "${EPHEMERAL_SQL}"
  log "Depuración de hash efímeros en PostgreSQL ejecutada vía psql."
else
  log "ADVERTENCIA: Motor de base de datos no alcanzable directamente por CLI. Delegando al ejecutor Node.js."
fi

# ------------------------------------------------------------------------------
# 2. Ejecutar Mantenimiento de Almacenamiento y Huérfanos
# ------------------------------------------------------------------------------
log "2. Ejecutando purga de medios resueltos (> 90d) y archivos huérfanos..."

if command -v docker >/dev/null 2>&1 && docker compose -f "${COMPOSE_FILE}" ps --services 2>/dev/null | grep -q "^app$"; then
  log "Ejecutando mantenimiento en contenedor 'app'..."
  docker compose -f "${COMPOSE_FILE}" exec -T app npm run maintenance
elif command -v npm >/dev/null 2>&1; then
  log "Ejecutando mantenimiento en entorno local..."
  (cd "${PROJECT_ROOT}" && npm run maintenance)
else
  log "ADVERTENCIA: No se pudo ejecutar 'npm run maintenance'. Verifique el entorno."
fi

log "MANTENIMIENTO NOCTURNO COMPLETADO SATISFACTORIAMENTE."
log "========================================================================"

exit 0
