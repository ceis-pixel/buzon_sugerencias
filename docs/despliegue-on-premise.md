# Despliegue on-premise (OTI UNSCH)

Guía para ejecutar el Buzón de Sugerencias del Comedor UNSCH en un servidor
Linux institucional (Debian/Ubuntu) con Docker. El sistema es autónomo: la
aplicación, la base de datos y las fotografías residen en el servidor de la
universidad. La única dependencia externa es el inicio de sesión con Google
Workspace institucional.

## Arquitectura

| Servicio | Imagen | Persistencia | Red |
| --- | --- | --- | --- |
| `app` | `Dockerfile` multietapa (`node:24-alpine`, Next.js *standalone*, usuario `nextjs:nodejs`, UID/GID 1001) | Volumen `app_uploads` en `/app/uploads` | `backend` + `frontend` (puerto 3000 interno) |
| `db` | `postgres:16-alpine` | Volumen `postgres_data` | `backend` (interna, sin puertos publicados ni salida a internet) |
| `proxy` | `nginx:1.27-alpine` (perfil `production`) | Configuración `docker/nginx/nginx.conf` | `frontend` (publica el puerto 80/443 perimetral) |

- **Seguridad Perimetral (Nginx):** Ocultación de tokens de servidor (`server_tokens off`), rate limiting por IP (`limit_req_zone` 5r/s con burst 10) en `/api/upload`, `/api/auth` y `/login`, y cabeceras HTTP estrictas (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, y `Content-Security-Policy` balanceada sin `'unsafe-eval'`).
- **Blindaje de Archivos:** Validación binaria de magic bytes (WebP y JPEG) en `/api/upload`, rechazo de URLs externas en `photo_url`, y defensa contra Path Traversal con `path.basename`.
- **Sanitización Defensiva:** Escape de entidades HTML en `message` y `response_text` contra XSS, y escudo centralizado de excepciones de base de datos para prevenir filtraciones de esquema, tablas o consultas SQL.

- **Autenticación:** NextAuth.js con Google Workspace SSO. La sesión es una
  cookie cifrada (JWT); no existe tabla de usuarios.
- **Datos:** acceso nativo a PostgreSQL mediante un pool `pg` (`src/lib/db`).
- **Fotografías:** se comprimen en el navegador a WebP (~120 KB) y se envían a
  `POST /api/upload`, que las guarda en `/app/uploads/[turno/]AAAA/MM/<uuid>.webp`.
  `GET /uploads/...` las sirve con caché inmutable.
- **Salud:** `GET /api/health` responde 200 si PostgreSQL contesta y el volumen
  de fotografías admite escritura. El campo `checks.auth` indica si los
  secretos de autenticación están completos.

## Requisitos

- Docker Engine 24 o superior con el complemento Docker Compose v2.
- Puerto 3000 disponible. En producción antepón un proxy inverso con TLS.
- Salida HTTPS desde el contenedor `app` hacia `accounts.google.com` y
  `oauth2.googleapis.com`.
- Credenciales OAuth de Google Workspace (ver la siguiente sección).

## Credenciales de Google Workspace

1. En Google Cloud Console, con una cuenta de la organización `unsch.edu.pe`,
   crea un proyecto y configura la pantalla de consentimiento OAuth como
   **Interna** (solo cuentas de la organización).
2. Crea un ID de cliente OAuth de tipo *Aplicación web* con:
   - Origen autorizado: el valor de `NEXTAUTH_URL` (por ejemplo `https://buzon-comedor.unsch.edu.pe`).
   - URI de redireccionamiento autorizado: `<NEXTAUTH_URL>/api/auth/callback/google`.
3. Copia el ID y el secreto del cliente en `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

Solo se solicitan los permisos `openid` y `email`. No se pide el nombre ni la
fotografía del perfil.

## Puesta en marcha

```bash
cp .env.example .env
# Edita .env y reemplaza todos los valores de ejemplo (ver la tabla siguiente).
npm run docker:build      # docker compose build
npm run docker:up         # docker compose up -d (app + db)

# O para levantar la pila completa con Nginx Reverse Proxy institucional (perfil producción):
docker compose --profile production up -d

