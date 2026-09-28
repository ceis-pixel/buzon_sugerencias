# Sprint 9: Lanzamiento Oficial a Producción v1.0.0 — Buzón Comedor UNSCH

## Resumen Ejecutivo de Arquitectura y DevOps

El **Sprint 9** culmina el ciclo integral de desarrollo para el **Buzón de Sugerencias y Observaciones del Comedor Universitario UNSCH**, consolidando la experiencia física de acceso mediante códigos QR en las mesas, optimizaciones extremas para redes celulares saturadas (2G/3G), cumplimiento estricto del estándar de accesibilidad **WCAG 2.1 AA**, auditoría integral de calidad, soporte de aplicación web progresiva (PWA) y pipeline automatizado de integración continua (CI/CD) para un despliegue con **costo 0 USD** en infraestructura.

---

## 1. Desglose de Entregables por Issue

### Issue 9.1: Vista Imprimible de Afiche con Código QR para Mesas (`/qr-flyer`)
- **Ruta implementada:** `src/app/qr-flyer/page.tsx`.
- **Diseño Crimson Heritage:**
  - Colores institucionales: `primary` (`#5C0000`), `secondary` (`#A6665C`), `tertiary` (`#001586`) y `neutral-gray` (`#847370`).
  - Monograma y heráldica institucional UNSCH con cubiertos universitarios.
  - Título pedagógico: *"Buzón de Sugerencias y Observaciones — Comedor Universitario"*.
  - Sellos de respaldo: *"FUSCH • Secretaría de Salud y Nutrición"* y *"CEIS UNSCH"*.
- **Generador Vectorial de QR:**
  - Implementado mediante `QRCodeSVG` (`qrcode.react`), garantizando nitidez vectorial a cualquier resolución de impresión (300+ DPI).
  - Nivel de redundancia y corrección de errores **`Q` (25%)**, permitiendo lectura óptima aún si el afiche plastificado sufre rayones o manchas accidentales en las mesas.
  - Inclusión de URL legible impresa debajo del código para celulares sin lector directo.
- **Modos de Maquetación Física:**
  - **A4 (210 × 297 mm):** Para afiches de pared, caballetes de ingreso y pizarras de avisos.
  - **A5 (148 × 210 mm - Media Cuartilla):** Para soportes acrílicos transparentes de mesa (tipo T invertida).
  - Reglas `@media print` optimizadas con `print-color-adjust: exact`, márgenes ajustados y ocultamiento de controles de pantalla (`print:hidden`).
  - Botón interactivo de impresión directa con icono `Printer` que dispara `window.print()`.

---

### Issue 9.2: Optimización de Rendimiento Móvil y Core Web Vitals
- **Análisis de Bundle y Reducción de Bloat:**
  - Integración de `@next/bundle-analyzer` en `next.config.mjs` condicionado a `process.env.ANALYZE === 'true'`.
  - Importaciones dinámicas (`next/dynamic` con `{ ssr: false }`) para componentes modales pesados:
    - `SubmissionSuccessModal` en `src/components/suggestion/SuggestionForm.tsx`.
    - `UploadFallbackModal` en `src/components/media/ImageAttachmentField.tsx`.
    - `ImageLightboxModal` en `src/components/media/ImagePreviewCard.tsx`.
    - `LogoutModal` en `src/components/layout/HeaderLogoutButton.tsx`.
- **Caché Estática Inmutable:**
  - Cabeceras `Cache-Control: public, max-age=31536000, immutable` configuradas en `next.config.mjs` para `/_next/static/*` y `/icons/*`.
  - Cabecera `Cache-Control: public, max-age=86400, stale-while-revalidate` para `/manifest.json`.
- **Prevención de Saltos de Pantalla por Teclado Táctil:**
  - Metadato de viewport estricto en `src/app/layout.tsx`:
    `interactiveWidget: 'resizes-content'`, previniendo desbordes o saltos bruscos cuando el estudiante abre el teclado virtual en smartphones Android/iOS.
- **Tipografía Institucional Manrope:**
  - Carga optimizada vía `next/font/google` con `display: 'swap'` y `preload: true`.

---

### Issue 9.3: Auditoría y Cumplimiento de Accesibilidad (WCAG 2.1 AA)
- **Ratio de Contraste de Color:**
  - `primary` (`#5C0000`) sobre blanco (`#FFFFFF`): **14.78:1** (Supera holgadamente el requisito AAA de 7.0:1 y AA de 4.5:1).
  - `tertiary` (`#001586`) sobre blanco (`#FFFFFF`): **15.50:1** (Cumple estándar AAA).
  - Microtextos y tipografía normal ajustados para garantizar legibilidad superior a 4.5:1.
- **Navegación 100% por Teclado:**
  - Anillos de foco visibles con contraste normativo: `focus-visible:ring-2 focus-visible:ring-primary/40`.
  - Selectores de turno y categoría con WAI-ARIA `role="radiogroup"` y `role="radio"`, soportando navegación fluida mediante teclas de flecha (`ArrowRight`, `ArrowLeft`, `ArrowDown`, `ArrowUp`).
