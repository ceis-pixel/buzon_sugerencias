# Buzón de Sugerencias — Comedor Universitario UNSCH

Canal institucional para que los comensales del comedor de la **Universidad Nacional de San Cristóbal de Huamanga (UNSCH)** envíen sugerencias y reclamos de forma **estrictamente anónima**, califiquen el menú del día en tiempo real y realicen el seguimiento público del estado de sus observaciones.

| Metadato | Detalle |
| :--- | :--- |
| **Versión** | `v1.0.0-onpremise` |
| **Desarrollo** | CEIS (Comunidad de Estudiantes de Ingeniería de Sistemas) |
| **Área usuaria** | Junta de Vigilancia del Comedor Universitario (JVC) |
| **Operación y Soporte** | Oficina de Tecnologías de la Información (OTI) — UNSCH |
| **Tipo de despliegue** | On-premise, servidores institucionales de la UNSCH (Docker) |

---

## 📖 ¿De qué trata el sistema?

El **Buzón de Sugerencias del Comedor UNSCH** es una plataforma web desarrollada para tender un puente de comunicación directo, transparente y seguro entre los estudiantes comensales y la **Junta de Vigilancia del Comedor Universitario (JVC)**.

Históricamente, los reclamos y observaciones sobre la atención alimentaria en el comedor enfrentaban barreras de desconfianza por temor a represalias o falta de respuesta. Este sistema resuelve esa problemática mediante un canal oficial donde:

1. **Se valida la condición de comensal activo** exigiendo autenticación institucional con cuenta `@unsch.edu.pe`.
2. **Se garantiza el anonimato total e irreversible** mediante técnicas criptográficas de disociación de identidad.
3. **Se audita el servicio de manera comunitaria** a través de la calificación diaria del menú, el seguimiento público de casos y un mural de transparencia con las medidas correctivas adoptadas.
4. **Opera con soberanía tecnológica**: el sistema no depende de bases de datos ni servicios en la nube de terceros, ejecutándose íntegramente en la infraestructura física de la universidad.

---

## 🎯 Objetivos del Sistema

### Objetivo General
Proveer un canal institucional digital, seguro y accesible que permita a los comensales del comedor universitario de la UNSCH expresar sugerencias y reclamos protegiendo rigurosamente su identidad, facilitando a la Junta de Vigilancia del Comedor la gestión eficiente de incidencias y promoviendo la mejora continua en el servicio alimentario.

### Objetivos Específicos
- **Garantizar el anonimato y la privacidad del estudiante:** Cumplir a cabalidad con la Ley N.º 29733 (Ley de Protección de Datos Personales del Perú), asegurando que ninguna sugerencia, reclamo o calificación quede vinculada a la identidad personal o correo del estudiante.
- **Prevenir el abuso y spam sin almacenar identidades:** Controlar la frecuencia de envíos por turno mediante identificadores criptográficos efímeros que se reinician diariamente.
- **Elevar los estándares de calidad del comedor:** Proporcionar información en tiempo real a los fiscalizadores sobre raciones, higiene, calidad organoléptica de los alimentos, infraestructura y trato al usuario.
- **Fomentar la transparencia y rendición de cuentas:** Publicar de manera abierta las medidas correctivas adoptadas frente a los reclamos a través del Mural de Transparencia.
- **Facilitar el seguimiento al estudiante:** Asignar códigos únicos no identificables (`UNSCH-XXXX`) para que el comensal conozca el dictamen o respuesta oficial a su caso sin necesidad de iniciar sesión.
- **Optimizar la toma de decisiones:** Brindar a la JVC y a la administración una consola con métricas cuantitativas, reportes periódicos y exportación de datos para la fiscalización del servicio.

---

## ⚙️ ¿Qué hace y cómo funciona? (Lógica del Sistema)

