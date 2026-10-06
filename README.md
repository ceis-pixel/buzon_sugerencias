# Buzón de Sugerencias — Comedor Universitario UNSCH

Canal institucional para que los comensales del comedor de la **Universidad
Nacional de San Cristóbal de Huamanga** envíen sugerencias y reclamos de forma
anónima, califiquen el menú del día y hagan seguimiento de su caso.

| | |
| --- | --- |
| **Versión** | v1.0.0-onpremise |
| **Desarrollo** | CEIS |
| **Área usuaria** | FUSCH — Comisión de Comedor |
| **Operación** | Oficina de Tecnologías de la Información (OTI) |
| **Despliegue** | On-premise, en servidores de la UNSCH, con Docker |

## Qué hace

- **Sugerencias anónimas.** El estudiante inicia sesión con su cuenta
  `@unsch.edu.pe`, elige turno y categoría, escribe su observación y puede
  adjuntar una fotografía. Recibe un código `UNSCH-XXXX`.
- **Seguimiento sin sesión.** Con el código se consulta el estado del caso y
  la respuesta oficial.
- **Calificación del menú.** Un voto por turno, con el promedio visible en
  tiempo real.
- **Panel de moderación.** La comisión revisa la bandeja, responde, publica el
  menú diario, consulta la analítica y exporta reportes.
- **Mural de transparencia.** Lista pública de los casos resueltos y las
  medidas adoptadas.

El sistema guarda las sugerencias y calificaciones **sin ningún dato que
identifique al estudiante**. El correo institucional solo se usa para validar
la pertenencia a la universidad y para un control anti-spam basado en un hash
efímero (Ley N.º 29733).

## Stack institucional

| Capa | Tecnología |
| --- | --- |
| Entorno de ejecución | Node.js 24 LTS |
| Aplicación | Next.js 16 (App Router, salida *standalone*), React 19, TypeScript |
| Autenticación | NextAuth.js con Google Workspace SSO (`@unsch.edu.pe`) |
| Base de datos | PostgreSQL 16, acceso nativo con el driver `pg` |
| Proxy inverso | Nginx 1.27 |
| Empaquetado | Docker y Docker Compose |

No depende de plataformas de alojamiento ni de bases de datos en la nube. La
única conexión externa es el inicio de sesión con Google Workspace.

## Arquitectura

```
 Internet ──HTTPS──► Proxy perimetral UNSCH (TLS)
                              │ HTTP 80
        ┌─────────────────────▼──────────────────────────────┐
        │ Servidor institucional (Docker Compose)            │
        │                                                    │
        │  proxy  (Nginx)        red "frontend"              │
        │     │                                              │
        │  app    (Next.js, usuario sin privilegios)         │
        │     │   └─ volumen app_uploads  (fotografías)      │
        │     │                  red "backend" (interna)     │
        │  db     (PostgreSQL 16, sin puertos publicados)    │
        │         └─ volumen postgres_data                   │
        └────────────────────────────────────────────────────┘
```

Requisitos medidos: menos de 0.5 núcleos y unos 300 MB de memoria bajo carga.
Se recomienda 1 vCPU, 2 GB de RAM y 20 GB de disco.

## Arranque rápido en 3 pasos

Requiere Docker Engine 24 o superior con Docker Compose v2.

```bash
# 1. Configurar el entorno
cp .env.example .env        # y reemplazar todos los valores de ejemplo

# 2. Construir e iniciar (aplicación, base de datos y Nginx)
docker compose --profile production up -d --build

# 3. Verificar
curl http://localhost/api/health
```

La respuesta debe incluir `"status":"ok"`. La base de datos crea su esquema
automáticamente en el primer arranque.

Para que el inicio de sesión funcione se necesitan las credenciales OAuth de
Google Workspace: consulte la
[guía de configuración](docs/oti/04_GUIA_CONFIGURACION_GOOGLE_WORKSPACE.md).
Los secretos se generan con `openssl rand -base64 32`; la aplicación rechaza
los valores de ejemplo.

## Expediente técnico para la OTI