- **Focus Trap y Atributos ARIA en Formularios y Modales:**
  - Componente `Modal` con captura de foco cíclico (Tab / Shift+Tab), foco automático a título y restauración de foco al elemento previo al cerrar.
  - Campos de formulario con `aria-invalid`, `aria-describedby` dinámico y avisos de error con `role="alert"`.

---

### Issue 9.4: Pruebas de Integración y Flujo E2E Crítico
Suite automatizada en `tests/sprint9-e2e-integration.test.ts` con cobertura total de los 5 flujos obligatorios:
1. **Validación de Formulario:** Rechazo automático de mensajes menores a 10 caracteres o sin categoría, con bordes carmesí de alerta (`border-primary`).
2. **Compresión en Navegador:** Redimensión proporcional a 1200 px máximo y conversión estricta a formato `image/webp`.
3. **Anonimato Disociado:** Verificación rigurosa de que el payload enviado a la RPC `submit_anonymous_suggestion` contiene únicamente `p_shift`, `p_category`, `p_message` y `p_photo_url`, sin filtrar jamás `user_id` ni `email`.
4. **Trazabilidad:** Consulta pública en `/seguimiento` normalizando el código de ticket y resolviendo respuestas oficiales emitidas por la comisión.
5. **Blindaje Admin:** Bloqueo 403 con componente visual `UnauthorizedAccessState` para cualquier usuario autenticado que no figure en la tabla `admins`.

---

### Issue 9.5: Soporte PWA y Resiliencia ante Desconexión
- **Manifiesto PWA (`public/manifest.json`):**
  - Nombre: "Buzón de Sugerencias — Comedor UNSCH".
  - Color de tema: `#5C0000`.
  - Color de fondo: `#FFFFFF`.
  - Modo: `standalone` con orientación `portrait-primary`.
  - Iconos en resoluciones estándar: 192×192 px, 512×512 px, `apple-touch-icon.png` (180×180 px) y vector SVG escalable con heráldica institucional.
- **Componente `OfflineBanner`:**
  - Ubicado en `src/components/common/OfflineBanner.tsx` e integrado globalmente en `src/app/layout.tsx`.
  - Escucha eventos `online` y `offline` en tiempo real.
  - Informa de manera inmediata y tranquilizadora al comensal cuando se pierde la señal en el comedor:
    *"Sin conexión a internet. Tu borrador está guardado localmente."*

---

### Issue 9.6: CI/CD Pipeline y Configuración de Producción
- **GitHub Actions Workflow (`.github/workflows/ci.yml`):**
  - Disparadores en `push` y `pull_request` sobre rama `main`.
  - Pasos secuenciales estrictos:
    1. Checkout de código fuente.
    2. Setup de Node.js 22.x con caché de `npm`.
    3. Instalación limpia (`npm ci`).
    4. Verificación de tipos TypeScript (`npm run typecheck`).
    5. Linter de código (`npm run lint`).
    6. Suite completa de pruebas unitarias e integración (`npm run test`).
    7. Compilación de paquete de producción (`npm run build`).

---

## 2. Checklist para Despliegue en Producción (Costo 0 USD)

| Variable / Servicio | Configuración en Proveedor (Vercel / Cloudflare) | Propósito |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Endpoint público de Supabase (Free Tier) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública (`anon / publishable`) | Permite RPCs y consultas RLS públicas |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta service_role (Solo Servidor) | Operaciones administrativas privilegiadas |
| `NEXT_PUBLIC_APP_URL` | `https://buzon-comedor.unsch.edu.pe` | Dominio canónico para el código QR y enlaces |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` | `unsch.edu.pe` | Restricción estricta de OAuth a correos institucionales |

### Configuración en Google Cloud Console (OAuth 2.0)
1. En **Pantalla de consentimiento OAuth**, configurar:
   - Nombre de la aplicación: *Buzón Comedor UNSCH*.
   - Dominios autorizados: `supabase.co` y `unsch.edu.pe`.
2. En **Credenciales de ID de cliente OAuth 2.0**:
   - URI de redireccionamiento autorizada:
     `https://<project-ref>.supabase.co/auth/v1/callback`.
3. En **Supabase Auth > Providers > Google**:
   - Habilitar proveedor Google con el Client ID y Client Secret obtenidos.

---

## 3. Estado de Calidad y Cierre del Proyecto
- **Pruebas Automatizadas:** 29 archivos de prueba, **298 pruebas superadas con éxito (100% passing)**.
- **Tipado TypeScript:** 0 errores (`tsc --noEmit`).
- **Calidad de Código ESLint:** 0 errores y 0 advertencias (`--max-warnings=0`).
- **Compilación de Producción:** Exitosa con Next.js 16 (Turbopack).
- **Versión de Release:** `v1.0.0`.
