# Informe Técnico de Arquitectura

**Sistema:** Buzón de Sugerencias — Comedor Universitario UNSCH
**Versión:** v1.0.0-onpremise
**Destinatarios:** Jefatura de la OTI y equipo de Desarrollo
**Elaborado por:** CEIS, por encargo de la FUSCH
**Fecha:** octubre de 2026

---

## 1. Resumen ejecutivo

El Buzón de Sugerencias es una aplicación web que permite a los comensales del
comedor universitario enviar observaciones anónimas sobre el servicio (menú,
higiene, porciones, atención e infraestructura), calificar el menú del día y
hacer seguimiento de su caso con un código de ticket. La Comisión de Comedor de
la FUSCH responde cada caso desde un panel de moderación y publica las mejoras
en un mural de transparencia.

El sistema se entrega para operar **íntegramente en servidores de la UNSCH**:

- La aplicación, la base de datos y las fotografías residen en el servidor
  institucional. No utiliza plataformas de alojamiento ni bases de datos de
  terceros, y no tiene costo de licenciamiento.
- La única dependencia externa es el inicio de sesión con las cuentas de
  Google Workspace de la universidad (`@unsch.edu.pe`).
- Las sugerencias y calificaciones se almacenan sin ningún dato que identifique
  al estudiante (ver `02_CUMPLIMIENTO_NORMATIVO_SEGURIDAD.md`).
- Funciona en una máquina virtual pequeña: en las pruebas atendió seis veces
  la carga máxima estimada con medio núcleo de CPU y unos 300 MB de memoria
  (ver `05_INFORME_CAPACIDAD_Y_ESTRES.md`).

### Justificación institucional

| Necesidad | Respuesta del sistema |
| --- | --- |
| Canal formal de reclamos del comedor, hoy inexistente o informal | Formulario web accesible por código QR en las mesas, con ticket de seguimiento |
| Temor de los estudiantes a represalias | Anonimato por diseño: la base de datos no guarda quién envió cada sugerencia |
| Evitar abuso o envíos masivos | Solo cuentas institucionales verificadas; máximo 2 sugerencias y 1 calificación por turno |
| Soberanía de la información | Datos en servidores de la UNSCH, bajo custodia de la OTI |
| Rendición de cuentas | Respuesta oficial por ticket y mural público de mejoras |

### Estado de la entrega

| Aspecto | Estado |
| --- | --- |
| Código y pruebas automatizadas | 431 pruebas en verde; verificación de tipos, linter y compilación sin advertencias |
| Despliegue en contenedores | Validado en Docker Desktop (motor Linux). **Pendiente:** primera instalación en un servidor Debian/Ubuntu de la OTI |
| Inicio de sesión con Google | Flujo y filtro de dominio validados con pruebas automatizadas. **Pendiente:** prueba con credenciales OAuth reales de la organización `unsch.edu.pe`, que debe emitir la OTI |
| Operación detrás del proxy institucional con TLS | Configuración documentada. **Pendiente:** verificación en la red de la UNSCH |
| Respaldo, restauración y purga nocturna | Simulacro completo ejecutado en Linux (ver `03_MANUAL_OPERACIONES_Y_RUNBOOK.md`, sección 8) |

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
| --- | --- | --- |
| Entorno de ejecución | Node.js (imagen `node:24-alpine`) | 24 LTS |
| Aplicación | Next.js (App Router, salida *standalone*), React, TypeScript | 16.3 / 19.2 / 5 |
| Autenticación | NextAuth.js con proveedor Google (sesión JWT en cookie cifrada) | 4.24 |
| Base de datos | PostgreSQL (imagen `postgres:16-alpine`), driver `pg` con pool de conexiones | 16 |
| Proxy inverso | Nginx (imagen `nginx:1.27-alpine`) | 1.27 |
| Orquestación | Docker Engine y Docker Compose v2 | 24 o superior |

---

## 3. Arquitectura en contenedores

### 3.1 Vista física y de red

