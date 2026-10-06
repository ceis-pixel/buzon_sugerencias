# Manual de Operaciones y Runbook

**Sistema:** Buzón de Sugerencias — Comedor Universitario UNSCH
**Versión:** v1.0.0-onpremise
**Destinatarios:** Administradores de sistemas y redes de la OTI
**Fecha:** octubre de 2026

---

## 1. Referencia rápida

| Tarea | Comando (desde la carpeta del proyecto) |
| --- | --- |
| Iniciar | `docker compose --profile production up -d` |
| Detener (conserva los datos) | `docker compose --profile production down` |
| Estado | `docker compose --profile production ps` |
| Registros | `docker compose logs -f --tail 100 app` |
| Salud | `curl -s http://127.0.0.1/api/health` |
| Respaldo manual | `./docker/scripts/backup/backup.sh` |
| Restaurar | `./docker/scripts/backup/restore.sh backups/backup_<fecha>.sql.gz` |
| Purga manual | `./docker/scripts/maintenance/nightly-cleanup.sh` |
| Actualizar | `git pull && docker compose --profile production up -d --build` |

> **Atención:** `docker compose down -v` elimina los volúmenes, es decir,
> **toda la base de datos y todas las fotografías**. No lo use en producción.

---

## 2. Requisitos del servidor

- Debian 12 o Ubuntu Server 22.04/24.04 LTS, con el paquete `tzdata`.
- Docker Engine 24 o superior con el complemento Docker Compose v2, y Git.
- Recursos: 1 vCPU, 2 GB de RAM y 20 GB de disco (mínimo: 0.5 vCPU, 1 GB, 10 GB).
- Un usuario de servicio (por ejemplo `buzon`) que pertenezca al grupo `docker`.
- Reglas de red:
  - Entrada: puerto 80/tcp solo desde el proxy perimetral de la UNSCH.
  - Salida: 443/tcp hacia `accounts.google.com`, `oauth2.googleapis.com`,
    `www.googleapis.com` y `openidconnect.googleapis.com`.
- Un nombre DNS (por ejemplo `comedor.unsch.edu.pe`) dirigido al proxy perimetral.
- Credenciales OAuth de Google Workspace (documento 04).

---

## 3. Despliegue paso a paso

### 3.1 Obtener el código

```bash
sudo mkdir -p /opt/buzon_sugerencias && sudo chown buzon:buzon /opt/buzon_sugerencias
sudo -iu buzon
git clone https://github.com/ceis-pixel/buzon_sugerencias.git /opt/buzon_sugerencias
cd /opt/buzon_sugerencias
```

### 3.2 Configurar el entorno

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Complete el archivo según la sección 4. Para generar cada secreto:

```bash
openssl rand -base64 32
```

### 3.3 Construir e iniciar

```bash
docker compose --profile production build
docker compose --profile production up -d
docker compose --profile production ps
```

Los servicios `db` y `app` deben figurar como `healthy`. En el primer arranque
la base de datos crea su esquema (unos 10 segundos); `app` espera a que termine.

### 3.4 Alternativa para servidores con poca memoria

La compilación necesita unos 2 GB de memoria libre. Si el servidor no los
tiene, construya la imagen en otro equipo con Docker y trasládela:

```bash
# En el equipo de compilación
docker compose build
docker save buzon-comedor-unsch:latest | gzip > buzon-comedor-unsch.tar.gz

# En el servidor
gunzip -c buzon-comedor-unsch.tar.gz | docker load
docker compose --profile production up -d --no-build
```

Si cambia `NEXT_PUBLIC_APP_URL` debe volver a construir la imagen: ese valor
se incorpora durante la compilación.

### 3.5 Verificación posterior

```bash
curl -s http://127.0.0.1/api/health            # a través de Nginx
curl -s http://127.0.0.1:3000/api/health       # directo a la aplicación
ss -tlnp | grep -E ':(80|3000|5432)\s'         # 80 público, 3000 en 127.0.0.1, 5432 ausente
docker compose exec -T app id                  # uid=1001(nextjs) gid=1001(nodejs)
```

Luego, desde un navegador y por la URL pública:

1. La página principal carga por HTTPS.
2. El inicio de sesión con una cuenta `@unsch.edu.pe` funciona.
3. Una cuenta externa es rechazada con el mensaje de acceso institucional.
4. Se puede enviar una sugerencia de prueba y consultarla con su código.

### 3.6 Permisos de los scripts

```bash
chmod +x docker/scripts/backup/backup.sh docker/scripts/backup/restore.sh \
         docker/scripts/maintenance/nightly-cleanup.sh
```

