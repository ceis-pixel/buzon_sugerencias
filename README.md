# Buzón de Sugerencias - Comedor UNSCH

Base scaffold for the UNSCH university dining feedback system (Sprint 1, Issue 1.1).

## Requirements

- Node.js 20.9 or later.
- npm and Git.

## Local development

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). This scaffold requires no environment variables or external services.

## Validation and production

```bash
npm run lint
npm run typecheck
npm run build
npm run start
```

`npm run check` runs lint, type checking, and the production build in sequence. Type checking generates Next.js route types first, so it also works in a fresh checkout. Next.js 16 does not run ESLint during builds; keep the lint step in validation workflows.

## Stack

- Next.js 16 with App Router and React 19.
- TypeScript with strict checking and the `@/*` alias mapped to `./src/*`.
- Tailwind CSS 3 with explicit PostCSS and Autoprefixer plugins.
- Lucide React icons.
- ESLint with Next.js Core Web Vitals and TypeScript rules.

Tailwind CSS 3 is intentional: it provides the PostCSS + Autoprefixer setup requested for Issue 1.1. See the [official Tailwind setup](https://v3.tailwindcss.com/docs/guides/nextjs). Dependency versions are recorded in `package-lock.json`; use `npm ci` for reproducible installs.

## Source structure

```text
src/
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── page.tsx
├── components/
│   ├── common/
│   │   ├── not-found-message.tsx
│   │   └── page-container.tsx
│   ├── feedback/
│   │   └── feedback-welcome.tsx
│   └── layout/
│       ├── site-footer.tsx
│       └── site-header.tsx
├── lib/
│   └── site-config.ts
└── types/
    └── site-config.ts
```

- `app/`: route composition, root layout, metadata, and global styles.
- `components/common/`: reusable interface primitives.
- `components/feedback/`: feedback feature components.
- `components/layout/`: shared page structure.
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

The initial page is a static welcome screen. Suggestion submission, authentication, persistence, and administration belong to later issues.