```
                         Internet / red del campus
                                    │  HTTPS 443
                    ┌───────────────▼────────────────┐
                    │  Proxy / firewall perimetral    │  Infraestructura OTI
                    │  de la UNSCH (TLS *.unsch.edu.pe)│  (fuera de este stack)
                    └───────────────┬────────────────┘
                                    │  HTTP 80
   ┌────────────────────────────────┼─────────────────────────────────────┐
   │  Servidor institucional (Docker)│                                     │
   │                                 │                                     │
   │   red "frontend" (bridge)       │                                     │
   │   ┌─────────────────────────────▼──────┐                              │
   │   │ proxy  · nginx:1.27-alpine          │  publica 80/tcp             │
   │   │ cabeceras de seguridad, límite de   │                              │
   │   │ peticiones por IP                   │                              │
   │   └─────────────────────────────┬──────┘                              │
   │                                 │ HTTP 3000                           │
   │   ┌─────────────────────────────▼──────┐        salida HTTPS a        │
   │   │ app  · Next.js standalone (Node 24) │ ─────► accounts.google.com   │
   │   │ usuario nextjs (UID 1001), sin      │        oauth2.googleapis.com │
   │   │ capacidades de Linux                │                              │
   │   │ volumen app_uploads → /app/uploads  │  127.0.0.1:3000 (solo host)  │
   │   └─────────────────────────────┬──────┘                              │
   │   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
   │   red "backend" (bridge interna, sin salida a internet)               │
   │   ┌─────────────────────────────▼──────┐                              │
   │   │ db  · postgres:16-alpine            │  sin puertos publicados      │
   │   │ volumen postgres_data               │                              │
   │   └────────────────────────────────────┘                              │
   └───────────────────────────────────────────────────────────────────────┘
```

- **Red `backend`:** declarada como `internal: true`. Los contenedores
  conectados solo a ella (la base de datos) no tienen ruta hacia el host ni
  hacia internet. Solo `app` puede alcanzar a `db`.
- **Red `frontend`:** conecta `proxy` con `app` y da a `app` la salida que
  necesita para validar el inicio de sesión con Google.
- El servicio `proxy` pertenece al perfil `production` de Compose. Sin ese
  perfil solo se levantan `app` y `db` (uso en desarrollo).

### 3.2 Vista lógica

```
 Navegador ──► proxy ──► app (Next.js)
                          ├─ Páginas públicas ........ /, /seguimiento, /transparencia,
                          │                            /preguntas-frecuentes, /qr-flyer, /login
                          ├─ Panel de moderación ..... /admin, /admin/analitica, /admin/menus
                          ├─ Server Actions .......... enviar sugerencia, calificar menú,
                          │                            consultar ticket, responder, publicar menú
                          ├─ /api/auth/* ............. NextAuth (Google Workspace SSO)
                          ├─ /api/upload ............. recepción de fotografías
                          ├─ /uploads/* .............. entrega de fotografías
                          ├─ /api/admin/maintenance .. depuración manual (moderadores)
                          └─ /api/health ............. sonda de salud y métricas
                                │
                                ├─► src/lib/db ........ pool pg ──► PostgreSQL 16
                                └─► /app/uploads ...... volumen app_uploads
```

### 3.3 Medidas de aislamiento de los contenedores

| Medida | `app` | `db` | `proxy` |
| --- | --- | --- | --- |
| Usuario sin privilegios | `nextjs:nodejs` (UID/GID 1001) | `postgres` (lo fija la imagen oficial) | procesos de trabajo como `nginx` |
| `no-new-privileges` | Sí | Sí | Sí |
| Capacidades de Linux | Todas eliminadas (`cap_drop: ALL`) | Predeterminadas | Solo `NET_BIND_SERVICE`, `CHOWN`, `SETGID`, `SETUID` |
| Secretos en la imagen | Ninguno; se inyectan al arrancar desde `.env` | — | — |
| Rotación de registros | 3 archivos de 10 MB | 3 archivos de 10 MB | 3 archivos de 10 MB |
| Reinicio automático | `unless-stopped` | `unless-stopped` | `unless-stopped` |

---

## 4. Matriz de puertos y servicios

