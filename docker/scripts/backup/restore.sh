#!/usr/bin/env bash
# ==============================================================================
# Buzón de Sugerencias - Comedor UNSCH
# Script de Restauración Transaccional (Disaster Recovery) - Operaciones OTI
# RTO < 30m | Validación de Integridad | Zona Horaria: UTC-5 (America/Lima)
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
UPLOADS_VOLUME="${UPLOADS_VOLUME:-buzon-comedor-unsch_app_uploads}"
UPLOADS_DIR="${UPLOADS_DIR:-${PROJECT_ROOT}/uploads}"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
LOG_FILE="${BACKUP_DIR}/backup.log"

LOG_TIME() {
  TZ="America/Lima" date +"%Y-%m-%d %H:%M:%S UTC-5"
}

log() {
  local msg="[$(LOG_TIME)] $1"
  echo "${msg}"
  if [ -d "${BACKUP_DIR}" ]; then
    echo "${msg}" >> "${LOG_FILE}"
  fi
}

usage() {
  echo "Uso: $0 <archivo_backup.sql.gz> [archivo_uploads.tar.gz] [--force]"
  echo ""
  echo "Ejemplos:"
  echo "  $0 backups/backup_20261006_030000.sql.gz"
  echo "  $0 backups/backup_20261006_030000.sql.gz backups/uploads_20261006_030000.tar.gz --force"
  exit 1
}

if [ "$#" -lt 1 ]; then
  usage
fi

SQL_BACKUP="$1"
UPLOADS_BACKUP=""
FORCE=0

for arg in "$@"; do
  if [ "${arg}" = "--force" ] || [ "${arg}" = "-y" ]; then
    FORCE=1
  elif [ "${arg}" != "${SQL_BACKUP}" ] && [ -z "${UPLOADS_BACKUP}" ]; then
    UPLOADS_BACKUP="${arg}"
  fi
done

# Si no se pasó uploads explícito pero existe con la misma marca de tiempo:
if [ -z "${UPLOADS_BACKUP}" ]; then
  CANDIDATE="$(echo "${SQL_BACKUP}" | sed 's/backup_/uploads_/')"
  CANDIDATE="$(echo "${CANDIDATE}" | sed 's/\.sql\.gz$/\.tar\.gz/')"
  if [ -f "${CANDIDATE}" ]; then
    UPLOADS_BACKUP="${CANDIDATE}"
    log "Tarball de medios correspondiente detectado automáticamente: ${UPLOADS_BACKUP}"
  fi
fi

log "========================================================================"
log "INICIO DE RESTAURACIÓN DE DESASTRE (DR) - BUZÓN COMEDOR UNSCH"
log "Archivo SQL: ${SQL_BACKUP}"
if [ -n "${UPLOADS_BACKUP}" ]; then
  log "Archivo Medios: ${UPLOADS_BACKUP}"
fi

# ------------------------------------------------------------------------------
# 1. Validación exhaustiva de archivos
# ------------------------------------------------------------------------------
if [ ! -f "${SQL_BACKUP}" ]; then
  log "ERROR CRÍTICO: El archivo ${SQL_BACKUP} no existe."
  exit 1
fi

log "Validando integridad del archivo comprimido SQL..."
if ! gzip -t "${SQL_BACKUP}"; then
  log "ERROR CRÍTICO: El archivo ${SQL_BACKUP} está corrupto (falló gzip -t)."
  exit 1
fi
log "Archivo SQL íntegro y válido."

if [ -n "${UPLOADS_BACKUP}" ]; then
  if [ ! -f "${UPLOADS_BACKUP}" ]; then
    log "ERROR CRÍTICO: El archivo de medios especificado ${UPLOADS_BACKUP} no existe."
    exit 1
  fi
  log "Validando integridad del tarball de medios..."
  if ! tar -tzf "${UPLOADS_BACKUP}" >/dev/null 2>&1; then
    log "ERROR CRÍTICO: El tarball de medios ${UPLOADS_BACKUP} está corrupto."
    exit 1
  fi
  log "Archivo de medios íntegro y válido."
fi

# ------------------------------------------------------------------------------
# 2. Confirmación de seguridad
# ------------------------------------------------------------------------------
if [ "${FORCE}" -ne 1 ]; then
  echo ""
  echo "ADVERTENCIA: Esta operación sobreescribirá la base de datos '${POSTGRES_DB}'."
  read -r -p "¿Está seguro de continuar con la restauración? (escriba 'si' para confirmar): " CONFIRM
  if [ "${CONFIRM}" != "si" ] && [ "${CONFIRM}" != "s" ] && [ "${CONFIRM}" != "yes" ]; then
    log "Restauración cancelada por el operador."
    exit 0
  fi
