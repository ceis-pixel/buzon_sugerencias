# Buzón de Sugerencias - Comedor UNSCH

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
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor; mínimo 20 caracteres, obligatoria al importar el cliente privilegiado |
| `NEXT_PUBLIC_APP_URL` | URL HTTP/HTTPS de la aplicación; usar el dominio real en producción |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` | Dominio estudiantil sin @, protocolo ni ruta; valor institucional `unsch.edu.pe` |

Zod valida las cuatro variables públicas antes de `npm run build`, mediante `prebuild`. Los clientes también validan su configuración al instanciarse. Importar el esquema, ejecutar ESLint o comprobar tipos no exige credenciales. Los errores están en español y no incluyen valores. La validación verifica formato y presencia; no confirma que una credencial sea auténtica.

Las variables `NEXT_PUBLIC_` quedan incorporadas al compilar: configura los valores de cada entorno antes del build y recompila cuando cambien. Nunca copies la clave de servicio a una variable pública. El prebuild rechaza alias públicos de service role y coincidencias con el secreto; el esquema rechaza claves `sb_secret_` y JWT con rol `service_role` en el campo anon. La lectura de la clave administrativa permanece en el módulo `server-only`.

Para CI se permiten los placeholders de `.env.example`, con las cuatro variables públicas definidas y sin clave administrativa. No hay omisión automática de validación ni valores predeterminados silenciosos en producción. Consulta [la guía de despliegue](docs/deployment.md) para configurar Vercel y conocer la limitación de Cloudflare Pages.

- Browser: import `createClient` from `@/lib/supabase/client` in a Client Component.
- Server Components and Server Actions: import and await `createClient` from `@/lib/supabase/server`. A new client is created for each request.
- Route Handlers: pass your outgoing `Headers` to `createClient(headers)` and reuse those headers in the response. This forwards the cache prevention headers supplied by `@supabase/ssr` when it writes session cookies. Use `Cache-Control: private, no-store` for authenticated responses.
- Privileged server tasks: import `supabaseAdmin` from `@/lib/supabase/admin`. This client uses the service role, bypasses RLS, and disables user-session persistence, automatic refresh, and URL session detection. Do not expose it through user-facing helpers or a shared barrel export.

Both server modules use `server-only` to reject Client Component imports. Standalone TypeScript scripts importing the admin module must load their environment first, resolve the project's `@/*` alias, and enable Node's `react-server` export condition for the `server-only` marker.

The helpers do not implement login or authorization. Before using sessions in protected Server Components, add a Next.js Proxy that refreshes tokens and writes them to the request and response, as described in the [Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs). Components cannot persist cookies; only that specific read-only error is tolerated by the helper. Other write failures propagate. Validate identity with `auth.getClaims()` or `auth.getUser()` before protected operations.

### Health endpoint

`GET /api/health` returns `200` after creating the request-scoped Supabase client, or `503` with a configuration error when its public variables are absent or invalid. Responses are not cached. This is an initialization check, not a database connectivity, credential validity, schema, or authorization check; it makes no Supabase API requests and does not require the service role key.

### Provisional database contract

`src/types/database.types.ts` contains the initial public schema contract, not generated evidence of an existing database. No tables, migrations, or RLS policies are created in this issue. Its assumptions are:

- `suggestions`: UUID `id`, generated `ticket_code`, required `content` and `meal_shift`, `status` defaulting to `pending`, and database-generated `created_at`/`updated_at` timestamps.
- `admins`: UUID `id` supplied from the administrator's auth identity, required `full_name`, and a generated `created_at` timestamp. Passwords are managed by Supabase Auth.
- `ticket_responses`: generated UUID `id`, required `suggestion_id`, `admin_id`, and `message`, plus a generated `created_at` timestamp. The two foreign keys reference `suggestions.id` and `admins.id`.
- `meal_shift`: `breakfast`, `lunch`, `dinner`; `suggestion_status`: `pending`, `in_review`, `resolved`.

Once migrations are established, replace the whole type file with [Supabase CLI output](https://supabase.com/docs/guides/api/rest/generating-types) and run the type checks again:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public > src/types/database.types.ts
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
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── ShiftBadge.tsx
│   │   ├── StatusBadge.tsx
│   │   └── not-found-message.tsx
│   ├── examples/
│   │   ├── BadgeShowcase.tsx
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

The current page temporarily demonstrates Sprint 2 badges, ticket states, meal shifts, and buttons inside the institutional layout. Its actions only update local state; they do not send suggestions or query tickets. The header's ticket shortcut still targets the consultation button. The welcome component remains available for later integration. Suggestion submission, ticket lookup, authentication flows, database migrations, RLS policies, and administration screens belong to later issues.

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

The home page now starts with `BadgeShowcase` and retains the button demonstration below it. All examples use local state only.

`Badge` is a compact, non-interactive span that can render on the server. It accepts native span attributes, `children`, `className`, `icon`, `withDot`, and `pulse`. Variants are `primary`, `secondary`, `tertiary`, `neutral` (default), `success`, `warning`, and `outline`; sizes are `sm` (default) and `md`. Pulse is opt-in, only applies to the dot, and stops with reduced motion. Icons and dots are decorative; readable labels carry the meaning.

```tsx
<Badge variant="tertiary" withDot pulse>Aviso del sistema</Badge>
<StatusBadge status="pending" />
<StatusBadge status="in_review" size="md" />
<ShiftBadge shift="lunch" isSelected />
```

`StatusBadge` derives its status type from `Database` and maps `pending`, `in_review`, and `resolved` to Pendiente, En revisión, and Atendido with Clock, Eye, and CheckCircle2. Colors follow the prescribed amber, tertiary, and emerald palettes. `ShiftBadge` similarly maps breakfast, lunch, and dinner to Desayuno, Almuerzo, and Cena with Coffee, UtensilsCrossed, and Moon. Selection uses the primary token and includes hidden text for assistive technology.

Domain components accept the base badge's size, dot, pulse, and native span attributes, while resolving their own labels, variants, and icons. For an interactive filter, wrap `ShiftBadge` in a native button with `aria-pressed`, a click handler, and a 44px minimum touch target, as shown in `BadgeShowcase`. Use a live region around an updated ticket status only where announcements are needed; static badges do not announce themselves independently.
