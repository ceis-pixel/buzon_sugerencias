> **Documento histórico (archivado).** Describe la etapa previa del proyecto sobre servicios en la nube (Supabase, Vercel, Firebase), hoy descontinuados. No refleja la arquitectura on-premise vigente; consulta el [expediente técnico para la OTI](../oti/).

# Guía de Configuración: Google OAuth con Restricción Institucional (@unsch.edu.pe)

Esta guía describe los pasos necesarios para habilitar y configurar la autenticación OAuth 2.0 con Google en el sistema **Buzón de Sugerencias - Comedor UNSCH**, garantizando el acceso exclusivo a cuentas estudiantiles e institucionales de la Universidad Nacional de San Cristóbal de Huamanga.

---

## 1. Arquitectura de Seguridad y Doble Barrera

1. **Barrera de Cliente (Hosted Domain):**
   - El cliente envía `hd: 'unsch.edu.pe'` y `prompt: 'select_account'` a Google OAuth.
   - Google filtra automáticamente las cuentas sugeridas y prioriza el dominio institucional en dispositivos móviles y de escritorio.
2. **Barrera de Servidor (Defensa en Profundidad):**
   - El Route Handler `src/app/auth/callback/route.ts` intercambia el código de autorización PKCE.
   - Verifica en el servidor que `session.user.email` termine rigurosamente en `@unsch.edu.pe`.
   - En caso de recibir cualquier otro dominio (@gmail.com, etc.), destruye inmediatamente la sesión (`supabase.auth.signOut()`) y redirige a `/login?error=domain_not_allowed`.

---

## 2. Configuración en Google Cloud Console

1. Inicia sesión en [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto nuevo o selecciona el existente (ej. `buzon-comedor-unsch`).
3. Dirígete a **APIs y servicios > Pantalla de consentimiento de OAuth**:
   - **Tipo de usuario:**
     - Selecciona **Interno** si el Workspace de la UNSCH administra la organización.
     - Selecciona **Externo** si está en fase de prueba y agrega los correos de prueba.
   - **Información de la aplicación:**
     - Nombre de la app: `Buzón de Sugerencias - Comedor UNSCH`
     - Correo de asistencia: Correo del administrador o soporte institucional.
     - Logotipo: Opcional (isotipo institucional del comedor).
   - **Dominios autorizados:**
     - Agrega `unsch.edu.pe`
     - Agrega `supabase.co`
   - **Permisos (Scopes):**
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
4. Dirígete a **APIs y servicios > Credenciales**:
   - Haz clic en **Crear credenciales > ID de cliente de OAuth**.
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: `Buzon Sugerencias Web Client`.
   - **Orígenes autorizados de JavaScript:**
     - `http://localhost:3000`
     - `https://<TU-PROYECTO>.supabase.co`
     - `https://<TU-DOMINIO-PRODUCCION>`
   - **URIs de redireccionamiento autorizados:**
     - `https://<TU-PROYECTO>.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback`
     - `https://<TU-DOMINIO-PRODUCCION>/auth/callback`
   - Haz clic en **Crear** y copia el **ID de cliente** y el **Secreto de cliente**.

---

## 3. Configuración en Supabase Dashboard

1. Accede al panel de control de tu proyecto en [Supabase](https://supabase.com/dashboard).
2. Ve a **Authentication > Providers > Google**:
   - Activa el interruptor **Enable Google provider**.
   - Pega el **Client ID** obtenido en Google Cloud Console.
   - Pega el **Client Secret** obtenido en Google Cloud Console.
   - Guarda los cambios.
3. Ve a **Authentication > URL Configuration**:
   - **Site URL:** `http://localhost:3000` (o la URL de despliegue en Vercel).
   - **Redirect URLs:** Agrega:
     - `http://localhost:3000/auth/callback`
     - `https://<TU-DOMINIO-PRODUCCION>/auth/callback`

---

## 4. Variables de Entorno (`.env.local`)

Asegúrate de que tu archivo `.env.local` contenga las siguientes variables obligatorias:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<TU-PROYECTO>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<TU-ANON-KEY-PUBLICA>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=unsch.edu.pe
```

---

## 5. Pruebas y Validación

1. Ejecuta `npm run dev` y visita `http://localhost:3000/login`.
2. Haz clic en **"Iniciar sesión con Google (@unsch.edu.pe)"**.
3. Inicia sesión con una cuenta `@unsch.edu.pe`: debes ingresar y ser redirigido a `/`.
4. Si se intenta acceder con una cuenta personal `@gmail.com`, el callback destruirá la sesión y mostrará el aviso:
   > *"Solo se permite ingresar con correos institucionales @unsch.edu.pe. Por favor, selecciona tu cuenta universitaria de la UNSCH."*
