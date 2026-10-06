# Guía de Configuración de Google Workspace (OAuth 2.0)

**Sistema:** Buzón de Sugerencias — Comedor Universitario UNSCH
**Versión:** v1.0.0-onpremise
**Destinatario:** Administrador del dominio `unsch.edu.pe` en la OTI
**Fecha:** octubre de 2026

---

## 1. Qué se necesita y por qué

El sistema no gestiona contraseñas. Delega el inicio de sesión en las cuentas
institucionales de Google Workspace mediante OAuth 2.0 / OpenID Connect. Para
ello la OTI debe crear un **cliente OAuth** dentro de la organización
`unsch.edu.pe` y entregar dos valores al administrador del servidor:

| Valor | Variable en `.env` | Naturaleza |
| --- | --- | --- |
| ID de cliente | `GOOGLE_CLIENT_ID` | Público (termina en `.apps.googleusercontent.com`) |
| Secreto de cliente | `GOOGLE_CLIENT_SECRET` | **Confidencial** |

Lo que el sistema solicita a Google y lo que hace con ello:

| Permiso (scope) | Uso |
| --- | --- |
| `openid` | Verificar la identidad |
| `email` | Leer el correo institucional y confirmar el dominio |

No se solicita el perfil (nombre, fotografía), ni acceso a Gmail, Drive,
Calendar ni a ningún otro servicio. Estos permisos no son sensibles ni
restringidos, por lo que la aplicación **no requiere verificación de Google**.

> **Estado de validación.** El flujo y el filtro de dominio están cubiertos
> por pruebas automatizadas, y se comprobó que el sistema redirige a Google
> con los parámetros correctos. El inicio de sesión completo con credenciales
> reales de la organización está **pendiente** de esta configuración; es la
> primera prueba de aceptación (sección 5).

---

## 2. Requisitos previos

- Una cuenta de Google Workspace de `unsch.edu.pe` con permiso para crear
  proyectos en Google Cloud dentro de la organización (rol *Creador de
  proyectos*) o un proyecto ya existente de la OTI.
- La URL pública definitiva del sistema. En esta guía:
  `https://comedor.unsch.edu.pe`.

Crear el cliente OAuth no tiene costo ni requiere activar facturación.

---

## 3. Procedimiento

Los nombres de los menús pueden variar levemente según la versión de la
consola de Google Cloud.

### Paso 1 — Crear o seleccionar el proyecto

1. Ingrese a <https://console.cloud.google.com> con la cuenta institucional.
2. En el selector de proyectos, pulse **Proyecto nuevo**.
3. Nombre sugerido: `buzon-comedor-unsch`.
4. En **Organización**, seleccione `unsch.edu.pe`. **Este punto es
   indispensable:** solo un proyecto que pertenece a la organización puede
   usar el tipo de usuario *Interno*.
5. Pulse **Crear** y seleccione el proyecto.

### Paso 2 — Configurar la pantalla de consentimiento

1. Vaya a **APIs y servicios → Pantalla de consentimiento de OAuth** (en la
   consola nueva: **Google Auth Platform → Branding / Público**).
2. Tipo de usuario: **Interno**. Con esta opción, Google solo permite el
   ingreso de cuentas de la organización `unsch.edu.pe`.
3. Complete la información de la aplicación:

   | Campo | Valor |
   | --- | --- |
   | Nombre de la aplicación | `Buzón de Sugerencias - Comedor UNSCH` |
   | Correo de asistencia | Un correo de la OTI |
   | Dominios autorizados | `unsch.edu.pe` |
   | Correo del desarrollador | Un correo de la OTI |

4. En **Permisos (scopes)**, agregue únicamente `openid` y
   `.../auth/userinfo.email`.
5. Guarde.

### Paso 3 — Crear el cliente OAuth

1. Vaya a **APIs y servicios → Credenciales → Crear credenciales → ID de
   cliente de OAuth** (o **Google Auth Platform → Clientes → Crear cliente**).
2. Tipo de aplicación: **Aplicación web**.
3. Nombre: `Buzón Comedor - Web`.
4. **Orígenes de JavaScript autorizados:**

   ```
   https://comedor.unsch.edu.pe
   http://localhost
   ```

5. **URIs de redireccionamiento autorizados:**

   ```
   https://comedor.unsch.edu.pe/api/auth/callback/google
   http://localhost/api/auth/callback/google
   ```

   | URI | Uso |
   | --- | --- |
   | `https://comedor.unsch.edu.pe/api/auth/callback/google` | Producción |
   | `http://localhost/api/auth/callback/google` | Pruebas en el propio servidor, a través del Nginx del stack (puerto 80) |
   | `http://localhost:3000/api/auth/callback/google` | Opcional: desarrollo sin Nginx (`npm run dev`) |

   La URI debe coincidir **carácter por carácter** con
   `<NEXTAUTH_URL>/api/auth/callback/google`: mismo esquema (`https`), mismo
   dominio, sin barra final. Google solo acepta `http` para `localhost`.