```
 [Comensal con cuenta @unsch.edu.pe]
              │
              ▼ (1. Autenticación Google Workspace SSO)
    ¿Pertenece a la UNSCH?
         ├── NO  ──► Acceso denegado
         └── SÍ
              │
              ▼ (2. Disociación criptográfica)
    Hash efímero HMAC(correo + fecha + turno)  ──► Control anti-spam (cupo por turno)
    *El correo y datos personales se descartan*
              │
              ├────────────────────────────────────────┬────────────────────────────────────────┐
              ▼                                        ▼                                        ▼
    [Formulario de Sugerencia]                 [Calificación del Menú]                 [Seguimiento de Ticket]
    - Turno (Desayuno/Almuerzo/Cena)          - Valoración de 1 a 5 estrellas         - Código UNSCH-XXXX
    - Categoría del reclamo                   - Promedio en tiempo real               - Sin inicio de sesión
    - Detalle y foto opcional                                                         - Visualiza respuesta JVC
              │
              ▼
    Código generado: UNSCH-XXXX
              │
              ▼
    [Consola de Fiscalización JVC / Admin]
    - Revisión de bandeja, cambio de estados (Pendiente, En revisión, Atendido, Desestimado)
    - Emisión de respuesta institucional
    - Publicación del menú diario
    - Exportación a Excel y analítica
              │
              ▼
    [Mural Público de Transparencia]
    - Casos atendidos y soluciones implementadas visibles a toda la comunidad
```

### 1. Sugerencias y reclamos con anonimato garantizado
- **Validación de pertenencia:** El estudiante inicia sesión mediante Google Workspace SSO con su correo institucional `@unsch.edu.pe`.
- **Lógica de disociación (Ley N.º 29733):** Una vez verificado el dominio, la aplicación genera un hash HMAC unidireccional con una clave secreta (`RATE_LIMIT_HMAC_SECRET`) combinada con la fecha y el turno actual.
- **Cero rastreo:** El nombre, correo institucional y foto del usuario **no se persisten en la base de datos**. El hash solo se utiliza como token efímero en memoria/base para verificar que el mismo usuario no emita más sugerencias o votos de los autorizados por turno, disociando de forma permanente el contenido de la sugerencia de su autor.
- **Registro de ticket:** Se selecciona categoría, turno, descripción y se puede adjuntar evidencia fotográfica (con descarte de metadatos EXIF, validación de tipo MIME y cuota máxima). Al finalizar, el sistema entrega un código amigable (ej. `UNSCH-24A1`).

### 2. Seguimiento público sin sesión
- El estudiante o comensal puede consultar en `/seguimiento` en cualquier dispositivo ingresando el código `UNSCH-XXXX`.
- No requiere ingresar credenciales ni correos, garantizando que terceros o la administración no puedan relacionar al consultante con el caso.

### 3. Calificación y consulta del menú del día
- La JVC publica los platos e información nutricional de cada turno (Desayuno, Almuerzo, Cena).
- Los estudiantes pueden calificar el menú con un sistema de 1 a 5 estrellas. El promedio ponderado se recalcula y muestra públicamente al instante.

### 4. Consola de fiscalización para la JVC (`/admin`)
- Módulo protegido para los miembros fiscalizadores de la Junta de Vigilancia y administradores autorizados.
- **Bandeja de gestión:** Filtros por estado (*Pendiente*, *En revisión*, *Atendido*, *Desestimado*), turno, categoría y fecha.
- **Respuesta institucional:** Permite responder oficialmente a los reclamos y marcarlos para su publicación en el mural de transparencia.
- **Gestión del menú:** Carga y actualización de las minutas diarias del comedor.
- **Reportes analíticos:** Métricas de satisfacción y exportación completa de atenciones en formato Excel (`.xlsx`).

### 5. Mural de transparencia
- Vista pública abierta a toda la comunidad universitaria (`/transparencia`) donde se exponen las mejoras y respuestas dadas a las sugerencias colectivas, promoviendo una cultura de rendición de cuentas.

### 6. Afiche QR oficial para mesas (`/qr-flyer`)
- Módulo que genera automáticamente afiches imprimibles en formato A4 y A5 con el código QR del sistema para su colocación directa en las mesas del comedor universitario.

---

## 🛠️ Stack Tecnológico Institucional

| Capa | Componente | Descripción |
| :--- | :--- | :--- |
| **Entorno de ejecución** | Node.js 24 LTS | Motor JavaScript de alto rendimiento y soporte extendido. |
| **Framework Web** | Next.js 16 (App Router) | Renderizado del lado del servidor (SSR), API routes y salida *standalone*. |
| **Librería de UI** | React 19 / TypeScript 5 | Tipado estricto, accesibilidad y componentes reactivos. |
| **Estilos** | Tailwind CSS 3 | Diseño adaptativo, accesible y alineado a la identidad UNSCH. |
| **Autenticación** | NextAuth.js 4 | Integración Google Workspace SSO institucional (`@unsch.edu.pe`). |
| **Base de datos** | PostgreSQL 16 | Motor relacional local, consultas mediante driver nativo `pg` (sin ORM pesado). |
| **Proxy inverso** | Nginx 1.27 | Terminación HTTP interna, compresión gzip, control de subidas y cabeceras de seguridad. |
| **Empaquetado** | Docker & Docker Compose v2 | Contenedorización on-premise aislada por redes internas. |

