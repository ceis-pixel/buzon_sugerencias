# Configuración y despliegue

## Entorno local y CI

Usa Node.js 24 y `npm ci` para instalar las versiones del lockfile. Copia `.env.example` a `.env.local` para desarrollo y reemplaza los valores de Supabase cuando necesites una conexión real.

El build necesita las cuatro variables públicas de la plantilla. `SUPABASE_SERVICE_ROLE_KEY` se puede omitir: solo se exige al importar el cliente administrativo. Los placeholders cumplen el esquema y permiten comprobar la compilación sin acceso a Supabase. No deben usarse para publicar una aplicación operativa.

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

Fuentes: [Next.js en Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/) y [Next.js en Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/). Vercel es el destino preparado por esta configuración.

## Cabeceras e imágenes

Todas las rutas reciben `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`. Se habilitan Strict Mode y compresión; se desactiva `X-Powered-By`.

`next/image` permite HTTPS en `lh3.googleusercontent.com` y objetos públicos bajo `/storage/v1/object/public/**` de `*.supabase.co`, sin puertos personalizados ni query strings. Las imágenes privadas o transformadas requieren una política específica antes de habilitarlas.