docker compose ps         # los servicios deben figurar como "healthy" o "Up"
curl http://localhost:3000/api/health
curl http://localhost/api/health # a través del proxy perimetral Nginx
```

Otros comandos: `npm run docker:logs` y `npm run docker:down`.

## Variables de entorno

El archivo `.env` no se versiona ni entra en la imagen (`.dockerignore`).
Docker Compose lo inyecta al contenedor en tiempo de ejecución. La aplicación
rechaza los secretos de muestra de `.env.example`.

| Variable | Uso |
| --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Crean la base de datos la primera vez que se inicializa el volumen. |
| `DATABASE_URL` | Conexión de la aplicación; el host es `db`. Debe coincidir con las tres anteriores. |
| `NEXTAUTH_URL` | URL pública del sitio. |
| `NEXTAUTH_SECRET` | Clave de cifrado de la cookie de sesión (mínimo 32 caracteres). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Cliente OAuth de Google Workspace. |
| `ALLOWED_EMAIL_DOMAIN` | Dominio institucional autorizado (`unsch.edu.pe`). |
| `RATE_LIMIT_HMAC_SECRET` | Clave del hash efímero anti-spam (mínimo 32 caracteres, distinta de `NEXTAUTH_SECRET`). |
| `UPLOAD_DIR` | Directorio de fotografías (`/app/uploads`). |
| `NEXT_PUBLIC_APP_URL` | URL pública; se incorpora al compilar la imagen. |

Genera cada secreto con `openssl rand -base64 32`.

Si cambias `POSTGRES_PASSWORD` después de la primera ejecución, actualiza
también la clave dentro de PostgreSQL: las variables `POSTGRES_*` solo se
aplican cuando el volumen `postgres_data` está vacío.

## Control de acceso

- **Estudiantes:** el inicio de sesión se acepta solo si Google certifica un
  correo verificado, perteneciente al Workspace institucional (`hd`) y con
  terminación `@unsch.edu.pe`. Cualquier otra cuenta vuelve a `/login` con un
  mensaje explicativo.
- **Moderadores:** deben figurar activos en la tabla `admins`. Cada operación
  privilegiada vuelve a consultar esa tabla; el indicador `isAdmin` de la
  sesión solo se usa para la interfaz.

Para registrar un moderador:

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "INSERT INTO public.admins (email, full_name, role) VALUES ('\''correo@unsch.edu.pe'\'', '\''Nombre'\'', '\''moderator'\'')"'
```

## Protección de datos personales (Ley N.º 29733)

El correo institucional verificado se utiliza únicamente para:

1. Comprobar que la persona pertenece a la UNSCH.
2. Calcular en memoria el hash efímero anti-spam
   `HMAC-SHA256(RATE_LIMIT_HMAC_SECRET, correo | fecha | turno)`, que se guarda
   en `submission_rate_limits` (sugerencias) o `menu_rating_limits`
   (calificaciones).
3. Consultar si es moderador en la tabla `admins`.

Garantías del diseño:

- Las tablas `suggestions` y `menu_ratings` no tienen columnas de usuario, y
  no comparten ninguna clave con las tablas de cupos: una sugerencia no puede
  vincularse con su autor.
- El hash cambia en cada turno y cada día, y no puede recalcularse sin la
  clave del servidor.
- No se crea una tabla de usuarios ni de sesiones. El correo vive solo en la
  cookie cifrada del navegador.
- El correo no se escribe en los registros de la aplicación.
- La consulta pública de tickets no expone el correo del moderador que respondió.

Los únicos correos almacenados son los de los moderadores (`admins` y el
autor de cada respuesta oficial en `ticket_responses`).

Límites vigentes: 2 sugerencias por estudiante, turno y día; 1 calificación
de menú por estudiante, turno y día.

## Inicialización de la base de datos

En el primer arranque, `docker/postgres/initdb/` se ejecuta en orden:

1. `00_supabase_compat.sql`: crea los roles y las funciones `auth.*` que el
   SQL histórico de las migraciones referencia. Son objetos locales de
   PostgreSQL; no conectan con ningún servicio externo.
2. `10_apply_migrations.sh`: aplica `supabase/migrations/*.sql` y
   `supabase/seed.sql`. Omite la migración del antiguo bucket de fotografías.

La carpeta `supabase/` conserva ese nombre solo por el historial de
migraciones. Para reinicializar desde cero (elimina todos los datos):
`docker compose down -v`.

