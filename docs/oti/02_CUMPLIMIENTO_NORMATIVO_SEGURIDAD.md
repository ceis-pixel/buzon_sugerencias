# Informe de Cumplimiento Normativo y Seguridad

**Sistema:** Buzón de Sugerencias — Comedor Universitario UNSCH
**Versión:** v1.0.0-onpremise
**Destinatarios:** Seguridad de la Información de la OTI
**Fecha:** octubre de 2026

> **Alcance de este documento.** Describe los controles técnicos implementados
> y cómo se verifican. No constituye una opinión legal: la calificación
> jurídica del tratamiento, las citas normativas exactas y las obligaciones
> formales de la universidad (sección 2.6) deben ser confirmadas por Asesoría
> Legal y por el Oficial de Datos Personales de la UNSCH.

---

## 1. Resumen

| Tema | Situación |
| --- | --- |
| Identidad del estudiante en sugerencias y calificaciones | No se almacena. Las tablas no tienen columnas de usuario y no comparten claves con las tablas de control |
| Control anti-spam | Hash HMAC-SHA256 efímero, distinto en cada turno y cada día, eliminado a las 48 horas |
| Datos personales que sí se tratan | Correos de los moderadores (tabla `admins`) y el correo del usuario dentro de su propia cookie de sesión cifrada |
| Ubicación de los datos | Servidor de la UNSCH. Sin servicios de alojamiento ni bases de datos de terceros |
| Riesgos residuales identificados | Tres, descritos con su mitigación en la sección 5 |

---

## 2. Ley N.º 29733 — Protección de Datos Personales

### 2.1 Enfoque: disociación desde el diseño

La Ley N.º 29733 define en su artículo 2 el **procedimiento de disociación**
(tratamiento que impide identificar al titular) y el **procedimiento de
anonimización** (cuando además es irreversible). El sistema aplica ese
criterio al contenido que envían los estudiantes: el correo institucional se
utiliza en memoria durante la petición y nunca se escribe junto a la
sugerencia ni a la calificación.

> *Nota para Asesoría Legal:* confirmar el numeral vigente del artículo 2 que
> corresponde a cada definición antes de citarlo en el oficio, considerando
> las modificaciones de la ley y su reglamento.

### 2.2 Usos del correo institucional

El correo verificado por Google se emplea únicamente para tres fines:

| Fin | Dónde ocurre | ¿Se almacena? |
| --- | --- | --- |
| Comprobar que la persona pertenece a la UNSCH | Inicio de sesión (`src/lib/auth/authOptions.ts`) | No. Queda solo en la cookie de sesión cifrada del navegador |
| Calcular el hash del cupo anti-spam | En memoria, al enviar (`src/lib/auth/rateHash.ts`) | No. Se guarda el hash, no el correo |
| Consultar si es moderador | Búsqueda en la tabla `admins` | Solo existe para quienes la OTI o la JVC registran como moderadores |

No existe tabla de usuarios, de sesiones ni de cuentas: NextAuth opera sin
adaptador de base de datos. Solo se solicitan a Google los permisos `openid` y
`email`; no se piden el nombre ni la fotografía del perfil.

### 2.3 Cómo se garantiza la disociación

**a) El contenido no tiene columnas de identidad.**

```
suggestions:   id, ticket_code, shift, category, message, photo_url,
               status, created_at, updated_at
menu_ratings:  id, menu_id, rating_main, rating_side, rating_beverage,
               shift, rating_date, created_at
```

**b) El cupo se controla con un hash con clave, no con el correo.**

```
rate_hash = HMAC-SHA256( RATE_LIMIT_HMAC_SECRET ,  correo | fecha | turno )
```

- `RATE_LIMIT_HMAC_SECRET` es una clave de al menos 32 caracteres que solo
  existe en el archivo `.env` del servidor. Sin ella el hash no puede
  recalcularse a partir de una lista de correos.
- La fecha y el turno forman parte de la entrada, de modo que **el valor
  cambia en cada turno y cada día**: no sirve para seguir a una persona en el
  tiempo. La clave en sí es fija; lo que rota es el resultado.
- La aplicación exige que esta clave sea distinta de `NEXTAUTH_SECRET` y
  rechaza los valores de ejemplo.

**c) Las tablas de cupos no se relacionan con el contenido.**
`submission_rate_limits` y `menu_rating_limits` no guardan el identificador de
la sugerencia ni de la calificación. Además registran **solo el día, sin la
hora**, para que no puedan emparejarse con el contenido por coincidencia de
marcas de tiempo.

