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

## Supabase configuration

Copy `.env.example` to `.env.local` and fill in the values for your project. Keep `.env.local` out of Git.

| Variable | Used by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | All clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and request-scoped server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged admin client only |

Public variables must be available when building browser code because Next.js inlines them. Configuration is validated when each client is instantiated; the admin module validates its server-only variables when imported. Missing or invalid values produce explanatory Spanish errors without exposing their values.

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

`npm run check` runs lint, type checking, unit tests, and the production build in sequence. Type checking generates Next.js route types first, so it also works in a fresh checkout. The tests use synthetic local configuration and mocks for request cookies and privileged credentials; they do not connect to a Supabase project. Type checking also verifies query inference and rejects invalid table names, missing required fields, and invalid enum values.

Next.js 16 does not run ESLint during builds; keep the lint step in validation workflows. Production builds need network access to download Manrope through `next/font/google`; font files are then served locally at runtime. The current static pages can build without Supabase variables because they do not instantiate clients; the dynamic health endpoint validates configuration on each request.

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
│   │   └── not-found-message.tsx
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

The current page demonstrates the responsive welcome layout. Both action buttons show local, accessible availability messages; they do not send suggestions or query tickets. The header's ticket shortcut targets the consultation button on the home page. Suggestion submission, ticket lookup, authentication flows, database migrations, RLS policies, and administration screens belong to later issues.