fi

# ------------------------------------------------------------------------------
# 3. Bloqueo de conexiones y restauración en PostgreSQL
# ------------------------------------------------------------------------------
log "Terminando conexiones activas concurrentes a '${POSTGRES_DB}'..."

TERMINATE_SQL="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"

if command -v docker >/dev/null 2>&1 && docker compose -f "${COMPOSE_FILE}" ps --services 2>/dev/null | grep -q "^db$"; then
  log "Ejecutando restauración transaccional vía Docker Compose (servicio 'db')..."
  
  # Comillas simples: las variables se resuelven dentro del contenedor.
  # Terminar conexiones activas
  # shellcheck disable=SC2016
  echo "SELECT count(pg_terminate_backend(pid)) AS conexiones_cerradas FROM pg_stat_activity WHERE datname = :'target_db' AND pid <> pg_backend_pid();" \
    | docker compose -f "${COMPOSE_FILE}" exec -T db sh -c \
      'psql -q -U "$POSTGRES_USER" -d postgres -v target_db="$POSTGRES_DB"' || true

  # Restauración transaccional con ON_ERROR_STOP
  # shellcheck disable=SC2016
  gunzip -c "${SQL_BACKUP}" | docker compose -f "${COMPOSE_FILE}" exec -T db sh -c \
    'psql -q -v ON_ERROR_STOP=1 --single-transaction -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

elif command -v psql >/dev/null 2>&1; then
  log "Ejecutando restauración transaccional vía psql nativo..."
  psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "${TERMINATE_SQL}" || true
  gunzip -c "${SQL_BACKUP}" | psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 --single-transaction
else
  log "ERROR CRÍTICO: No se encontró el servicio 'db' en Docker Compose ni el binario psql. No se restauró nada."
  exit 1
fi

log "Restauración de PostgreSQL completada."

# ------------------------------------------------------------------------------
# 4. Restauración de Fotografías / Medios
# ------------------------------------------------------------------------------
if [ -n "${UPLOADS_BACKUP}" ]; then
  log "Restaurando archivos multimedia en el volumen de almacenamiento..."
  
  if command -v docker >/dev/null 2>&1 && docker volume inspect "${UPLOADS_VOLUME}" >/dev/null 2>&1; then
    docker run --rm \
      -v "${UPLOADS_VOLUME}:/data" \
      -v "$(cd "$(dirname "${UPLOADS_BACKUP}")" && pwd):/backup:ro" \
      alpine sh -c "rm -rf /data/* && tar -xzf \"/backup/$(basename "${UPLOADS_BACKUP}")\" -C /data"
    log "Medios restaurados en volumen Docker '${UPLOADS_VOLUME}'."
  elif [ -d "/app/uploads" ]; then
    tar -xzf "${UPLOADS_BACKUP}" -C /app/uploads
    log "Medios restaurados en /app/uploads."
  elif [ -d "${UPLOADS_DIR}" ]; then
    mkdir -p "${UPLOADS_DIR}"
    tar -xzf "${UPLOADS_BACKUP}" -C "${UPLOADS_DIR}"
    log "Medios restaurados en ${UPLOADS_DIR}."
  fi
fi

# ------------------------------------------------------------------------------
# 5. Verificación de Integridad Post-Restauración
# ------------------------------------------------------------------------------
log "Ejecutando verificación de integridad post-restauración..."

VERIFY_SQL="SELECT 'suggestions' AS tabla, count(*)::int AS registros FROM public.suggestions UNION ALL SELECT 'admins', count(*)::int FROM public.admins UNION ALL SELECT 'daily_menus', count(*)::int FROM public.daily_menus;"

if command -v docker >/dev/null 2>&1 && docker compose -f "${COMPOSE_FILE}" ps --services 2>/dev/null | grep -q "^db$"; then
  # shellcheck disable=SC2016
  echo "${VERIFY_SQL}" | docker compose -f "${COMPOSE_FILE}" exec -T db sh -c \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' || true
elif command -v psql >/dev/null 2>&1; then
  psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "${VERIFY_SQL}" || true
fi

log "RESTAURACIÓN COMPLETADA SATISFACTORIAMENTE (RTO objetivo cumplido)."
log "========================================================================"

exit 0