**d) Los hashes son efímeros.** La rutina nocturna elimina los registros con
más de 48 horas. Esta garantía depende de que la tarea programada esté
instalada (documento 03, sección 6).

**e) Los registros no contienen datos personales.** El registrador
(`src/lib/logger`) enmascara correos, cadenas de conexión, tokens JWT, hashes
de 64 caracteres y los secretos del entorno antes de escribir.

### 2.4 Flujo de una sugerencia

```
 1. El estudiante inicia sesión con Google Workspace (@unsch.edu.pe).
 2. Envía el formulario. En el servidor, dentro de UNA transacción:
      a. Se lee el correo desde la cookie de sesión (en memoria).
      b. Se calcula rate_hash = HMAC(clave, correo | fecha | turno).
      c. Se incrementa el cupo de ese hash. Si ya usó sus 2 envíos del turno,
         la operación se rechaza y no se guarda nada.
      d. Se inserta la sugerencia SIN ningún identificador del estudiante.
 3. El estudiante recibe su código UNSCH-XXXX. Ese código es lo único que
    lo vincula con su caso, y solo él lo conoce.
```

### 2.5 Evidencia verificable

| Afirmación | Cómo comprobarla |
| --- | --- |
| El correo no aparece en ninguna tabla tras enviar | Prueba automatizada `tests/postgres-services.test.ts` (ejecuta el SQL real sobre PostgreSQL embebido y busca el correo, su parte local y su SHA-256 en todas las tablas) |
| Las tablas de contenido no tienen columnas de usuario | La misma prueba compara la lista exacta de columnas |
| El cupo no comparte marca de tiempo con el contenido | Prueba «stamps quota rows with the day only» del mismo archivo |
| El correo no llega a los registros | `tests/disaster-recovery.test.ts`, sección de registro estructurado |
| Verificación manual en el servidor | `docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" --data-only' \| grep -c "@unsch.edu.pe"` debe devolver solo los correos de moderadores |

En la validación de la versión se envió una sugerencia con una cuenta de
prueba y un volcado completo de la base arrojó **cero apariciones** del correo.

### 2.6 Datos personales que el sistema sí trata

La disociación cubre el contenido de los estudiantes, pero el sistema no está
exento de la ley:

| Dato | Titular | Finalidad | Conservación |
| --- | --- | --- | --- |
| Correo y nombre en `admins` | Moderadores de la JVC | Autorizar el acceso al panel | Mientras dure el encargo; se desactiva con `is_active = false` |
| Correo del autor en `ticket_responses` | Moderadores | Trazabilidad de las respuestas oficiales | Mientras exista el ticket. No se muestra al público |
| Correo en la cookie de sesión | Cualquier usuario autenticado | Mantener la sesión (8 horas) | En el navegador del usuario, cifrada |
| Direcciones IP en los registros de Nginx | Cualquier visitante | Diagnóstico y defensa perimetral | 30 MB rotativos por contenedor |
| Texto libre y fotografías | Indeterminado | Atender el reclamo | Fotografías: 90 días tras resolverse el caso |

Puntos que la universidad debe evaluar con Asesoría Legal:

1. Inscripción del banco de datos de moderadores ante la Autoridad Nacional de
   Protección de Datos Personales, si corresponde.
2. Publicación de un aviso de privacidad accesible desde el sistema.
3. **Contenido libre:** un estudiante puede escribir nombres o adjuntar una
   foto donde aparezcan personas. El sistema no puede impedirlo; la JVC
   debe moderar estos casos antes de publicarlos en el mural de transparencia.
4. Google actúa como proveedor de identidad. La cuenta ya es institucional y
   se rige por el acuerdo de Google Workspace de la UNSCH.

---

## 3. Decreto Legislativo N.º 1412 — Ley de Gobierno Digital

Controles de seguridad digital implementados y su ubicación en el código.

### 3.1 Inyección SQL

- Todas las consultas usan **parámetros posicionales** (`$1`, `$2`, …) del
  driver `pg`; ningún valor del usuario se concatena en el SQL
  (`src/lib/services/`).
- Los filtros del panel se construyen con una lista fija de columnas; los
  comodines de búsqueda (`%`, `_`) se escapan.
- Los identificadores recibidos se validan como UUID y los enumerados contra
  listas cerradas (esquemas Zod en `src/lib/validations/`) antes de llegar a
  la base.
- Los errores de base de datos se registran saneados y el usuario recibe un
  mensaje genérico, sin nombres de tablas ni consultas
  (`src/lib/errors/dbErrorHandler.ts`).