---

## 4. Archivo de entorno `.env`

El archivo no se versiona ni entra en la imagen. Docker Compose lo lee al
iniciar y lo inyecta en el contenedor. La aplicación **rechaza los valores de
ejemplo** de los secretos.

| Variable | Valor en producción | Notas |
| --- | --- | --- |
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | Puerto interno de la aplicación |
| `POSTGRES_DB` | `buzon_comedor` | Solo se aplica al crear el volumen de datos |
| `POSTGRES_USER` | `unsch_admin` | Ídem |
| `POSTGRES_PASSWORD` | Clave aleatoria | Ídem. Evite `@ : / ? #` o codifíquelos en `DATABASE_URL` |
| `DATABASE_URL` | `postgresql://unsch_admin:<clave>@db:5432/buzon_comedor` | Debe coincidir con las tres anteriores. El host es `db` |
| `NEXTAUTH_URL` | `https://comedor.unsch.edu.pe` | URL pública exacta, con `https` y sin barra final |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Cifra la cookie de sesión. Mínimo 32 caracteres |
| `GOOGLE_CLIENT_ID` | Del documento 04 | |
| `GOOGLE_CLIENT_SECRET` | Del documento 04 | |
| `ALLOWED_EMAIL_DOMAIN` | `unsch.edu.pe` | Sin `@` |
| `RATE_LIMIT_HMAC_SECRET` | `openssl rand -base64 32` | Distinta de `NEXTAUTH_SECRET` |
| `UPLOAD_DIR` | `/app/uploads` | |
| `NEXT_PUBLIC_APP_URL` | `https://comedor.unsch.edu.pe` | Se usa al compilar la imagen |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` | `unsch.edu.pe` | Ídem |
| `NGINX_PORT` (opcional) | `80` | Puerto del servidor donde escucha el Nginx del stack |
| `APP_BIND_ADDRESS` (opcional) | `127.0.0.1` | Interfaz donde se publica el puerto 3000 |

Cambiar `POSTGRES_PASSWORD` después del primer arranque **no** cambia la clave
de la base. Hágalo dentro de PostgreSQL y actualice `DATABASE_URL`:

```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  <<< "ALTER USER unsch_admin WITH PASSWORD 'nueva_clave';"
```

Guarde una copia de `.env` en el gestor de secretos de la OTI. Sin
`RATE_LIMIT_HMAC_SECRET` y `NEXTAUTH_SECRET` el sistema restaurado funciona,
pero se cierran las sesiones abiertas y se reinician los cupos del día.

---

## 5. Integración con el proxy inverso institucional

El stack expone HTTP en el puerto 80 y **no gestiona certificados**. TLS debe
terminarse en el proxy o firewall perimetral de la UNSCH con el certificado
`*.unsch.edu.pe`.

```
 Cliente ──HTTPS 443──► Proxy perimetral UNSCH ──HTTP 80──► servidor del buzón (Nginx del stack)
