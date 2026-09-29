# Buzón de Sugerencias - Comedor UNSCH

El destino de despliegue es **Firebase App Hosting con backend Next.js SSR**, proyecto `buzon-sugerencia-2c621`. Consulta [configuración, secretos y comandos](docs/deployment.md) antes del primer despliegue. La aplicación conserva sus Server Actions y rutas dinámicas; el build genera `.next/`, no una exportación estática `out/`.

Foundation for the UNSCH university dining feedback system, including the Crimson Heritage design tokens, Manrope typography, and typed Supabase clients.

## Requirements

- Node.js 22.12+ (22.x), 24.x, or 26+. Supabase requires Node.js 22+, and the test runner supports these release lines.
- npm and Git.

## Local development

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The responsive welcome page works without Supabase credentials. Configure the variables below before using a Supabase client.

## Configuración del entorno

Copia `.env.example` a `.env.local` y reemplaza los ejemplos con los valores del proyecto. Git ignora los archivos de entorno y conserva únicamente la plantilla documentada.

| Variable | Uso y validación |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL HTTP/HTTPS sin credenciales; todos los clientes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon o publishable, mínimo 12 caracteres |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Alternativa a ANON_KEY, preferida si ambas están definidas; nunca admite secretos |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor; mínimo 20 caracteres, obligatoria al importar el cliente privilegiado |
| `NEXT_PUBLIC_APP_URL` | URL HTTP/HTTPS de la aplicación; usar el dominio real en producción |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` | Dominio estudiantil sin @, protocolo ni ruta; valor institucional `unsch.edu.pe` |

Zod valida las URL, el dominio y al menos una de las dos claves públicas antes de `npm run build`, mediante `prebuild`. Los clientes también validan su configuración al instanciarse. Importar el esquema, ejecutar ESLint o comprobar tipos no exige credenciales. Los errores están en español y no incluyen valores. La validación verifica formato y presencia; no confirma que una credencial sea auténtica.

Las variables `NEXT_PUBLIC_` quedan incorporadas al compilar: configura los valores de cada entorno antes del build y recompila cuando cambien. Nunca copies la clave de servicio a una variable pública. El prebuild rechaza alias públicos de service role y coincidencias con el secreto; el esquema rechaza claves `sb_secret_` y JWT con rol `service_role` en el campo anon. La lectura de la clave administrativa permanece en el módulo `server-only`.

Para CI se permiten los placeholders de `.env.example`, con la configuración pública definida y sin clave administrativa. No hay omisión automática de validación ni valores predeterminados silenciosos en producción. Consulta [la guía de despliegue](docs/deployment.md) para configurar Firebase App Hosting y conocer las alternativas de alojamiento.

- Browser: import `createClient` from `@/lib/supabase/client` in a Client Component.
- Server Components and Server Actions: import and await `createClient` from `@/lib/supabase/server`. A new client is created for each request.
- Route Handlers: pass your outgoing `Headers` to `createClient(headers)` and reuse those headers in the response. This forwards the cache prevention headers supplied by `@supabase/ssr` when it writes session cookies. Use `Cache-Control: private, no-store` for authenticated responses.
- Privileged server tasks: import `supabaseAdmin` from `@/lib/supabase/admin`. This client uses the service role, bypasses RLS, and disables user-session persistence, automatic refresh, and URL session detection. Do not expose it through user-facing helpers or a shared barrel export.

Both server modules use `server-only` to reject Client Component imports. Standalone TypeScript scripts importing the admin module must load their environment first, resolve the project's `@/*` alias, and enable Node's `react-server` export condition for the `server-only` marker.

The helpers do not implement login or authorization. Before using sessions in protected Server Components, add a Next.js Proxy that refreshes tokens and writes them to the request and response, as described in the [Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs). Components cannot persist cookies; only that specific read-only error is tolerated by the helper. Other write failures propagate. Validate identity with `auth.getClaims()` or `auth.getUser()` before protected operations.

### Health endpoint

`GET /api/health` returns `200` after creating the request-scoped Supabase client, or `503` with a configuration error when its public variables are absent or invalid. Responses are not cached. This is an initialization check, not a database connectivity, credential validity, schema, or authorization check; it makes no Supabase API requests and does not require the service role key.

### Database contract — Sprint 3

`supabase/migrations/` contains the six ordered Sprint 3 migrations. `src/types/database.types.ts` is maintained against that SQL contract; it does not prove that a remote project has been migrated. See the [Sprint 3 closeout](docs/sprint-3-closeout.md) for the audit, application instructions, and test limits.

- `suggestions`: generated UUID `id`, required `shift`, `category`, and `message` (10 non-padding characters minimum, 500 characters maximum), optional `photo_url`. The insertion trigger fills null/blank `ticket_code`, always forces `pending`, and sets timestamps. Updates refresh `updated_at`. Explicit nonblank codes and creation timestamps are preserved.
- `admins`: generated UUID `id`, unique institutional `email`, `full_name`, `role`, `is_active`, and timestamps. This is a moderator whitelist, separate from Supabase Auth user IDs. `is_admin()` checks the active whitelist against the authenticated JWT email.
- `ticket_responses`: generated UUID `id`, required `suggestion_id`, `responder_email`, `response_text`, optional `is_internal` (false by default), and timestamps. The foreign keys reference `suggestions.id` and `admins.email`. Public responses are readable; internal notes require an active admin.
- `shift_type`: `breakfast`, `lunch`, `dinner`; `ticket_status`: `pending`, `in_review`, `resolved`; `suggestion_category`: `menu`, `hygiene`, `portion`, `service`, `infrastructure`.

After applying the migrations to the intended project, compare the contract with [Supabase CLI output](https://supabase.com/docs/guides/api/rest/generating-types). Preserve or relocate the domain type aliases, including `NewSuggestion`, when adopting generated types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public > database.generated.ts
```

## Validation and production

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run start
```

`npm run check-all` runs type checking, lint, and the validated production build. `npm run check` also runs unit tests first. The `pretypecheck` lifecycle generates Next.js route types, so type checking works in a fresh checkout. Tests use synthetic local configuration and mocks for request cookies and privileged credentials; they do not connect to a Supabase project. Type checking also verifies query inference and rejects invalid table names, missing required fields, and invalid enum values.

`npm run test -- tests/database-migrations.test.ts` executes all six migrations against isolated in-memory PostgreSQL via PGlite, including their SQL self-tests. Auth claims and Storage tables are explicit test fixtures, while PostgreSQL triggers, constraints, and RLS run normally. It does not emulate the Supabase HTTP services, upload size enforcement, or multiple concurrent database connections. PGlite is a development-only dependency.

Next.js 16 removed `next lint`; the supported equivalent is `eslint . --max-warnings=0`. Production builds need network access to download Manrope through `next/font/google`; font files are then served locally at runtime. Run `npm run build` to include environment validation; `vercel.json` sets that command explicitly. The dynamic health endpoint validates its own configuration on each request.

The [Sprint 1 closeout](docs/sprint-1-closeout.md) records the integrated deliverables and verification scope.

## Stack

- Next.js 16 with App Router and React 19.
- TypeScript with strict checking and the `@/*` alias mapped to `./src/*`.
- Tailwind CSS 3 with explicit PostCSS and Autoprefixer plugins.
- Lucide React icons.
- ESLint with Next.js Core Web Vitals and TypeScript rules.
- `@supabase/supabase-js` and `@supabase/ssr` with a shared `Database` type.
- Vitest for environment, cookie adapter, client isolation, and health checks.

Tailwind CSS 3 is intentional: it provides the PostCSS + Autoprefixer setup requested for Issue 1.1. See the [official Tailwind setup](https://v3.tailwindcss.com/docs/guides/nextjs). Dependency versions are recorded in `package-lock.json`; use `npm ci` for reproducible installs.

## Source structure

```text
src/
├── app/
│   ├── api/health/route.ts
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── page.tsx
├── components/
│   ├── common/
│   │   ├── AlertBanner.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── EmptyState.tsx
│   │   ├── emptyStatePresets.ts
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── ShiftBadge.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── Textarea.tsx
│   │   └── not-found-message.tsx
│   ├── examples/
│   │   ├── AlertBannerShowcase.tsx
│   │   ├── BadgeShowcase.tsx
│   │   ├── CardModalShowcase.tsx
│   │   ├── EmptyStateShowcase.tsx
│   │   ├── FormFieldsShowcase.tsx
│   │   └── ButtonShowcase.tsx
│   ├── feedback/
│   │   └── feedback-welcome.tsx
│   └── layout/
│       ├── Footer.tsx
│       ├── Header.tsx
│       └── PageContainer.tsx
├── lib/
│   ├── env.ts
│   ├── fonts.ts
│   ├── site-config.ts
│   └── supabase/
│       ├── admin.ts
│       ├── client.ts
│       └── server.ts
└── types/
    ├── database.types.ts
    └── site-config.ts
```

- `app/`: route composition, root layout, metadata, and global styles.
- `components/common/`: reusable interface primitives.
- `components/feedback/`: feedback feature components.
- `components/layout/`: sticky institutional header, discreet footer, and a mobile-first `PageContainer` with optional `title`, `subtitle`, and `badge` props. Views use the container to keep content centered within 576px, with 16px horizontal and 24px vertical padding.
- `lib/`: shared configuration and utilities.
- `types/`: shared TypeScript contracts; keep component-specific props with their component.

## Development conventions

- Write technical code, identifiers, filenames, and commit messages in English.
- Write all user-facing content in neutral Peruvian Spanish (`es-PE`).
- Keep one component per file under `src/components/`. App Router entry files only compose the interface.
- Use strict TypeScript and absolute `@/` imports for application modules.
- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), for example:

```text
feat(scaffold): initialize nextjs app router with typescript and tailwind
```

The current page demonstrates the complete Sprint 2 UI kit: alerts, form fields, empty states, cards, dialogs, badges, ticket states, meal shifts, and buttons inside the institutional layout. Its actions only update local state; they do not send suggestions or query tickets. The header's ticket shortcut still targets the consultation button. The welcome component remains available for later integration. Suggestion submission, ticket lookup, authentication flows, database migrations, RLS policies, and administration screens belong to later issues. See the [Sprint 2 closeout](docs/sprint-2-closeout.md) for validation scope.

## Sprint 2 — Button (Issue 2.1)

Import `Button` and `ButtonProps` from `@/components/common/Button`. Variants are `primary` (default), `secondary`, `ghost`, and `tertiary`; sizes are `sm`, `md` (default), and `lg`. All sizes retain a minimum 44px touch target. Manrope is inherited from the root theme.

```tsx
<Button leftIcon={<Send />} onClick={handleSubmit}>Enviar sugerencia</Button>
<Button variant="secondary" rightIcon={<Search />}>Consultar ticket</Button>
<Button fullWidth isLoading={isSubmitting}>Enviar sugerencia</Button>
<Button as="a" href="/tickets" variant="ghost">Consultar ticket</Button>
```

Native button attributes and a React 19 `ref` are supported. `type` defaults to `button` to avoid unintended form submission; set `type="submit"` explicitly inside a form. `as="a"` requires `href` and accepts anchor attributes and an anchor reference instead of button attributes.

`isLoading` retains the label, replaces the left icon with a decorative Lucide spinner, and disables the action. Disabled links lose their destination and tab stop, and their click handler suppresses activation. Native buttons use the HTML `disabled` attribute. Both expose `aria-busy` and `aria-disabled`; decorative icons stay outside the accessible name. Supply an explicit Spanish `aria-label` for icon-only controls. Reduced-motion preferences disable the spinner animation, scaling, and transitions.

`ButtonShowcase` covers all variants, sizes, disabled/loading states, full width, and link rendering. The loading demonstration uses an explicit finish control so it can be tested without timers or network calls. Validate with `npm run test` and `npm run check-all` using the environment documented above.

## Sprint 2 — Badges (Issue 2.3)

The home page includes `BadgeShowcase` and the button demonstration. All examples use local state only.

`Badge` is a compact, non-interactive span that can render on the server. It accepts native span attributes, `children`, `className`, `icon`, `withDot`, and `pulse`. Variants are `primary`, `secondary`, `tertiary`, `neutral` (default), `success`, `warning`, and `outline`; sizes are `sm` (default) and `md`. Pulse is opt-in, only applies to the dot, and stops with reduced motion. Icons and dots are decorative; readable labels carry the meaning.

```tsx
<Badge variant="tertiary" withDot pulse>Aviso del sistema</Badge>
<StatusBadge status="pending" />
<StatusBadge status="in_review" size="md" />
<ShiftBadge shift="lunch" isSelected />
```

`StatusBadge` derives its status type from `Database` and maps `pending`, `in_review`, and `resolved` to Pendiente, En revisión, and Atendido with Clock, Eye, and CheckCircle2. Colors follow the prescribed amber, tertiary, and emerald palettes. `ShiftBadge` similarly maps breakfast, lunch, and dinner to Desayuno, Almuerzo, and Cena with Coffee, UtensilsCrossed, and Moon. Selection uses the primary token and includes hidden text for assistive technology.

Domain components accept the base badge's size, dot, pulse, and native span attributes, while resolving their own labels, variants, and icons. For an interactive filter, wrap `ShiftBadge` in a native button with `aria-pressed`, a click handler, and a 44px minimum touch target, as shown in `BadgeShowcase`. Use a live region around an updated ticket status only where announcements are needed; static badges do not announce themselves independently.

## Sprint 2 — Card and Modal (Issue 2.4)

The home page includes `CardModalShowcase` alongside the badge and button examples. Its form remains a local demonstration and performs no network requests or persistence.

`Card` supports `default`, `interactive`, `bordered`, and `ghost` variants and `none`, `sm`, `md` (default), and `lg` padding. Compose it with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`. Each subcomponent forwards native attributes and `className`; `CardTitle` defaults to `h2` and also supports `h3`/`h4`. Set `CardFooter withBorder` for the optional separator. Padding belongs to the root; subcomponents provide internal spacing without doubling it. All cards keep `rounded-2xl` and `shadow-sm`.

The interactive variant provides visual feedback. Supply a native link or button for the action, as demonstrated by the accessible button covering the lunch card. Do not nest additional interactive controls under that covering button.

```tsx
<Card>
  <CardHeader><CardTitle>Tu sugerencia</CardTitle></CardHeader>
  <CardContent><CardDescription>Comparte una idea para mejorar el comedor.</CardDescription></CardContent>
  <CardFooter withBorder><Button onClick={openModal}>Continuar</Button></CardFooter>
</Card>
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Comparte una idea">
  <p>Contenido de prueba.</p>
</Modal>
```

`Modal` is controlled: its owner must set `isOpen` to false in `onClose`. It uses native `dialog.showModal()` to enter the browser's top layer and make background content inert. Opening focuses its title; Tab and Shift+Tab remain within the dialog, and closing restores focus to the opener. Escape, the optional X button, and a pointer gesture that starts and ends on the backdrop request closure. Interior clicks and drags starting inside do not dismiss it. Body scroll locks are counted across instances and restore the previous inline overflow value on cleanup.

Optional props are `title`, `description`, `footer`, `size` (`sm`, `md`, `lg`, `full`), and `showCloseButton` (default true). Missing titles receive a hidden Spanish accessible name. Each instance uses distinct label IDs. If hiding the X, provide a visible closing action in the content/footer for touch users. The demonstration always retains Cancelar.

The dialog remains hidden during server rendering until its client effect opens it. A structural wrapper prevents parent spacing utilities from overriding its centered margins. Long content scrolls inside a viewport-limited panel while the header/footer remain visible. The fade animation respects reduced motion. Native `<dialog>` support is required; see [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

## Sprint 2 — EmptyState (Issue 2.5)

`EmptyState` accepts a Lucide component in `icon`, Spanish `title` and `description`, optional `action` and `secondaryAction`, `variant` (`card` by default or `plain`), and `className`. Card mode uses `rounded-2xl`, `shadow-sm`, a subtle border, and 32px padding. Plain mode has no background, border, or shadow and uses 40px vertical / 16px horizontal padding for embedding inside another container.

Both actions reuse `Button`. The primary action uses the primary variant and may include a Lucide `icon`; the secondary action uses ghost. Each accepts `label`, `onClick`, and `href`. A nonempty `href` renders a native link and keeps normal browser navigation; if a callback is also supplied, it runs on activation. Without `href`, the action is a non-submitting native button. An action without either a destination or a callback is disabled. Omitted actions render no controls.

```tsx
<EmptyState
  {...emptyStatePresets.ticketNotFound}
  action={{ label: "Buscar otro ticket", href: "#ticket-search", icon: Search }}
/>
<EmptyState
  {...emptyStatePresets.inboxClear}
  variant="plain"
  secondaryAction={{ label: "Refrescar datos", onClick: refreshData }}
/>
```

Import presets from `@/components/common/emptyStatePresets` and `EmptyState` from `@/components/common/EmptyState`. Render callback-based usages within a Client Component; static and link-only compositions may be rendered from synchronous Server Components. Keep the icon component and its preset in the same rendering environment rather than passing function-valued icons across a server/client boundary.

Each instance connects its heading and description through unique IDs. Icons are decorative, actions have visible Spanish labels, and the component does not create an alert/live region by default. The showcase puts announcements in separate status regions, demonstrates link navigation to a focused ticket field, and refreshes a simulated inbox without API calls or storage.

## Sprint 2 — Campos de formulario (Issue 2.2)

`Input` y `Textarea` se incorporaron durante el cierre del Issue 2.6 porque faltaban en el repositorio. Ambos requieren `label`, aceptan `helperText`, `error`, atributos HTML nativos, `className` y `ref` de React 19. Asocian etiquetas, ayuda y errores con IDs únicos, conservan `aria-describedby` externo y marcan `aria-invalid` cuando hay un error. La validación pertenece al formulario consumidor.

`Textarea` es controlado: requiere `value: string` y un `onChange` para editar, o `readOnly` para lectura. Su contador (`showCount`, activo por defecto) refleja el valor y el `maxLength` opcional; cuenta unidades UTF-16, como el límite nativo del navegador. No anuncia cada pulsación. El formulario de ejemplo valida un código ficticio `UNSCH-A39B`, exige 20 caracteres de contenido útil y limita la propuesta a 300. Al fallar, muestra ayuda didáctica y enfoca el primer campo inválido. Limpiar restablece valores, contador y errores. Estas reglas de ejemplo no constituyen el contrato definitivo del backend.

## Sprint 2 — AlertBanner (Issue 2.6)

`AlertBanner` es un Client Component. Recibe `description: ReactNode`, `title?`, `variant?`, `icon?: LucideIcon`, `action?`, `onClose?`, `isDismissible?` y `className?`. Usa Manrope, `rounded-2xl`, `shadow-sm`, iconos decorativos y controles con área táctil mínima de 44px.

| Variante | Uso | Paleta | Rol |
| --- | --- | --- | --- |
| `system` (predeterminada) | Avisos de la plataforma | `tertiary` #001586, fondo 5%, borde 20% | `status` |
| `info` | Orientación general | Neutros, texto gris oscuro | `status` |
| `warning` | Atención requerida | Ámbar | `alert` |
| `error` | Fallos de la operación | `primary` #5C0000, fondo 5%, borde 20% | `alert` |
| `success` | Confirmaciones | Esmeralda | `status` |

```tsx
<AlertBanner
  title="Aviso de la plataforma"
  description="Conserva tu código para consultar el estado de tu sugerencia."
  action={{ label: "Consultar ticket", href: "#ticket-search" }}
/>
<AlertBanner
  variant="error"
  title="No pudimos completar la consulta"
  description="Inténtalo nuevamente en unos minutos."
  action={{ label: "Reintentar", onClick: retry }}
  onClose={handleDismiss}
/>
```

El azul técnico no identifica a la institución: las etiquetas institucionales del encabezado y del contenedor usan carmesí. Las variantes `tertiary` de Button/Badge se reservan para avisos y el estado automático «En revisión» mantiene la semántica del Issue 2.3.

Una acción con `href` usa un enlace nativo; con `onClick` usa un botón que no envía formularios. Si se proporcionan ambos, el enlace conserva el callback. Sin destino ni callback, el botón queda deshabilitado.

`onClose` habilita el descarte por defecto. `isDismissible={false}` lo deshabilita; `isDismissible={true}` permite descartarlo localmente incluso sin callback. El componente se oculta después de la transición de 200ms y entonces llama a `onClose` una sola vez. El temporizador se cancela al desmontar y el movimiento reducido omite la espera. Para mostrar un nuevo aviso, monta una instancia nueva (por ejemplo, cambia su `key`). El consumidor decide dónde devolver el foco; la vitrina enfoca el botón para restaurar el aviso. No se descarta automáticamente por tiempo.

Define callbacks e iconos personalizados dentro de un Client Component para respetar la frontera de serialización de Next.js. Usa `alert` para mensajes urgentes y `status` para actualizaciones no urgentes. El anuncio inicial de contenido estático depende del lector de pantalla; estos roles son especialmente útiles cuando se insertan o actualizan mensajes tras una interacción.