### 3.2 Cross-Site Scripting (XSS)

- El texto de las sugerencias y de las respuestas oficiales se guarda con las
  entidades HTML escapadas (`src/lib/security/sanitization.ts`).
- React escapa de nuevo todo el contenido al mostrarlo; el código no usa
  `dangerouslySetInnerHTML`.
- La política de seguridad de contenido (CSP) no permite `unsafe-eval`,
  bloquea objetos incrustados y restringe los orígenes a los del propio
  sistema y a Google.

### 3.3 Subida de archivos y Path Traversal

| Control | Implementación |
| --- | --- |
| Sesión obligatoria | Solo cuentas `@unsch.edu.pe` autenticadas pueden subir (`/api/upload`) |
| Tamaño | Rechazo por `Content-Length` antes de leer el cuerpo y verificación posterior: 500 KB |
| Tipo declarado | Solo `image/webp` e `image/jpeg` |
| **Números mágicos** | Se inspeccionan los primeros bytes: `RIFF….WEBP` o `FF D8 FF`. Un archivo renombrado se rechaza con 415 |
| Nombre de archivo | Lo genera el servidor (UUID v4). El nombre enviado por el cliente se ignora |
| **Path Traversal** | La ruta debe coincidir con una expresión estricta `[turno/]AAAA/MM/<uuid>.<ext>`; después se resuelve y se comprueba que permanezca dentro de `/app/uploads` |
| Sobrescritura | Escritura exclusiva (`wx`): nunca se reemplaza un archivo existente |
| Entrega | `nosniff`, `Content-Disposition: inline` y CSP `default-src 'none'; sandbox`: aunque se lograra subir contenido activo, el navegador no lo ejecuta |
| Referencias externas | El campo `photo_url` solo acepta rutas locales `/uploads/...`; se rechazan URL externas |
| Borrado | Solo moderadores, verificados contra la tabla `admins` |

### 3.4 Encabezados HTTP

Aplicados por el Nginx del stack y, de forma redundante, por la aplicación:

| Encabezado | Valor |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'`; scripts, estilos, fuentes e imágenes limitados al propio origen y a Google; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'`; `form-action` propio y Google |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Server` | Sin número de versión (`server_tokens off`); la aplicación no envía `X-Powered-By` |

La CSP solo la emite el Nginx del stack (perfil `production`). `script-src`
incluye `'unsafe-inline'` porque Next.js inserta scripts en línea para la
hidratación. `Strict-Transport-Security` debe configurarse en el proxy
perimetral, que es donde termina TLS (documento 03, sección 5).

### 3.5 Autenticación y sesiones

- Inicio de sesión delegado en Google Workspace mediante OpenID Connect.
- El acceso se concede solo si Google certifica, a la vez: correo verificado,
  pertenencia al Workspace institucional (atributo `hd`) y terminación
  `@unsch.edu.pe`. El parámetro `hd` de la URL es solo una ayuda visual; la
  decisión se toma con los datos firmados por Google.
- Sesión en cookie `HttpOnly`, cifrada, con vigencia de 8 horas. NextAuth
  protege el inicio y cierre de sesión con un token anti-CSRF.
- Las Server Actions de Next.js rechazan peticiones cuyo origen no coincide
  con el del sitio.

### 3.6 Defensa perimetral e infraestructura

- Límite de 5 peticiones por segundo por IP (ráfaga de 10) en `/api/upload`,
  `/api/auth` y `/login`.
- Base de datos sin puertos publicados, en una red sin salida a internet.
- Contenedor de aplicación sin privilegios, sin capacidades de Linux y con
  `no-new-privileges`.
- Los secretos no se incluyen en la imagen: `.dockerignore` excluye todo
  archivo `.env*` y el `Dockerfile` no acepta secretos como argumentos.
- La compilación valida que ningún secreto esté expuesto en variables
  `NEXT_PUBLIC_*` (`scripts/validate-env.ts`).

---

## 4. Matriz de roles y accesos

| Operación | Visitante | Estudiante autenticado | Moderador |
| --- | --- | --- | --- |
| Ver la página principal, preguntas frecuentes y mural de transparencia | Sí | Sí | Sí |
| Consultar un ticket con su código | Sí | Sí | Sí |
| Ver el menú del día y su promedio | Sí | Sí | Sí |
| Enviar una sugerencia (máx. 2 por turno) | No | Sí | Sí |
| Subir una fotografía | No | Sí | Sí |
| Calificar el menú (1 por turno) | No | Sí | Sí |
| Ver la bandeja de sugerencias y la analítica | No | No | Sí |
| Cambiar estados y publicar respuestas oficiales | No | No | Sí |
| Publicar o cerrar menús | No | No | Sí |
| Ejecutar la depuración de almacenamiento | No | No | Sí |
| Ver quién envió una sugerencia | **Nadie** | **Nadie** | **Nadie** |