6. Pulse **Crear**. Copie el **ID de cliente** y el **Secreto de cliente**.
   En las versiones recientes de la consola el secreto solo se muestra
   completo en este momento; guárdelo de inmediato.

### Paso 4 — Entregar las credenciales

Entregue ambos valores al administrador del servidor por un canal seguro (el
gestor de secretos de la OTI). No los envíe por correo ni los suba al
repositorio.

En el servidor, en `/opt/buzon_sugerencias/.env`:

```bash
NEXTAUTH_URL=https://comedor.unsch.edu.pe
GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
ALLOWED_EMAIL_DOMAIN=unsch.edu.pe
```

Aplique el cambio:

```bash
docker compose --profile production up -d
curl -s http://127.0.0.1/api/health      # "auth": "ok"
```

`"auth": "ok"` indica que las variables están presentes y tienen el formato
esperado. No comprueba que Google las acepte: eso se verifica en la sección 5.

---

## 4. Cómo se restringe el acceso

El acceso se limita al dominio institucional en dos niveles independientes:

| Nivel | Control | Dónde |
| --- | --- | --- |
| Google | Pantalla de consentimiento **Interna**: una cuenta externa ni siquiera puede completar el ingreso | Google Cloud |
| Aplicación | El servidor acepta la sesión solo si Google certifica: correo verificado, organización (`hd`) igual a `unsch.edu.pe` y correo terminado en `@unsch.edu.pe` | `src/lib/auth/authOptions.ts` |

El segundo nivel protege al sistema incluso si la pantalla de consentimiento
se cambiara por error a *Externa*. Además, la aplicación envía a Google el
parámetro `hd=unsch.edu.pe` para que el selector de cuentas muestre primero
las institucionales.

Ser estudiante con cuenta institucional basta para enviar sugerencias. El
acceso al panel de moderación requiere, además, estar registrado en la tabla
`admins` (documento 03, sección 7.2).

---

## 5. Pruebas de aceptación

| N.º | Prueba | Resultado esperado |
| --- | --- | --- |
| 1 | Abrir `https://comedor.unsch.edu.pe/login` y pulsar el botón de acceso | Se abre el selector de cuentas de Google |
| 2 | Ingresar con una cuenta `@unsch.edu.pe` | Regresa al sistema con la sesión iniciada |
| 3 | Ingresar con una cuenta `@gmail.com` | Google la rechaza, o el sistema muestra «Acceso exclusivo institucional» |
| 4 | Enviar una sugerencia de prueba | Se muestra un código `UNSCH-XXXX` |
| 5 | Ingresar a `/admin` con una cuenta de estudiante | Pantalla de acceso no autorizado |
| 6 | Ingresar a `/admin` con una cuenta registrada en `admins` | Se muestra la bandeja de moderación |
| 7 | Cerrar sesión | La sesión termina y `/admin` vuelve a pedir acceso |

---

## 6. Problemas frecuentes

| Mensaje | Causa | Solución |
| --- | --- | --- |
| `Error 400: redirect_uri_mismatch` | La URI de redireccionamiento no coincide con `NEXTAUTH_URL` | Comparar ambas: esquema, dominio, puerto y ausencia de barra final. Los cambios en la consola pueden tardar unos minutos |
| `Error 401: invalid_client` | ID o secreto mal copiados, o cliente eliminado | Volver a copiar ambos valores; verificar que no tengan espacios |
| `Error 403: org_internal` | Una cuenta externa intentó ingresar | Comportamiento correcto |
| «Acceso exclusivo institucional» con una cuenta de la universidad | La cuenta no pertenece al Workspace de `unsch.edu.pe` (por ejemplo, es una cuenta personal creada con ese correo) o `ALLOWED_EMAIL_DOMAIN` es distinto | Verificar la cuenta en la consola de administración de Workspace y el valor de la variable |
| La opción *Interno* no aparece | El proyecto no pertenece a la organización | Crear el proyecto dentro de `unsch.edu.pe` (paso 1) |
| `/api/health` muestra `"auth": "not_configured"` | Falta una variable o un secreto no cumple el mínimo | Documento 03, sección 4 |
| Tras iniciar sesión vuelve a `/login` con error | El servidor no alcanza `oauth2.googleapis.com` | Revisar la salida HTTPS del servidor (documento 03, sección 2) |

---

## 7. Mantenimiento de las credenciales

- **Rotación del secreto.** En el cliente OAuth, agregue un secreto nuevo,
  actualice `GOOGLE_CLIENT_SECRET`, ejecute
  `docker compose --profile production up -d` y luego elimine el anterior. Las
  sesiones abiertas no se interrumpen.
- **Cambio de dominio.** Si la URL pública cambia, agregue la nueva URI de
  redireccionamiento, actualice `NEXTAUTH_URL` y `NEXT_PUBLIC_APP_URL`, y
  reconstruya la imagen.
- **Propiedad del proyecto.** Asigne el proyecto de Google Cloud a una cuenta
  de servicio o grupo de la OTI, no a una cuenta personal, para que no se
  pierda con la rotación de personal.
- **Baja del sistema.** Eliminar el cliente OAuth impide de inmediato todo
  nuevo inicio de sesión.