| Servicio | Puerto en el contenedor | Publicación en el servidor | Accesible desde | Propósito |
| --- | --- | --- | --- | --- |
| Proxy perimetral de la UNSCH | 443/tcp | Infraestructura OTI | Internet / campus | Terminación TLS con el certificado `*.unsch.edu.pe` |
| `proxy` (Nginx del stack) | 80/tcp | `0.0.0.0:80` (variable `NGINX_PORT`) | Proxy perimetral | Entrada HTTP única del sistema |
| `app` (Next.js) | 3000/tcp | `127.0.0.1:3000` (variable `APP_BIND_ADDRESS`) | Solo el propio servidor | Diagnóstico local y sonda de salud |
| `db` (PostgreSQL) | 5432/tcp | **No publicado** | Solo el contenedor `app` | Persistencia |

El Nginx del stack escucha únicamente en HTTP (puerto 80). **El cifrado TLS se
termina en el proxy perimetral de la UNSCH**; el stack no gestiona certificados.

Conexiones salientes requeridas (solo desde `app`):

| Destino | Puerto | Motivo |
| --- | --- | --- |
| `accounts.google.com` | 443 | Autorización OAuth 2.0 / OpenID Connect |
| `oauth2.googleapis.com`, `www.googleapis.com`, `openidconnect.googleapis.com` | 443 | Canje del código y lectura de las claves públicas de Google |

De forma opcional, si se define alguna de las variables `ALERT_WEBHOOK_URL`,
`DISCORD_WEBHOOK_URL` o `TELEGRAM_WEBHOOK_URL`, la aplicación envía a ese
destino un aviso de los casos críticos, que incluye el texto de la sugerencia.
**Están desactivadas por defecto**; sin ellas no existe ninguna otra conexión
saliente. Su activación debe evaluarla Seguridad de la Información (documento
02, sección 6).

---

## 5. Requisitos de hardware

Valores medidos sobre el stack completo (`proxy` + `app` + `db`); el detalle
está en `05_INFORME_CAPACIDAD_Y_ESTRES.md`.

| Recurso | Consumo medido | Mínimo | Recomendado |
| --- | --- | --- | --- |
| CPU | 0 % en reposo; 0.39 núcleos al atender 31 peticiones/s | 0.5 vCPU | 1 vCPU |
| Memoria | 100 a 170 MB en reposo; 304 MB de pico bajo carga | 1 GB | 2 GB |
| Disco | 0.9 GB (imágenes) + 0.1 GB (base inicial) | 10 GB | 20 GB (incluye respaldos de 7 días) |
| Sistema operativo | — | Debian 12 / Ubuntu 22.04 LTS con Docker Engine 24+ | Igual |

**Nota sobre la compilación.** Construir la imagen (`docker compose build`)
requiere temporalmente unos 2 GB de memoria libre. En una máquina virtual de
1 GB se recomienda construir la imagen en otro equipo y trasladarla con
`docker save` / `docker load` (ver el manual de operaciones, sección 3.4).

---

## 6. Modelo de datos (PostgreSQL 16)

### 6.1 Modelo entidad-relación

```
 ┌──────────────────┐ 1        0..N ┌────────────────────┐ N        1 ┌─────────────┐
 │   suggestions    │───────────────│  ticket_responses  │────────────│   admins    │
 │──────────────────│               │────────────────────│            │─────────────│
 │ id (PK)          │               │ id (PK)            │            │ id (PK)     │
 │ ticket_code (UQ) │               │ suggestion_id (FK) │            │ email (UQ)  │
 │ shift, category  │               │ responder_email(FK)│            │ full_name   │
 │ message          │               │ response_text      │            │ role        │
 │ photo_url        │               │ is_internal        │            │ is_active   │
 │ status           │               └────────────────────┘            └─────────────┘
 └──────────────────┘
        ╎  sin relación (disociación)
 ┌────────────────────────┐
 │ submission_rate_limits │   cupo anti-spam de sugerencias (efímero, 48 h)
 │ rate_hash, shift,      │
 │ submission_date, count │
 └────────────────────────┘

 ┌──────────────────┐ 1        0..N ┌────────────────────┐
 │   daily_menus    │───────────────│    menu_ratings    │
 │──────────────────│               │────────────────────│
 │ id (PK)          │               │ id (PK)            │
 │ date + shift (UQ)│               │ menu_id (FK)       │
 │ main_dish, ...   │               │ rating_main/side/  │
 │ is_active        │               │ beverage (1 a 5)   │
 └──────────────────┘               └────────────────────┘
        ╎  sin relación (disociación)
 ┌────────────────────────┐
 │   menu_rating_limits   │   cupo de un voto por turno (efímero, 48 h)
 │ rate_hash, shift,      │
 │ rating_date            │
 └────────────────────────┘
```