---

## 🏗️ Arquitectura de Red y Contenedores

```
 Internet ──HTTPS──► Proxy perimetral UNSCH (TLS)
                              │ HTTP 80
        ┌─────────────────────▼──────────────────────────────┐
        │ Servidor institucional (Docker Compose)            │
        │                                                    │
        │  proxy  (Nginx 1.27)   red "frontend"              │
        │     │                                              │
        │  app    (Next.js 16, usuario sin privilegios)      │
        │     │   └─ volumen app_uploads  (evidencia fotos)  │
        │     │                  red "backend" (interna)     │
        │  db     (PostgreSQL 16, sin puertos al exterior)   │
        │         └─ volumen postgres_data (persistente)     │
        └────────────────────────────────────────────────────┘
```

---

## 🚀 Cómo inicializar el sistema en local

Existen dos maneras de ejecutar el sistema de forma local:
1. **Con Docker Compose (Recomendada):** Levanta la aplicación, la base de datos PostgreSQL 16 y el proxy Nginx en un solo comando idéntico al entorno de producción.
2. **Con Node.js y npm (`npm run dev`):** Para desarrollo directo sobre el código fuente en caliente.

---

### Método 1: Inicialización con Docker Compose (Recomendado)

#### Requisitos previos
- Docker Desktop o Docker Engine 24+ con Docker Compose v2 activo.

#### Pasos:

1. **Clonar o ubicarse en el directorio del proyecto:**
   ```bash
   cd d:\buzon_sugerencias
   ```

2. **Configurar el archivo de entorno `.env`:**
   Copia la plantilla base si aún no tienes el archivo creado:
   ```bash
   cp .env.example .env
   ```

   Asegúrate de que los secretos en `.env` no contengan valores por defecto. Puedes generar cadenas seguras de 32 caracteres con OpenSSL:
   ```bash
   # En Linux / macOS / Git Bash:
   openssl rand -base64 32
   ```
   Valores indispensables en `.env`:
   - `POSTGRES_DB=buzon_comedor`
   - `POSTGRES_USER=unsch_admin`
   - `POSTGRES_PASSWORD=<tu_clave_segura>`
   - `DATABASE_URL=postgresql://unsch_admin:<tu_clave_segura>@db:5432/buzon_comedor`
   - `NEXTAUTH_SECRET=<secreto_de_32_caracteres>`
   - `RATE_LIMIT_HMAC_SECRET=<secreto_distinto_de_32_caracteres>`
   - `ALLOWED_EMAIL_DOMAIN=unsch.edu.pe`
   - `UPLOAD_DIR=/app/uploads`

3. **Construir e iniciar los contenedores:**
   ```bash
   docker compose --profile production up -d --build
   ```

4. **Verificar que los servicios estén activos:**
   ```bash
   docker compose ps
   ```
   Comprueba el estado de salud con `curl`:
   ```bash
   curl http://localhost/api/health
   # o en Windows PowerShell:
   curl.exe http://localhost:3000/api/health
   ```
   La respuesta debe ser `{"status":"ok", ...}` con base de datos, almacenamiento y autenticación en estado operativo.

