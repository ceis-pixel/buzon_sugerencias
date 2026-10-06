#!/usr/bin/env bash
# ==============================================================================
# Buzón de Sugerencias - Comedor UNSCH
# Mantenimiento Nocturno y Purga Automatizada (Cron) - Operaciones OTI
# Purga de Hash Efímeros (48h) | Depuración de Imágenes Huérfanas | Archivador 90d
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Lee una clave puntual de .env sin evaluar el archivo (no ejecuta su contenido).
env_value() {
  [ -f "${PROJECT_ROOT}/.env" ] || return 0
  grep -E "^$1=" "${PROJECT_ROOT}/.env" | tail -n 1 | cut -d= -f2- | tr -d '\r'
}

# Configuración
# Solo se usan con psql nativo; en Docker el contenedor 'db' aporta sus propias credenciales.
POSTGRES_DB="${POSTGRES_DB:-$(env_value POSTGRES_DB)}"
POSTGRES_DB="${POSTGRES_DB:-buzon_comedor}"
POSTGRES_USER="${POSTGRES_USER:-$(env_value POSTGRES_USER)}"
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
  # Comillas simples: las variables se resuelven dentro del contenedor.
  # shellcheck disable=SC2016
  echo "${EPHEMERAL_SQL}" | docker compose -f "${COMPOSE_FILE}" exec -T db sh -c \
    'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
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
  # Rutina empaquetada en la imagen durante el build (npm run build:maintenance).
  docker compose -f "${COMPOSE_FILE}" exec -T app node maintenance/nightly-cleanup.cjs
elif command -v npm >/dev/null 2>&1; then
  log "Ejecutando mantenimiento en entorno local..."
  (cd "${PROJECT_ROOT}" && npm run maintenance)
else
  log "ERROR CRÍTICO: No se encontró el servicio 'app' en Docker Compose ni npm. La purga de fotografías no se ejecutó."
  exit 1
fi

log "MANTENIMIENTO NOCTURNO COMPLETADO SATISFACTORIAMENTE."
log "========================================================================"

exit 0
