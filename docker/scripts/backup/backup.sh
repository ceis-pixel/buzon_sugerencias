#!/usr/bin/env bash
# ==============================================================================
# Buzón de Sugerencias - Comedor UNSCH
# Script de Respaldo Automatizado (Disaster Recovery) - Operaciones OTI
# RPO < 24h | Retención Local: 7 días | Zona Horaria: UTC-5 (America/Lima)
# ==============================================================================

set -euo pipefail

# Determinar directorio raíz del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Lee una clave puntual de .env sin evaluar el archivo (no ejecuta su contenido).
env_value() {
  [ -f "${PROJECT_ROOT}/.env" ] || return 0
  grep -E "^$1=" "${PROJECT_ROOT}/.env" | tail -n 1 | cut -d= -f2- | tr -d '\r'
}

# Configuración y Parámetros
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
# Solo se usan con pg_dump nativo; en Docker el contenedor 'db' aporta sus propias credenciales.
POSTGRES_DB="${POSTGRES_DB:-$(env_value POSTGRES_DB)}"
POSTGRES_DB="${POSTGRES_DB:-buzon_comedor}"
POSTGRES_USER="${POSTGRES_USER:-$(env_value POSTGRES_USER)}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-buzon-comedor-unsch_app_uploads}"
UPLOADS_DIR="${UPLOADS_DIR:-${PROJECT_ROOT}/uploads}"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"

# Crear directorio de respaldos si no existe
mkdir -p "${BACKUP_DIR}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Marcas de tiempo en zona horaria UTC-5 (America/Lima)
TIMESTAMP="$(TZ="America/Lima" date +"%Y%m%d_%H%M%S")"
LOG_TIME() {
  TZ="America/Lima" date +"%Y-%m-%d %H:%M:%S UTC-5"
}

log() {
  local msg="[$(LOG_TIME)] $1"
  echo "${msg}"
  echo "${msg}" >> "${LOG_FILE}"
}

log "========================================================================"
log "INICIO DE RESPALDO AUTOMATIZADO - BUZÓN COMEDOR UNSCH"
log "Directorio de destino: ${BACKUP_DIR}"

# ------------------------------------------------------------------------------
# 1. Respaldo de Base de Datos PostgreSQL
# ------------------------------------------------------------------------------
DB_BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
log "Generando volcado de PostgreSQL en ${DB_BACKUP_FILE}..."

if command -v docker >/dev/null 2>&1 && docker compose -f "${COMPOSE_FILE}" ps --services 2>/dev/null | grep -q "^db$"; then
  log "Usando contenedor Docker Compose (servicio 'db')..."
  # Comillas simples: las variables se resuelven dentro del contenedor.
  # shellcheck disable=SC2016
  docker compose -f "${COMPOSE_FILE}" exec -T db sh -c \
    'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' | gzip > "${DB_BACKUP_FILE}"
elif command -v pg_dump >/dev/null 2>&1; then
  log "Usando binario nativo pg_dump..."
  pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists | gzip > "${DB_BACKUP_FILE}"
else
  log "ERROR CRÍTICO: No se encontró el servicio 'db' en Docker Compose ni el binario pg_dump. No se generó ningún respaldo."
  log "Verifique que la pila esté en ejecución y que este usuario pueda usar Docker (grupo 'docker')."
  exit 1
fi

# Validación de integridad del archivo gzip de PostgreSQL
if [ ! -s "${DB_BACKUP_FILE}" ]; then
  log "ERROR CRÍTICO: El archivo de volcado ${DB_BACKUP_FILE} está vacío o no se generó."
  exit 1
fi

if ! gzip -t "${DB_BACKUP_FILE}"; then
  log "ERROR CRÍTICO: El archivo de volcado ${DB_BACKUP_FILE} está corrupto (falló prueba gzip)."
  exit 1
fi

DB_SIZE="$(du -h "${DB_BACKUP_FILE}" | cut -f1)"
log "Volcado de PostgreSQL verificado con éxito (${DB_SIZE})."