Las tablas de cupos **no tienen ninguna clave en común** con `suggestions` ni
con `menu_ratings`. Es una decisión de diseño: impide vincular un contenido con
la persona que lo envió.

### 6.2 Tipos enumerados

| Tipo | Valores |
| --- | --- |
| `shift_type` | `breakfast`, `lunch`, `dinner` |
| `suggestion_category` | `menu`, `hygiene`, `portion`, `service`, `infrastructure` |
| `ticket_status` | `pending`, `in_review`, `resolved` |

### 6.3 Diccionario de datos

**`suggestions`** — sugerencias y reclamos (anónimos).

| Columna | Tipo | Regla | Descripción |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, generado | Identificador interno |
| `ticket_code` | `varchar(16)` | Único | Código público `UNSCH-XXXX`, asignado por un disparador de la base |
| `shift` | `shift_type` | Obligatorio | Turno al que se refiere |
| `category` | `suggestion_category` | Obligatorio | Categoría del caso |
| `message` | `text` | 10 a 500 caracteres | Texto del estudiante, con entidades HTML escapadas |
| `photo_url` | `text` | Opcional | Ruta local `/uploads/...` de la fotografía |
| `status` | `ticket_status` | `pending` al crear | Estado del ticket |
| `created_at`, `updated_at` | `timestamptz` | Automáticos | Fechas de registro y última modificación |

No existe ninguna columna de usuario, correo, dirección IP ni dispositivo.

**`ticket_responses`** — respuestas oficiales y notas internas.

| Columna | Tipo | Regla | Descripción |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Identificador |
| `suggestion_id` | `uuid` | FK → `suggestions`, borrado en cascada | Ticket respondido |
| `responder_email` | `varchar(255)` | FK → `admins.email` | Moderador que responde |
| `response_text` | `text` | Mínimo 5 caracteres | Texto de la respuesta |
| `is_internal` | `boolean` | `false` por defecto | Las notas internas nunca se muestran al público |
| `created_at`, `updated_at` | `timestamptz` | Automáticos | Fechas |

**`admins`** — lista blanca de moderadores.

| Columna | Tipo | Regla | Descripción |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Identificador |
| `email` | `varchar(255)` | Único; debe terminar en `@unsch.edu.pe` | Cuenta institucional |
| `full_name` | `varchar(255)` | Obligatorio | Nombre o dependencia |
| `role` | `varchar(50)` | `admin` o `moderator` | Rol |
| `is_active` | `boolean` | `true` por defecto | Permite revocar el acceso sin borrar el historial |
| `created_at`, `updated_at` | `timestamptz` | Automáticos | Fechas |

**`daily_menus`** — menú publicado por fecha y turno.

| Columna | Tipo | Regla | Descripción |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Identificador |
| `date`, `shift` | `date`, `shift_type` | Únicos en conjunto | Día y turno |
| `main_dish` | `varchar(150)` | Obligatorio | Plato principal |
| `side_dish`, `beverage` | `varchar(150)`, `varchar(100)` | Opcionales | Entrada y bebida |
| `published_by` | `uuid` | Sin uso; siempre `NULL` | Columna heredada |
| `is_active` | `boolean` | `true` por defecto | Indica si recibe calificaciones |
| `created_at`, `updated_at` | `timestamptz` | Automáticos | Fechas |

**`menu_ratings`** — calificaciones (anónimas).

| Columna | Tipo | Regla | Descripción |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Identificador |
| `menu_id` | `uuid` | FK → `daily_menus`, borrado en cascada | Menú calificado |
| `rating_main` | `smallint` | 1 a 5, obligatorio | Plato principal |
| `rating_side`, `rating_beverage` | `smallint` | 1 a 5, opcionales | Entrada y bebida |
| `shift`, `rating_date` | `shift_type`, `date` | Obligatorios | Turno y día |
| `created_at` | `timestamptz` | Automático | Fecha de registro |