## Mantenimiento del almacenamiento

Desde el panel de analítica, un moderador puede ejecutar la depuración
(`POST /api/admin/maintenance`), que:

- Desvincula y elimina las fotografías de tickets resueltos con más de 90 días
  (el texto y las respuestas se conservan).
- Elimina archivos huérfanos de `/app/uploads`: imágenes con más de 24 horas
  que ninguna sugerencia referencia.

## Operaciones y Plan de Continuidad (Disaster Recovery & SRE OTI)

La Oficina de Tecnologías de la Información (OTI UNSCH) establece los siguientes acuerdos de nivel de servicio (SLA/SLO) para el sistema:
- **RPO (Recovery Point Objective): < 24 horas.** Ninguna pérdida de datos superará el último ciclo diario nocturno.
- **RTO (Recovery Time Objective): < 30 minutos.** El tiempo de recuperación total tras desastre o migración debe completarse en menos de media hora mediante scripts transaccionales automatizados.
- **Retención local:** 7 días de respaldos rotativos automatizados en disco.
- **Auditoría y zona horaria:** Todos los registros operacionales utilizan la marca temporal de Lima (UTC-5 / `America/Lima`).

---

### 1. Tareas Programadas en el Servidor Linux OTI (`cron`)

Para garantizar cero intervención manual y evitar saturación del disco del servidor institucional, se configuran dos rutinas en el `crontab` del usuario administrador del host:

```bash
# Editar las tareas programadas en el servidor
crontab -e
```

Añade las siguientes entradas (ajustando la ruta absoluta hacia el proyecto):

```cron
# ==============================================================================
# BUZÓN DE SUGERENCIAS COMEDOR UNSCH - TAREAS PROGRAMADAS OTI (ZONA HORARIA UTC-5)
# ==============================================================================

# 1. Respaldo Diario (Disaster Recovery): 03:00 AM todos los días
0 3 * * * /opt/buzon_sugerencias/docker/scripts/backup/backup.sh >> /opt/buzon_sugerencias/backups/cron-backup.log 2>&1

# 2. Mantenimiento Nocturno y Purga de Disco: 04:00 AM todos los días
0 4 * * * /opt/buzon_sugerencias/docker/scripts/maintenance/nightly-cleanup.sh >> /opt/buzon_sugerencias/logs/cron-maintenance.log 2>&1
```

Asegúrate de otorgar permisos de ejecución a los scripts:
```bash
chmod +x docker/scripts/backup/backup.sh
chmod +x docker/scripts/backup/restore.sh
chmod +x docker/scripts/maintenance/nightly-cleanup.sh
```

---

### 2. Respaldos Automatizados (`backup.sh`)

El script `docker/scripts/backup/backup.sh` realiza automáticamente:
1. **Volcado PostgreSQL Comprimido:** Ejecuta `pg_dump` con `--clean --if-exists` y lo comprime con `gzip` (`backups/backup_YYYYMMDD_HHMMSS.sql.gz`).
2. **Empaquetado del Volumen de Fotos:** Genera un tarball comprimido del volumen `app_uploads` (`backups/uploads_YYYYMMDD_HHMMSS.tar.gz`).
3. **Validación de Integridad:** Comprueba con `gzip -t` y `tar -tzf` que ningún archivo resultante esté corrupto o incompleto.
4. **Política de Retención (7 días):** Depura automáticamente archivos de respaldo con más de 7 días de antigüedad (`find ... -mtime +7 -delete`).
5. **Auditoría:** Registra cada operación y tamaño en `backups/backup.log` con marca temporal UTC-5.

Ejecución manual de respaldo:
```bash
./docker/scripts/backup/backup.sh
```

---

### 3. Procedimiento de Restauración ante Desastre (`restore.sh`)

El script `docker/scripts/backup/restore.sh` ejecuta la recuperación transaccional garantizando un RTO < 30m:

#### Caso A: Restauración en el Servidor Activo (Fallo lógico o corrupción)
```bash
# Restaurar base de datos y fotografías del último respaldo generado
./docker/scripts/backup/restore.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz backups/uploads_YYYYMMDD_HHMMSS.tar.gz

# O forzar modo no interactivo (por ejemplo, en scripts automatizados de DR):
./docker/scripts/backup/restore.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz backups/uploads_YYYYMMDD_HHMMSS.tar.gz --force
```