# ------------------------------------------------------------------------------
# 2. Respaldo del Volumen de Archivos / Fotografías
# ------------------------------------------------------------------------------
UPLOADS_BACKUP_FILE="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
log "Generando tarball de almacenamiento de fotos en ${UPLOADS_BACKUP_FILE}..."

if command -v docker >/dev/null 2>&1 && docker volume inspect "${UPLOADS_VOLUME}" >/dev/null 2>&1; then
  log "Extrayendo desde volumen Docker '${UPLOADS_VOLUME}'..."
  docker run --rm \
    -v "${UPLOADS_VOLUME}:/data:ro" \
    -v "${BACKUP_DIR}:/backup" \
    alpine tar -czf "/backup/uploads_${TIMESTAMP}.tar.gz" -C /data .
elif [ -d "/app/uploads" ]; then
  log "Extrayendo desde directorio /app/uploads..."
  tar -czf "${UPLOADS_BACKUP_FILE}" -C /app/uploads .
elif [ -d "${UPLOADS_DIR}" ]; then
  log "Extrayendo desde directorio local ${UPLOADS_DIR}..."
  tar -czf "${UPLOADS_BACKUP_FILE}" -C "${UPLOADS_DIR}" .
else
  log "ERROR CRÍTICO: No se encontró el volumen '${UPLOADS_VOLUME}' ni un directorio de fotografías. Respaldo incompleto."
  log "Si el proyecto de Compose tiene otro nombre, defina UPLOADS_VOLUME con el volumen correcto."
  exit 1
fi

# Validación de integridad del archivo tar.gz
if [ ! -s "${UPLOADS_BACKUP_FILE}" ]; then
  log "ERROR CRÍTICO: El archivo ${UPLOADS_BACKUP_FILE} está vacío o no se generó."
  exit 1
fi

if ! tar -tzf "${UPLOADS_BACKUP_FILE}" >/dev/null 2>&1; then
  log "ERROR CRÍTICO: El tarball ${UPLOADS_BACKUP_FILE} está corrupto (falló verificación tar)."
  exit 1
fi

UPLOADS_SIZE="$(du -h "${UPLOADS_BACKUP_FILE}" | cut -f1)"
log "Tarball de fotografías verificado con éxito (${UPLOADS_SIZE})."

# ------------------------------------------------------------------------------
# 3. Política de Retención Local (7 días)
# ------------------------------------------------------------------------------
log "Aplicando política de retención: eliminando respaldos con más de ${RETENTION_DAYS} días..."

# Eliminar volcados de base de datos antiguos
DELETED_DB_COUNT=0
while IFS= read -r old_file; do
  if [ -n "${old_file}" ]; then
    rm -f "${old_file}"
    log "Archivo antiguo purgado: $(basename "${old_file}")"
    DELETED_DB_COUNT=$((DELETED_DB_COUNT + 1))
  fi
done < <(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" 2>/dev/null || true)

# Eliminar tarballs de uploads antiguos
DELETED_UPLOADS_COUNT=0
while IFS= read -r old_file; do
  if [ -n "${old_file}" ]; then
    rm -f "${old_file}"
    log "Archivo antiguo purgado: $(basename "${old_file}")"
    DELETED_UPLOADS_COUNT=$((DELETED_UPLOADS_COUNT + 1))
  fi
done < <(find "${BACKUP_DIR}" -name "uploads_*.tar.gz" -mtime +"${RETENTION_DAYS}" 2>/dev/null || true)

log "Archivos antiguos purgados: ${DELETED_DB_COUNT} bases de datos, ${DELETED_UPLOADS_COUNT} tarballs de fotos."

# ------------------------------------------------------------------------------
# 4. Resumen y Registro de Auditoría
# ------------------------------------------------------------------------------
log "RESPALDO COMPLETADO EXITOSAMENTE"
log "Respaldo DB:      $(basename "${DB_BACKUP_FILE}") (${DB_SIZE})"
log "Respaldo Medios:  $(basename "${UPLOADS_BACKUP_FILE}") (${UPLOADS_SIZE})"
log "========================================================================"

exit 0