- **Estudiante.** Se autentica para enviar, pero su contenido se guarda sin
  identidad. Para consultar su caso no necesita sesión: basta el código.
- **Moderador (Junta de Vigilancia del Comedor Universitario, JVC).** Cuenta `@unsch.edu.pe` que
  además figura activa en `admins`. Cada operación privilegiada vuelve a
  consultar esa tabla en el servidor; el indicador de la sesión solo se usa
  para adaptar la interfaz. Al desactivar a un moderador, pierde el acceso de
  inmediato para toda operación de escritura.
- **Administración técnica (OTI).** El acceso al servidor y a la base de datos
  queda fuera de la aplicación y se rige por las políticas de la OTI.
- La consulta pública de un ticket no muestra el correo del moderador que
  respondió ni las notas internas.

Alta de un moderador: documento 03, sección 7.2.

---

## 5. Riesgos residuales

| N.º | Riesgo | Condiciones necesarias | Mitigación actual | Recomendación |
| --- | --- | --- | --- | --- |
| R1 | Saber **si** un estudiante concreto envió algo en un turno (no qué envió) | Acceso a la base, a `RATE_LIMIT_HMAC_SECRET` y conocer su correo, dentro de las 48 horas | La clave no está en la base; el hash se elimina a las 48 h; no hay vínculo con el contenido | Custodiar `.env` por separado de los accesos a la base. Verificar que la tarea nocturna se ejecute |
| R2 | Asociar una sugerencia con un equipo cruzando la hora de registro con los registros de acceso (IP) del proxy y con los del acceso a la red del campus | Acceso simultáneo a los registros de Nginx, a los de la red y a la base | Los registros rotan en 30 MB por contenedor | Definir en la OTI quién puede leer esos registros. Si la política lo exige, desactivar `access_log` en `docker/nginx/nginx.conf` o anonimizar la IP |
| R3 | Envío de contenido crítico a un servicio externo | Que alguien defina `ALERT_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` o `TELEGRAM_WEBHOOK_URL` | Desactivado por defecto | Mantenerlo desactivado o apuntarlo a un servicio institucional |

Otros aspectos a considerar:

- **Códigos de ticket.** `UNSCH-XXXX` tiene 810 000 combinaciones. La consulta
  no requiere sesión y solo `/login`, `/api/auth` y `/api/upload` tienen
  límite de peticiones en el proxy. Un tercero podría probar códigos al azar
  y leer casos ajenos, que no contienen datos de identidad pero sí el texto.
  Se recomienda extender el límite de peticiones a `/seguimiento` en el proxy
  perimetral.
- **Rotación de claves.** Cambiar `NEXTAUTH_SECRET` cierra todas las sesiones.
  Cambiar `RATE_LIMIT_HMAC_SECRET` reinicia los cupos del día.
- **Dependencias.** Se recomienda ejecutar `npm audit` y reconstruir la imagen
  con cada actualización de seguridad de Node.js, Next.js, PostgreSQL o Nginx.

---

## 6. Lista de verificación para la autorización

- [ ] `.env` con permisos `600`, propiedad del usuario de servicio, fuera de los respaldos de la base.
- [ ] `NEXTAUTH_SECRET` y `RATE_LIMIT_HMAC_SECRET` generados con `openssl rand -base64 32`, distintos entre sí.
- [ ] `/api/health` informa `"auth": "ok"`.
- [ ] Puerto 5432 no accesible desde fuera del servidor (`ss -tlnp`).
- [ ] Puerto 3000 enlazado solo a `127.0.0.1`.
- [ ] TLS y `Strict-Transport-Security` activos en el proxy perimetral.
- [ ] Tareas programadas de respaldo y purga instaladas y con ejecución verificada.
- [ ] Variables de webhook sin definir, o autorizadas por Seguridad de la Información.
- [ ] Pantalla de consentimiento de Google en modo **Interno**.
- [ ] Prueba de acceso con una cuenta externa (`@gmail.com`): debe ser rechazada.
- [ ] Lista de moderadores revisada (la base se entrega con tres cuentas semilla).