**`submission_rate_limits`** y **`menu_rating_limits`** — cupos efímeros.

| Columna | Tipo | Regla | Descripción |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Identificador |
| `rate_hash` | `varchar(64)` | Único junto con turno y fecha | HMAC-SHA256 de correo, fecha y turno |
| `shift` | `shift_type` | Obligatorio | Turno |
| `submission_date` / `rating_date` | `date` | Obligatorio | Día del comedor (hora de Lima) |
| `submission_count` | `integer` | Solo en sugerencias; máximo 2 | Envíos consumidos |
| `created_at`, `updated_at` | `timestamptz` | Solo el día, sin hora | Evita emparejar el cupo con el contenido por coincidencia horaria |

Estas dos tablas se vacían cada noche de los registros con más de 48 horas.

### 6.4 Origen del esquema

El esquema se crea automáticamente la primera vez que arranca el contenedor
`db`, aplicando en orden los archivos de `supabase/migrations/`. La carpeta
conserva ese nombre por el historial del proyecto; el SQL se ejecuta sobre
PostgreSQL estándar. El archivo `docker/postgres/initdb/00_supabase_compat.sql`
crea los roles y funciones auxiliares que esas migraciones referencian; son
objetos locales y no establecen conexión con ningún servicio externo.

Las migraciones también definen políticas de seguridad a nivel de fila (RLS) y
funciones heredadas de la etapa anterior. La aplicación se conecta como
propietaria de las tablas, por lo que el control de acceso efectivo se aplica
en la capa de aplicación (ver el documento 02, sección 4).

---

## 7. Política de almacenamiento de fotografías

| Aspecto | Política |
| --- | --- |
| Compresión | En el navegador, con la Canvas API: lado mayor de 1200 px como máximo y formato WebP (JPEG si el dispositivo no admite WebP). Tamaño típico: ~120 KB |
| Límite en el servidor | 500 KB por archivo; el proxy rechaza cuerpos mayores de 2 MB |
| Formatos aceptados | WebP y JPEG, verificados por su firma binaria (números mágicos), no por la extensión |
| Ubicación | Volumen Docker `app_uploads`, montado en `/app/uploads` |
| Estructura | `/app/uploads/[turno/]AAAA/MM/<uuid-v4>.webp`. El prefijo de turno (`breakfast`, `lunch`, `dinner`) es opcional; el formulario actual guarda en `AAAA/MM/` |
| Nombre del archivo | UUID aleatorio generado por el servidor. El nombre original se descarta |
| Permisos | Archivos `640` y directorios `750`, propiedad de `nextjs:nodejs` |
| Entrega | `GET /uploads/...` con caché inmutable de un año, `X-Content-Type-Options: nosniff` y una política CSP que impide ejecutar contenido |
| Retención | Las fotografías de tickets resueltos se eliminan a los 90 días (el texto se conserva). Los archivos sin sugerencia asociada se eliminan a las 24 horas |
| Respaldo | Copia diaria completa del volumen, con retención de 7 días |

---

## 8. Limitaciones conocidas

1. **Espacio de códigos de ticket.** El formato `UNSCH-XXXX` admite 810 000
   códigos (30 símbolos en 4 posiciones). Con el volumen esperado alcanza para
   varias décadas, pero es un límite duro: antes de acercarse al 50 % de uso
   conviene ampliar el código a 5 posiciones.
2. **Instancia única.** El diseño contempla un solo contenedor `app`. No
   requiere balanceo ni alta disponibilidad para la carga prevista; el tiempo
   de recuperación ante una caída es el de reiniciar los contenedores.
3. **Datos de la etapa anterior.** Las sugerencias registradas mientras el
   sistema estuvo en la nube no se migraron. La base on-premise inicia vacía,
   con la lista de moderadores semilla.
4. **Versión del paquete.** `package.json` conserva el número `1.1.0` de la
   línea de desarrollo anterior. La versión de esta entrega es
   `v1.0.0-onpremise`, que es la que informa `/api/health`.
