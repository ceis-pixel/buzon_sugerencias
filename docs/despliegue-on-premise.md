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

## Respaldos

```bash
# Base de datos
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > respaldo.sql

# Fotografías
docker run --rm -v buzon-comedor-unsch_app_uploads:/data:ro -v "$PWD":/backup alpine \
  tar czf /backup/uploads.tar.gz -C /data .
```

Conserva `RATE_LIMIT_HMAC_SECRET` y `NEXTAUTH_SECRET` fuera de los respaldos
de la base de datos.
