# Cierre del Sprint 1

Fecha de verificación: 9 de septiembre de 2026.

Los seis issues de configuración están integrados en el repositorio. El destino preparado es Vercel con Next.js App Router; no se ha publicado un despliegue remoto ni configurado un proyecto Supabase real.

| Issue | Entregable integrado | Evidencia |
| --- | --- | --- |
| 1.1 | Next.js 16, App Router y TypeScript estricto | Commit `689dd77`; tipos de rutas y build correctos |
| 1.2 | Tokens Crimson Heritage exactos y Tailwind CSS 3 | Commit `76edc1e`; `tailwind.config.ts` conserva `#5C0000`, `#A6665C`, `#001586` y `#847370`, con escaneo de `src` |
| 1.3 | Manrope global, pesos 400/500/600/700 y metadatos institucionales | Commit `f441dea`; `next/font/google`, variable CSS, `font-sans` y `lang="es"` integrados |
| 1.4 | Clientes Supabase tipados para navegador, servidor y administración | Commit `f50c9b7`; contrato `Database`, cookies asíncronas y pruebas de aislamiento y errores |
| 1.5 | Header adhesivo, Footer y PageContainer responsive | Commit `c2f1a2d`; comprobación visual del issue sin desbordamiento a 360, 390 y 412 px y contenedor de 576 px en escritorio |
| 1.6 | Entorno validado, secretos aislados, cabeceras y scripts de despliegue | Commit de cierre del sprint; `.env.example`, Zod, prebuild, `next.config.mjs`, `vercel.json` y `check-all` |

## Resultado de validación

- `npm run test`: 4 archivos, 42 pruebas aprobadas. Incluyen configuración ausente o inválida, claves privilegiadas en el campo público, separación del secreto, clientes tipados, cookies y health.
- `npm run check-all`: código de salida 0; generación de tipos, TypeScript, ESLint y build sin errores ni advertencias.
- Compilación con los cuatro placeholders públicos de CI y sin `SUPABASE_SERVICE_ROLE_KEY`. No se requieren credenciales reales ni acceso a Supabase para esta comprobación.
- Rutas compiladas: `/` y `/_not-found` estáticas; `/api/health` dinámica.
- Prueba negativa: `npm run build` sin variables públicas termina con código 1 antes de compilar y explica qué variables faltan.
- Prueba negativa: el validador rechaza `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` con código 1 y no imprime el marcador ficticio utilizado.
- Servidor de producción local: `/` y `/api/health` devuelven 200; se verificaron las tres cabeceras de seguridad, compresión `gzip` de la portada, ausencia de `X-Powered-By` y `Cache-Control: no-store, private` en health.
- Auditoría de `.next/static`: no se encontraron lecturas de `process.env.SUPABASE_SERVICE_ROLE_KEY` ni los marcadores privados de prueba. La comprobación se hizo sin secretos reales.
- Git ignora `.env`, `.env.local` y `.env.production.local`; el único archivo de entorno versionado es `.env.example`.

## Decisiones de compatibilidad y alcance

Se usa `eslint . --max-warnings=0` porque Next.js 16 eliminó `next lint`. `pretypecheck` genera tipos antes de ejecutar `tsc --noEmit`; `prebuild` valida el entorno antes de `next build`. Vercel ejecuta `npm run build` mediante la configuración versionada.

Cloudflare Pages solo admite la variante estática, incompatible con la ruta dinámica y el uso de cookies actuales. El despliegue completo en Cloudflare requiere integrar y probar un adaptador para Workers. Esta tarea queda fuera de la configuración de Vercel entregada; no se declara soporte de ejecución en Pages. Consulta [la guía de despliegue](deployment.md).

Las vistas actuales son demostrativas. Envío de sugerencias, consulta real de tickets, autenticación, migraciones y políticas RLS corresponden a los siguientes entregables. Los tipos de base de datos son provisionales y el endpoint health confirma únicamente la instanciación del cliente.