```

Requisitos para el proxy perimetral:

1. **Conservar el encabezado `Host`** original (`comedor.unsch.edu.pe`). Las
   acciones del formulario comparan el origen de la petición con ese valor; si
   se reescribe, los envíos fallan.
2. Permitir cuerpos de al menos 2 MB.
3. Redirigir HTTP a HTTPS y emitir `Strict-Transport-Security`.
4. Reenviar la IP del cliente en `X-Forwarded-For`.

> Esta integración se documenta según la configuración del sistema; **no pudo
> verificarse en la red de la UNSCH**. Se recomienda validarla con la lista de
> la sección 3.5 durante la instalación.

### 5.1 Nginx institucional

```nginx
server {
    listen 80;
    server_name comedor.unsch.edu.pe;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name comedor.unsch.edu.pe;

    ssl_certificate     /etc/ssl/unsch/wildcard.unsch.edu.pe.fullchain.pem;
    ssl_certificate_key /etc/ssl/unsch/wildcard.unsch.edu.pe.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=31536000" always;
    client_max_body_size 2M;

    location / {
        proxy_pass http://IP_DEL_SERVIDOR_BUZON:80;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

No repita en este nivel los encabezados `Content-Security-Policy` ni
`X-Frame-Options`: ya los emite el Nginx del stack.

### 5.2 Traefik (proveedor de archivo)

```yaml
http:
  routers:
    buzon-comedor:
      rule: "Host(`comedor.unsch.edu.pe`)"
      entryPoints: ["websecure"]
      service: buzon-comedor
      tls: {}
      middlewares: ["buzon-hsts"]
  services:
    buzon-comedor:
      loadBalancer:
        passHostHeader: true
        servers:
          - url: "http://IP_DEL_SERVIDOR_BUZON:80"
  middlewares:
    buzon-hsts:
      headers:
        stsSeconds: 31536000
```

### 5.3 Proxy perimetral en el mismo servidor

Si el proxy institucional se ejecuta en el mismo equipo y ya ocupa el puerto
80, mueva el Nginx del stack a otro puerto y apunte el proxy a él:

```bash
# .env
NGINX_PORT=8080
```

### 5.4 Límite de peticiones y registros

El Nginx del stack limita a 5 peticiones por segundo por IP en `/login`,
`/api/auth` y `/api/upload`. Detrás del proxy perimetral, todas las peticiones
llegan con la IP de ese proxy, por lo que el límite se aplicaría al conjunto
de usuarios. Para conservar el límite por cliente, agregue en el bloque `http`
de `docker/nginx/nginx.conf` y reinicie el servicio `proxy`:

```nginx
set_real_ip_from IP_DEL_PROXY_PERIMETRAL;
real_ip_header   X-Forwarded-For;
```

---

## 6. Respaldos y recuperación ante desastres

| Objetivo | Valor |
| --- | --- |
| RPO (pérdida máxima de datos) | 24 horas (un respaldo diario) |
| RTO (tiempo de recuperación) | Menos de 30 minutos. En el simulacro, la restauración tomó 3 segundos con datos mínimos |
| Retención local | 7 días |

### 6.1 Tareas programadas

Como el usuario de servicio (miembro del grupo `docker`):

```bash
crontab -e
```

```cron
# Buzón de Sugerencias - Comedor UNSCH

# Respaldo diario a las 03:00
0 3 * * * /opt/buzon_sugerencias/docker/scripts/backup/backup.sh >> /opt/buzon_sugerencias/backups/cron-backup.log 2>&1

# Purga nocturna a las 04:00
0 4 * * * /opt/buzon_sugerencias/docker/scripts/maintenance/nightly-cleanup.sh >> /opt/buzon_sugerencias/logs/cron-maintenance.log 2>&1
```

Las horas corresponden al reloj del servidor. Compruebe que su zona horaria
sea la de Lima con `timedatectl`; si no lo es, ejecute
`sudo timedatectl set-timezone America/Lima`.

Antes de instalar las tareas, cree las carpetas y ejecute cada script una vez
a mano:

```bash
mkdir -p /opt/buzon_sugerencias/backups /opt/buzon_sugerencias/logs
./docker/scripts/backup/backup.sh && ./docker/scripts/maintenance/nightly-cleanup.sh
```

Los scripts toman el usuario y el nombre de la base del propio contenedor
`db`; no es necesario exportar variables.

### 6.2 Qué hace `backup.sh`

1. Vuelca la base con `pg_dump --clean --if-exists` y la comprime:
   `backups/backup_AAAAMMDD_HHMMSS.sql.gz`.
2. Empaqueta el volumen de fotografías: `backups/uploads_AAAAMMDD_HHMMSS.tar.gz`.
3. Verifica la integridad de ambos archivos (`gzip -t`, `tar -tzf`).
4. Elimina los respaldos con más de 7 días.
5. Registra el resultado en `backups/backup.log`.

**Termina con error (código 1) y no genera archivos** si no puede acceder a
Docker, si el servicio `db` no está en ejecución o si no encuentra el volumen
de fotografías. Supervise el código de salida o el registro.

Parámetros opcionales (variables de entorno): `BACKUP_DIR`, `RETENTION_DAYS`
y `UPLOADS_VOLUME` (por defecto `buzon-comedor-unsch_app_uploads`).

**Copia externa.** La retención de 7 días es local: si se pierde el disco, se
pierden también los respaldos. Copie la carpeta `backups/` a otro equipo o al
sistema de respaldo institucional, por ejemplo:

```cron
30 3 * * * rsync -a --delete /opt/buzon_sugerencias/backups/ respaldo@servidor-respaldos:/respaldos/buzon/
```

Los respaldos contienen los correos de los moderadores y el texto de todas las
sugerencias. Protéjalos con los mismos controles que la base de datos.

### 6.3 Restauración en el mismo servidor

```bash
cd /opt/buzon_sugerencias
ls -lt backups/ | head

./docker/scripts/backup/restore.sh backups/backup_AAAAMMDD_HHMMSS.sql.gz
```

Si existe el archivo `uploads_` con la misma marca de tiempo, se restaura
también. El script:

1. Verifica la integridad de los archivos **antes** de modificar nada; un
   respaldo corrupto se rechaza sin tocar la base.
2. Pide confirmación (escriba `si`). Use `--force` para omitirla.
3. Cierra las conexiones activas a la base.
4. Restaura en **una sola transacción** con `ON_ERROR_STOP=1`: si una
   sentencia falla, la base queda como estaba.
5. Reemplaza el contenido del volumen de fotografías.
6. Muestra el número de registros de las tablas principales.

La aplicación sigue en ejecución y se reconecta sola. Al terminar:

```bash
curl -s http://127.0.0.1/api/health
```

### 6.4 Recuperación en un servidor nuevo

1. Prepare el servidor (sección 2) y clone el repositorio (sección 3.1).
2. Recupere el archivo `.env` desde el gestor de secretos.
3. Copie el par de archivos de respaldo a `backups/`.
4. Inicie el stack: `docker compose --profile production up -d --build`.
5. Restaure: `./docker/scripts/backup/restore.sh backups/backup_<fecha>.sql.gz --force`.
6. Verifique con la sección 3.5 y reinstale las tareas programadas.
7. Actualice el destino en el proxy perimetral si cambió la IP.

### 6.5 Qué hace `nightly-cleanup.sh`

1. **Hashes anti-spam:** elimina de `submission_rate_limits` y
   `menu_rating_limits` los registros con más de 48 horas.
2. **Fotografías de casos cerrados:** en tickets resueltos con más de 90 días,
   desvincula la fotografía y borra el archivo. El texto se conserva.
3. **Archivos huérfanos:** borra las imágenes con más de 24 horas que ninguna
   sugerencia referencia (subidas abandonadas).

Escribe su resultado en `logs/maintenance.log`. El paso 1 es parte del
cumplimiento de la Ley N.º 29733: **si la tarea no se ejecuta, los hashes no
se eliminan**.

### 6.6 Simulacro recomendado

Se sugiere repetir cada semestre el simulacro realizado para esta entrega
(sección 8): respaldar, restaurar en un entorno de pruebas y comprobar la
salud del sistema.

---

## 7. Operación diaria

### 7.1 Registros

```bash
docker compose logs --tail 200 app      # aplicación (JSON estructurado)
docker compose logs --tail 200 proxy    # accesos y errores de Nginx
docker compose logs --tail 200 db       # PostgreSQL
```

Cada servicio conserva 3 archivos de 10 MB. La aplicación emite líneas JSON
con `timestamp`, `level`, `context` y `message`, y enmascara correos,
credenciales y tokens antes de escribir.

### 7.2 Gestión de moderadores

No hay pantalla para administrar moderadores; se gestionan en la base. La
cuenta debe terminar en `@unsch.edu.pe`.

```bash
# Alta
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
INSERT INTO public.admins (email, full_name, role)
VALUES ('correo@unsch.edu.pe', 'Nombre o dependencia', 'moderator');
SQL

# Baja (conserva el historial de respuestas)
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
UPDATE public.admins SET is_active = false WHERE email = 'correo@unsch.edu.pe';
SQL

# Listado
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT email, role, is_active FROM public.admins ORDER BY email"'
```

**La base se entrega con tres cuentas semilla** (`supabase/seed.sql`). Revise
esa lista antes de la puesta en producción y desactive las que no correspondan.

### 7.3 Actualización de versión

```bash
cd /opt/buzon_sugerencias
./docker/scripts/backup/backup.sh
git pull
docker compose --profile production up -d --build
curl -s http://127.0.0.1/api/health
```

Las migraciones de `supabase/migrations/` solo se aplican automáticamente
cuando el volumen de datos está vacío. Si una versión futura incluye una
migración nueva, aplíquela a mano:

```bash
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < supabase/migrations/<archivo>.sql
```

### 7.4 Acceso a la base para diagnóstico

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

---

## 8. Monitoreo de salud

### 8.1 Sonda `/api/health`

```bash
curl -s http://127.0.0.1/api/health
```

```json
{
  "status": "ok",
  "version": "v1.0.0-onpremise",
  "uptime": 6.77,
  "message": "Servicios de infraestructura operativos.",
  "checks": { "database": "ok", "storage": "ok", "auth": "ok" },
  "metrics": {
    "dbResponseTimeMs": 1.53,
    "storage": { "writable": true, "freeBytes": 1004674363392, "totalBytes": 1081101176832 },
    "uptimeSeconds": 6.77
  }
}
```

| Campo | Significado | Valor esperado | Acción si se desvía |
| --- | --- | --- | --- |
| Código HTTP | 200 operativo; 503 degradado | 200 | Revisar `checks` |
| `checks.database` | Conexión a PostgreSQL | `ok` | `error`: ver sección 9. `not_configured`: falta `DATABASE_URL` |
| `checks.storage` | Lectura y escritura en `/app/uploads` | `ok` | Revisar el volumen y sus permisos (UID 1001) |
| `checks.auth` | Secretos de autenticación completos y válidos | `ok` | `not_configured`: revisar `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_*`, `RATE_LIMIT_HMAC_SECRET`. No afecta el código HTTP |
| `metrics.dbResponseTimeMs` | Latencia de una consulta mínima | 1 a 10 ms | Sostenida sobre 100 ms: revisar carga y disco |
| `metrics.storage.freeBytes` | Espacio libre del volumen de fotografías | Más del 20 % de `totalBytes` | Bajo el 10 %: ampliar el disco o revisar la purga y los respaldos |
| `uptime` | Segundos desde que arrancó el proceso | Creciente | Reinicios frecuentes: revisar registros y memoria |

La sonda no expone secretos ni datos de usuarios. Docker la usa cada 30
segundos para marcar el contenedor como `healthy`.

### 8.2 Integración con monitoreo institucional

- **Zabbix / Uptime Kuma / Nagios:** verificación HTTP sobre
  `http://IP_DEL_SERVIDOR/api/health` que espere el código 200 y el texto
  `"status":"ok"`.
- **Alertas sugeridas:** código distinto de 200 durante 2 minutos; espacio
  libre bajo el 15 %; ausencia de un respaldo nuevo en 26 horas:

```bash
find /opt/buzon_sugerencias/backups -name 'backup_*.sql.gz' -mmin -1560 | grep -q . || echo "SIN RESPALDO RECIENTE"
```

### 8.3 Consumo de recursos

```bash
docker stats --no-stream
docker system df -v | grep -E "buzon|VOLUME"
```

Valores de referencia: documento 05.

### 8.4 Resultado del simulacro de esta entrega

Ejecutado el 6 de octubre de 2026 sobre el stack en contenedores Linux, con
los scripts tal como se entregan y sin variables exportadas:

| Prueba | Resultado |
| --- | --- |
| `backup.sh` | Volcado y tarball generados y verificados; código de salida 0 |
| `backup.sh` sin acceso a Docker | Error crítico, código 1, ningún archivo generado |
| Pérdida simulada de la base y de las fotografías | — |
| `restore.sh --force` | Base y fotografías recuperadas en 3 s; permisos `1001:1001`; salud `ok` |
| `restore.sh` con un archivo truncado | Rechazado antes de modificar la base; código 1 |
| `nightly-cleanup.sh` | Hashes de 5 días eliminados y los del día conservados; foto de un ticket resuelto hace 120 días desvinculada y borrada; archivo huérfano borrado; archivo reciente conservado |

---

## 9. Resolución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `app` no pasa a `healthy` | La base no responde o el volumen no admite escritura | `docker compose logs app db`; `curl http://127.0.0.1:3000/api/health` |
| `checks.auth: not_configured` | Falta un secreto, es corto o es el valor de ejemplo | Corregir `.env` y ejecutar `docker compose --profile production up -d` |
| Error `redirect_uri_mismatch` de Google | `NEXTAUTH_URL` no coincide con la URI registrada | Documento 04, sección 6 |
| Todas las cuentas son rechazadas | Pantalla de consentimiento externa o dominio distinto | Documento 04, sección 6 |
| El formulario no envía tras instalar el proxy | El proxy perimetral reescribe `Host` | Sección 5, requisito 1 |
| Error 413 al adjuntar una foto | Límite de cuerpo en el proxy perimetral | `client_max_body_size 2M` |
| Error 429 al iniciar sesión | Límite por IP aplicado a la IP del proxy perimetral | Sección 5.4 |
| `password authentication failed` | `DATABASE_URL` no coincide con la clave real | Sección 4 |
| `backup.sh` termina con código 1 | El usuario no pertenece al grupo `docker` o el stack está detenido | `id`; `docker compose ps` |
| La purga no borra fotografías | La imagen es anterior a esta versión | Reconstruir: `docker compose --profile production up -d --build` |
| Disco lleno | Respaldos o imágenes de Docker acumulados | `du -sh backups/`; `docker image prune` |
| La compilación se detiene o el servidor deja de responder | Memoria insuficiente | Sección 3.4 |

### Reinicio ordenado

```bash
docker compose --profile production restart app     # solo la aplicación
docker compose --profile production down && docker compose --profile production up -d
```