El script ejecuta automáticamente:
1. Verificación previa de integridad de los archivos comprimidos antes de cualquier cambio.
2. Terminación limpia de conexiones concurrentes en PostgreSQL (`pg_terminate_backend`).
3. Restauración transaccional con bandera `--single-transaction` y `ON_ERROR_STOP=1` (si falla una sentencia, la transacción entera se revierte de inmediato sin dejar datos a medias).
4. Descompresión y reemplazo atómico del volumen de archivos multimedia.
5. Verificación de integridad post-restauración (comprobación de registros en `suggestions`, `admins` y `daily_menus`).

#### Caso B: Despliegue en Servidor Nuevo (Migración o Pérdida Total de Hardware)
1. Instalar Docker Engine 24+ y Git en el nuevo servidor Debian/Ubuntu de la OTI.
2. Clonar el repositorio y copiar el archivo `.env` institucional (conservando `NEXTAUTH_SECRET` y `RATE_LIMIT_HMAC_SECRET`).
3. Transferir el par de archivos de respaldo (`backup_*.sql.gz` y `uploads_*.tar.gz`) a la carpeta `backups/`.
4. Iniciar los contenedores:
   ```bash
   docker compose up -d --build
   ```
5. Ejecutar la restauración:
   ```bash
   ./docker/scripts/backup/restore.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz backups/uploads_YYYYMMDD_HHMMSS.tar.gz --force
   ```
6. Verificar el estado del sistema con el endpoint de salud:
   ```bash
   curl http://localhost:3000/api/health
   ```

---

### 4. Rutinas de Mantenimiento y Purga (`nightly-cleanup.sh`)

El script `docker/scripts/maintenance/nightly-cleanup.sh` ejecuta la política de ahorro de almacenamiento y protección de datos:
1. **Purga de Hash Efímeros (> 48 horas):** Elimina registros expirados de las tablas `submission_rate_limits` y `menu_rating_limits`. Dado que el cupo es diario, los hashes mayores a 48h no tienen vigencia y su eliminación previene crecimiento innecesario de índices.
2. **Disociación de Fotografías en Tickets Resueltos (> 90 días):** Pone en `NULL` el campo `photo_url` en tickets con estado `resolved` mayores a 90 días y elimina físicamente los archivos del disco, reteniendo el texto y respuestas para auditoría y analítica.
3. **Depuración de Imágenes Huérfanas (> 24 horas):** Detecta archivos en el volumen que no están referenciados por ninguna sugerencia activa en la base de datos (por ejemplo, subidas abandonadas por alumnos) y los elimina físicamente del disco respetando un período de gracia de 24 horas.

---

### 5. Observabilidad, Rotación de Logs y Diagnóstico Profundo

1. **Rotación de Logs en Docker Compose:**
   Los servicios `app`, `db` y `proxy` cuentan con límites estrictos de rotación para evitar saturación de particiones de disco:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```
2. **Logging Estructurado y Filtro de Anonimato (`src/lib/logger`):**
   - Todos los eventos se emiten en formato JSON estructurado: `{"timestamp", "level", "context", "message", ...}`.
   - **Filtro Defensivo de Privacidad:** Enmascara automáticamente patrones de correos institucionales (`***@unsch.edu.pe`) y correos externos (`***@***`).
   - **Censura Estricta:** Reemplaza automáticamente credenciales de conexión (`postgresql://***@...`), tokens JWT (`[REDACTED_JWT]`), hashes HMAC de 64 caracteres (`[REDACTED_HASH]`) y secretos de entorno.
3. **Endpoint de Diagnóstico Profundo (`GET /api/health`):**
   - Proporciona métricas de infraestructura en tiempo real para agentes de monitoreo (Zabbix/Prometheus/Uptime Kuma):
     - `version`: Versión del sistema (`v1.0.0-onpremise`).
     - `uptime`: Tiempo de actividad del proceso en segundos.
     - `metrics.dbResponseTimeMs`: Latencia en milisegundos de la consulta de comprobación a PostgreSQL.
     - `metrics.storage`: Permisos de escritura (`writable: true`) y estimación de bytes libres en disco (`freeBytes`).
     - Códigos HTTP: `200` si todos los subsistemas responden; `503` con diagnóstico detallado en caso de degradación.