| Documento | Dirigido a | Contenido |
| --- | --- | --- |
| [01 — Informe técnico de arquitectura](docs/oti/01_INFORME_TECNICO_ARQUITECTURA.md) | Jefatura y Desarrollo | Arquitectura, puertos, hardware, modelo de datos, almacenamiento |
| [02 — Cumplimiento normativo y seguridad](docs/oti/02_CUMPLIMIENTO_NORMATIVO_SEGURIDAD.md) | Seguridad de la Información | Ley N.º 29733, D. Leg. N.º 1412, controles, roles, riesgos residuales |
| [03 — Manual de operaciones y runbook](docs/oti/03_MANUAL_OPERACIONES_Y_RUNBOOK.md) | Sistemas y Redes | Despliegue, `.env`, proxy institucional, respaldos, monitoreo |
| [04 — Guía de Google Workspace](docs/oti/04_GUIA_CONFIGURACION_GOOGLE_WORKSPACE.md) | Administrador del dominio | Credenciales OAuth 2.0 y pantalla de consentimiento |
| [05 — Informe de capacidad y estrés](docs/oti/05_INFORME_CAPACIDAD_Y_ESTRES.md) | Jefatura e Infraestructura | Demanda estimada, pruebas de carga, proyección de disco |

## Operación

| Tarea | Comando |
| --- | --- |
| Iniciar / detener | `docker compose --profile production up -d` / `down` |
| Registros | `docker compose logs -f app` |
| Respaldo | `./docker/scripts/backup/backup.sh` |
| Restauración | `./docker/scripts/backup/restore.sh backups/backup_<fecha>.sql.gz` |
| Purga nocturna | `./docker/scripts/maintenance/nightly-cleanup.sh` |

El detalle, incluidas las tareas programadas, está en el
[manual de operaciones](docs/oti/03_MANUAL_OPERACIONES_Y_RUNBOOK.md).

## Desarrollo

Requiere Node.js 24 y npm.

```bash
npm ci
cp .env.example .env.local    # usar UPLOAD_DIR=./uploads y una base PostgreSQL accesible
npm run dev                   # http://localhost:3000
```

El servicio `db` del stack no publica su puerto. Para desarrollar fuera de
Docker se necesita un PostgreSQL 16 accesible desde el equipo, con el esquema
de `supabase/migrations/` aplicado, y su cadena de conexión en `DATABASE_URL`.

| Comando | Acción |
| --- | --- |
| `npm run test` | Pruebas unitarias y de integración (Vitest; las de base de datos usan PostgreSQL embebido) |
| `npm run typecheck` | Verificación de tipos |
| `npm run lint` | Linter, sin advertencias permitidas |
| `npm run build` | Compilación de producción |
| `npm run check` | Todo lo anterior, en ese orden |
| `npm run maintenance` | Rutina de purga, fuera de Docker |

### Estructura del repositorio

```
src/app/              Páginas y rutas (App Router): formulario, seguimiento,
                      transparencia, panel /admin y API (/api/auth, /api/upload, /api/health)
src/components/       Componentes de interfaz
src/lib/auth/         NextAuth, sesión institucional y hash anti-spam
src/lib/db/           Pool de PostgreSQL y transacciones
src/lib/services/     Consultas y reglas de negocio (sugerencias, menús, moderadores)
src/lib/storage/      Almacenamiento de fotografías en disco
src/lib/security/     Saneamiento de entradas
src/lib/logger/       Registro estructurado sin datos personales
src/lib/maintenance/  Purga nocturna
supabase/migrations/  Esquema SQL de PostgreSQL (nombre de carpeta histórico)
docker/               Nginx, inicialización de la base y scripts de operación
tests/                Pruebas automatizadas
docs/oti/             Expediente técnico de transferencia
```

### Convenciones

- Código, identificadores, nombres de archivo y mensajes de commit en inglés.
- Textos de la interfaz y documentación en español.
- TypeScript estricto e importaciones absolutas con `@/`.
- [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).

Los componentes de interfaz se describen en
[docs/sistema-de-diseno.md](docs/sistema-de-diseno.md).

## Documentación histórica

La carpeta [docs/archivo/](docs/archivo/) conserva las actas de los primeros
sprints y las guías de la etapa en que el proyecto se alojaba en servicios en
la nube, hoy descontinuados. No aplican a esta versión.

## Créditos

Desarrollado por el CEIS para la FUSCH, con transferencia tecnológica a la OTI
de la Universidad Nacional de San Cristóbal de Huamanga.
