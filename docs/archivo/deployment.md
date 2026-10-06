> **Documento histórico (archivado).** Describe la etapa previa del proyecto sobre servicios en la nube (Supabase, Vercel, Firebase), hoy descontinuados. No refleja la arquitectura on-premise vigente; consulta el [expediente técnico para la OTI](../oti/).

# Configuración y despliegue

## Destino acordado: Vercel con Next.js SSR

La aplicación conserva Server Actions, cookies de Supabase, callback OAuth y rutas dinámicas. `vercel.json` declara `framework: "nextjs"`, instalación con `npm ci` y compilación con `npm run build`. El resultado local es `.next/`; no se configura `output: "export"` ni un directorio `out/`.

`package.json` y CI usan Node.js 24. Se retiraron los scripts, archivos y dependencia CLI de Firebase al elegir Vercel. `.env.local` permanece ignorado por Git.

### Importación y primer despliegue

1. Publica `main` en `https://github.com/ceis-pixel/buzon_sugerencias`. Si GitHub muestra “Quick setup”, el repositorio todavía está vacío: primero sube los commits locales.
2. En Vercel importa ese repositorio, rama `main`, raíz `./` y preset **Next.js**. Si una pantalla de importación abierta antes de subir el código conserva **Other**, recarga la importación y selecciona **Next.js** explícitamente.
3. Conserva `npm ci`, `npm run build` y el directorio de salida predeterminado de Next.js. No actives una salida estática.
4. Agrega las variables siguientes en Vercel. Introduce las URL como texto simple, sin corchetes ni formato Markdown:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://skfobinspglnuqutbolx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | La clave pública proporcionada por el equipo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Opcional: la misma clave pública; basta uno de los dos alias |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` | `unsch.edu.pe` |
| `NEXT_PUBLIC_APP_URL` | La URL HTTPS real de producción; para el primer build provisional se permite `http://localhost:3000` |

5. Ejecuta **Deploy** y espera el resultado del build. El despliegue provisional con localhost aún no está listo para uso institucional: falta sincronizar el dominio.
6. Copia el dominio de producción asignado por Vercel. No deduzcas el dominio a partir del nombre del proyecto ni uses una URL de preview efímera como dominio institucional.
7. En Supabase, Authentication > URL Configuration, establece **Site URL** en ese dominio y agrega **Redirect URLs**: `https://<DOMINIO_REAL>/auth/callback`. En Vercel cambia `NEXT_PUBLIC_APP_URL` al mismo dominio y ejecuta **Redeploy** para recompilar las variables públicas. Configura URLs específicas para Preview si necesitas probar OAuth allí.
8. Configura `SUPABASE_SERVICE_ROLE_KEY` únicamente si ejecutarás mantenimiento privilegiado, en los entornos necesarios y sin prefijo público. No es necesaria para compilar ni para `/api/health`. Nunca la publiques en Git ni la entregues al navegador.

### Verificación en vivo

- Portada y `/api/health`: la ruta debe responder HTTP 200. Esto comprueba la instanciación del cliente, no la existencia de tablas ni el acceso a la base de datos.
- Inicio de sesión con cuenta `@unsch.edu.pe`, retorno por `/auth/callback` y rechazo de otros dominios.
- Envío de una sugerencia identificada como prueba, generación de ticket y seguimiento. Estas pruebas requieren las migraciones, RLS y Google OAuth configurados en Supabase.
- Acceso administrativo limitado a usuarios autorizados.

No uses una clave service role para sustituir un inicio de sesión de estudiante en las pruebas. La validación de Auth y una prueba real de escritura se informan por separado del build.

Vercel Hobby está orientado a uso personal no comercial; la elegibilidad y los límites deben verificarse para el uso institucional previsto. No se habilita ningún plan de pago ni prueba Pro automáticamente. Referencias: [plan Hobby](https://vercel.com/docs/plans/hobby), [Next.js en Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) y [Node.js 24](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

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

## Cloudflare Pages y Workers

Cloudflare Pages admite Next.js mediante exportación estática. Esta aplicación usa una ruta dinámica con cookies y clientes de servidor; por ello no se configura `output: "export"` y `.next` no es un directorio publicable directamente en Pages.

Para ejecutar la aplicación completa en Cloudflare se necesita Workers y un adaptador compatible, con validación adicional de cookies, secretos, fuentes, imágenes y rutas en ese runtime. Esta entrega no instala ni verifica ese adaptador. La documentación actual de Cloudflare recomienda vinext para proyectos nuevos y describe OpenNext como alternativa; adoptar uno requiere un trabajo de integración específico.

Fuentes: [Next.js en Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/) y [Next.js en Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/). El destino elegido es Vercel con SSR.

## Cabeceras e imágenes

Todas las rutas reciben `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`. Se habilitan Strict Mode y compresión; se desactiva `X-Powered-By`.

`next/image` permite HTTPS en `lh3.googleusercontent.com` y objetos públicos bajo `/storage/v1/object/public/**` de `*.supabase.co`, sin puertos personalizados ni query strings. Las imágenes privadas o transformadas requieren una política específica antes de habilitarlas.