5. **Abrir en el navegador:**
   - Acceso directo a la aplicación: [http://localhost:3000](http://localhost:3000)
   - Acceso a través de Nginx: [http://localhost](http://localhost)

---

### Método 2: Modo Desarrollo con Node.js (`npm run dev`)

Si deseas modificar código en tiempo real con recarga en caliente (*Hot Module Replacement*):

#### Requisitos previos
- Node.js 24 LTS instalado (`node -v`).
- Instancia local de PostgreSQL 16 accesible.

#### Pasos:

1. **Instalar dependencias de Node:**
   ```bash
   npm ci
   ```

2. **Configurar variables para el entorno de desarrollo:**
   Crea o edita `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   En `.env.local` configura:
   ```ini
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=unsch.edu.pe
   ALLOWED_EMAIL_DOMAIN=unsch.edu.pe
   UPLOAD_DIR=./uploads
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=GcYyhEvpkXuLJmb1TJmrZq/nSD+4yucYCojcXLp5ua4=
   RATE_LIMIT_HMAC_SECRET=qTiho1iUq1c1AITCbyh1XUM/MHCLFThg8VG4DfPJgzA=
   
   # Conexión a tu PostgreSQL local:
   DATABASE_URL=postgresql://unsch_admin:tu_clave@localhost:5432/buzon_comedor
   ```

3. **Aplicar el esquema de base de datos:**
   Ejecuta los scripts SQL contenidos en `supabase/migrations/` en tu base de datos PostgreSQL local para crear las tablas, funciones e índices.

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

5. **Acceder a la aplicación:**
   Ingresa a [http://localhost:3000](http://localhost:3000).

---

## 🧪 Pruebas y Validación de Calidad

El proyecto cuenta con un conjunto integral de comprobaciones automatizadas:

```bash
# Ejecutar pruebas unitarias e integración (usa PostgreSQL en memoria PGlite)
npm run test

# Verificación estricta de tipos de TypeScript
npm run typecheck

# Análisis estático de código sin advertencias permitidas
npm run lint

# Verificación integral completa (tests + types + lint + build)
npm run check
```

---

## 🧭 Mapa de Rutas Principales

| Ruta | Acceso | Propósito |
| :--- | :--- | :--- |
| `/` | Público | Menú universitario del día y formulario de sugerencia anónima. |
| `/seguimiento` | Público | Consulta de estado de sugerencias mediante código `UNSCH-XXXX`. |
| `/transparencia` | Público | Mural con casos resueltos, respuestas oficiales y mejoras aplicadas. |
| `/preguntas-frecuentes` | Público | Respuestas a dudas sobre anonimato, tiempos de atención y normativa. |
| `/qr-flyer` | Público | Afiche descargable e imprimible con código QR para mesas del comedor. |
| `/admin` | Restringido (JVC/OTI) | Consola de moderación, menú diario, auditoría y reportes. |
| `/api/health` | Público | Diagnóstico de salud de la base de datos, disco y servicios. |

---

## 🛠️ Comandos de Operación y Mantenimiento

| Acción | Comando |
| :--- | :--- |
| **Iniciar contenedores** | `docker compose --profile production up -d` |
| **Detener contenedores** | `docker compose down` |
| **Consultar logs de la app** | `docker compose logs -f app` |
| **Generar backup de base de datos** | `./docker/scripts/backup/backup.sh` |
| **Restaurar base de datos** | `./docker/scripts/backup/restore.sh backups/backup_<fecha>.sql.gz` |
| **Ejecutar purga nocturna** | `./docker/scripts/maintenance/nightly-cleanup.sh` |

El detalle de la operación institucional se encuentra en el [Manual de Operaciones y Runbook](docs/oti/03_MANUAL_OPERACIONES_Y_RUNBOOK.md).

---

## 📚 Expediente Técnico para la OTI

Documentación técnica elaborada para la Oficina de Tecnologías de la Información de la UNSCH:

| Documento | Dirigido a | Contenido |
| :--- | :--- | :--- |
| [01 — Informe técnico de arquitectura](docs/oti/01_INFORME_TECNICO_ARQUITECTURA.md) | Jefatura y Desarrollo | Arquitectura de red, puertos, hardware, modelo relacional, almacenamiento. |
| [02 — Cumplimiento normativo y seguridad](docs/oti/02_CUMPLIMIENTO_NORMATIVO_SEGURIDAD.md) | Seguridad de la Información | Ley N.º 29733, D. Leg. N.º 1412, controles, hash efímero, roles y riesgos residuales. |
| [03 — Manual de operaciones y runbook](docs/oti/03_MANUAL_OPERACIONES_Y_RUNBOOK.md) | Sistemas y Redes | Procedimientos de despliegue, `.env`, proxy institucional, respaldos y monitoreo. |
| [04 — Guía de Google Workspace](docs/oti/04_GUIA_CONFIGURACION_GOOGLE_WORKSPACE.md) | Administrador del dominio | Credenciales OAuth 2.0 y pantalla de consentimiento institucional. |
| [05 — Informe de capacidad y estrés](docs/oti/05_INFORME_CAPACIDAD_Y_ESTRES.md) | Jefatura e Infraestructura | Proyecciones de carga, consumo de hardware y almacenamiento de fotos. |

---

## 👥 Créditos

Desarrollado por la **Comunidad de Estudiantes de Ingeniería de Sistemas (CEIS)** para la **Junta de Vigilancia del Comedor Universitario (JVC)**, con transferencia tecnológica a la **Oficina de Tecnologías de la Información (OTI)** de la **Universidad Nacional de San Cristóbal de Huamanga**.
