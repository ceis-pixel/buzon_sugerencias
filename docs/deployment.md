# Configuración y despliegue

## Destino acordado: Firebase App Hosting con Next.js SSR

Se conserva el backend Next.js, según la decisión de arquitectura. `output: 'export'` no se habilita: la aplicación utiliza Server Actions, cookies, callback OAuth, páginas administrativas dinámicas y una API privilegiada. El build local genera `.next/`, no `out/`. El adaptador de App Hosting se encarga del empaquetado de servidor durante el despliegue.

- `.firebaserc` selecciona `buzon-sugerencia-2c621`.
- `firebase.json` configura el backend propuesto `buzon-sugerencias`, con fuente en la raíz. Sus reglas y `.gitignore` excluyen los entornos privados, builds, cachés y logs del paquete de subida; solo se conserva la plantilla `.env.example`.
- `apphosting.yaml` configura variables de build/runtime y un máximo de dos instancias. Mantiene el adaptador oficial; no sustituye su comando de build.
- `.env.local` contiene los valores públicos proporcionados por el equipo y permanece ignorado por Git. Las demás variables locales existentes se conservan.
- `firebase-tools` está fijado en las dependencias de desarrollo. No hace falta instalar una CLI global.

La alternativa Hosting clásico + Cloud Run no se utiliza: su proxy elimina las cookies salvo `__session`, lo que no es compatible directamente con las cookies fragmentadas de Supabase SSR. Véanse [cookies en Hosting](https://firebase.google.com/docs/hosting/manage-cache) y [despliegue de código local en App Hosting](https://firebase.google.com/docs/app-hosting/alt-deploy).

### Preparación remota, a ejecutar por el equipo

1. Activa el plan Blaze y App Hosting en el proyecto, con los permisos y términos requeridos por Firebase. No se ha creado ningún backend ni modificado facturación desde esta tarea.
2. Ejecuta `npm run firebase:login` y, si el backend todavía no existe, `npm run firebase:backend:create`. El segundo comando usa explícitamente el proyecto, backend, raíz y región `us-central1`, sin asistente de selección. Si deseas otra región o un backend ya creado, ajusta estos valores antes de ejecutarlo.
3. Consulta el backend con `npx firebase apphosting:backends:get buzon-sugerencias --project buzon-sugerencia-2c621`. Usa la URL que devuelva Firebase; no presupongas que será la dirección `web.app` de Hosting clásico.
4. Crea los dos valores referenciados en `apphosting.yaml`:

```bash
npx firebase apphosting:secrets:set supabase-publishable-key --project buzon-sugerencia-2c621
npx firebase apphosting:secrets:set app-public-url --project buzon-sugerencia-2c621
npx firebase apphosting:secrets:grantaccess supabase-publishable-key,app-public-url --backend buzon-sugerencias --location us-central1 --project buzon-sugerencia-2c621
```

Introduce la clave pública de Supabase y la URL HTTPS real del backend respectivamente. Usar Secret Manager aquí evita fijar sus valores por entorno en Git; ambos valores `NEXT_PUBLIC_` serán visibles en el navegador. Conserva los nombres y disponibilidades declarados en YAML si la CLI ofrece editarlo.

5. En Supabase Auth configura la Site URL y permite `<URL_REAL_APP_HOSTING>/auth/callback`. Actualiza también `NEXT_PUBLIC_APP_URL` en `.env.local` si vas a compilar localmente para ese dominio. El valor `https://buzon-sugerencia-2c621.web.app` suministrado inicialmente se ha conservado localmente, pero no es la URL verificada del nuevo backend.
6. Si se usará mantenimiento administrativo, crea `supabase-service-role-key`, concede acceso únicamente al backend y habilita la entrada comentada en `apphosting.yaml` con `availability: [RUNTIME]`. Nunca la agregues al build ni al prefijo público. Los webhooks se configuran igualmente como secretos de runtime. El resto del sitio puede compilar sin la clave administrativa; mantenimiento la valida al ejecutarse.
7. Despliega explícitamente:

```bash
npm run deploy:firebase
```

Este script ejecuta `check-all` y después `firebase deploy --only apphosting:buzon-sugerencias` con proyecto explícito y modo no interactivo. App Hosting vuelve a compilar en Cloud Build con los valores de su entorno. No se ha ejecutado el despliegue, ni creado secretos, ni aceptado términos automáticamente.

Después del rollout verifica inicio de sesión, retorno OAuth, `/api/health`, envío, seguimiento y autorización de `/admin` con las migraciones y RLS del proyecto aplicadas. La comprobación local HTTP 200 en `/auth/v1/settings` confirma respuesta de Supabase Auth a la clave pública; no confirma las migraciones, políticas, configuración de Google OAuth ni un inicio de sesión real.

Documentación oficial: [configuración y secretos de App Hosting](https://firebase.google.com/docs/app-hosting/configure).

## Entorno local y CI

Usa Node.js 24 y `npm ci` para instalar las versiones del lockfile. Copia `.env.example` a `.env.local` para desarrollo y reemplaza los valores de Supabase cuando necesites una conexión real.

El build necesita URL de Supabase, URL de aplicación, dominio y al menos una clave pública: `NEXT_PUBLIC_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Si ambas están definidas, se valida cada una y se prefiere la publishable. `SUPABASE_SERVICE_ROLE_KEY` se puede omitir: mantenimiento importa el cliente administrativo únicamente después de autorizar una petición. Los placeholders cumplen el esquema y permiten comprobar la compilación sin acceso a Supabase. No deben usarse para publicar una aplicación operativa.

En CI configura estos valores de prueba como variables del trabajo:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=unsch.edu.pe
```

Ejecuta `npm run test` y `npm run check-all`. Este último genera tipos de rutas, comprueba TypeScript, ejecuta ESLint sin tolerar advertencias y compila con validación previa. No necesita una clave administrativa. `npm run lint` y `npm run typecheck` funcionan sin variables configuradas.

La validación es local y comprueba formato, longitud y separación de secretos. No consulta Supabase ni comprueba firmas JWT. Las restricciones de dominio en el frontend tampoco sustituyen la autorización del backend. Si falta una variable pública o su formato es inválido, `npm run build` termina con código distinto de cero y un mensaje en español sin imprimir valores.

## Vercel

1. Importa el repositorio con el preset **Next.js** y selecciona Node.js 24.x.
2. Configura las cuatro variables públicas en los entornos Development, Preview y Production según corresponda. Usa la URL del proyecto Supabase y la clave anon/publishable reales; `NEXT_PUBLIC_APP_URL` debe contener la URL HTTPS del despliegue correspondiente.
3. Configura `SUPABASE_SERVICE_ROLE_KEY` como secreto exclusivamente en los entornos que ejecuten operaciones privilegiadas. Nunca uses el prefijo `NEXT_PUBLIC_` ni lo agregues a `next.config.mjs`.
4. Conserva `npm ci` y `npm run build`: `vercel.json` declara ambos comandos. No cambies el build a `next build` directo, porque omitiría el ciclo `prebuild` de npm.
5. Después de publicar, comprueba la portada, las cabeceras de seguridad y `/api/health`. Un estado 200 en esa ruta solo confirma la creación del cliente; no verifica conectividad, tablas, permisos ni validez de credenciales.

Next.js incorpora las variables públicas al bundle durante la compilación. Recompila al cambiarlas y evita promover un artefacto compilado con placeholders a producción. Manrope requiere acceso a Google Fonts durante el build y se sirve desde la aplicación en ejecución.

No se ha realizado un despliegue remoto desde este issue. La integración nativa de Next.js y los entornos están descritos en [Vercel: Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs) y [Vercel: variables de entorno](https://vercel.com/docs/environment-variables).

## Cloudflare Pages y Workers

Cloudflare Pages admite Next.js mediante exportación estática. Esta aplicación usa una ruta dinámica con cookies y clientes de servidor; por ello no se configura `output: "export"` y `.next` no es un directorio publicable directamente en Pages.

Para ejecutar la aplicación completa en Cloudflare se necesita Workers y un adaptador compatible, con validación adicional de cookies, secretos, fuentes, imágenes y rutas en ese runtime. Esta entrega no instala ni verifica ese adaptador. La documentación actual de Cloudflare recomienda vinext para proyectos nuevos y describe OpenNext como alternativa; adoptar uno requiere un trabajo de integración específico.

Fuentes: [Next.js en Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/) y [Next.js en Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/). Vercel se conserva como alternativa SSR; el destino elegido ahora es Firebase App Hosting.

## Cabeceras e imágenes

Todas las rutas reciben `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`. Se habilitan Strict Mode y compresión; se desactiva `X-Powered-By`.

`next/image` permite HTTPS en `lh3.googleusercontent.com` y objetos públicos bajo `/storage/v1/object/public/**` de `*.supabase.co`, sin puertos personalizados ni query strings. Las imágenes privadas o transformadas requieren una política específica antes de habilitarlas.
