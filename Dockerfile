# syntax=docker/dockerfile:1.7
#
# Buzón de Sugerencias - Comedor UNSCH
# Multi-stage image for on-premise deployment (OTI UNSCH).
#
#   Stage 1 (deps)    -> clean, reproducible dependency install (npm ci + layer cache)
#   Stage 2 (builder) -> Next.js standalone build, telemetry disabled
#   Stage 3 (runner)  -> minimal runtime, non-root user nextjs:nodejs (1001:1001)
#
# Security notes:
#   - No secrets are accepted as build args. DATABASE_URL, NEXTAUTH_SECRET,
#     GOOGLE_CLIENT_SECRET and RATE_LIMIT_HMAC_SECRET are injected at RUNTIME
#     by docker compose (env_file), never baked in layers.
#   - Only NEXT_PUBLIC_* values (public by definition, inlined into the browser
#     bundle) may be passed as build args.
#   - .dockerignore excludes every .env* file from the build context.

# Matches "engines" in package.json and the CI pipeline. Node 20 cannot install
# this lockfile (npm 11) and several dependencies require Node >= 22.
ARG NODE_VERSION=24

# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
# libc6-compat: glibc shim required by some prebuilt native binaries (SWC).
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---------------------------------------------------------------------------
# Stage 1: deps
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
# Stage 2: builder
# ---------------------------------------------------------------------------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1

# Public, non-secret build-time configuration (inlined in client bundles).
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=unsch.edu.pe

ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=${NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: runner
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads

# Unprivileged runtime identity (UID/GID 1001) and persistent media directory.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs \
 && mkdir -p /app/uploads \
 && chown nextjs:nodejs /app/uploads \
 && chmod 750 /app/uploads

# Copy ONLY the standalone server, static assets and public files.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs:nodejs

EXPOSE 3000

# Readiness: PostgreSQL reachable and uploads volume writable (see /api/health).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health > /dev/null || exit 1

CMD ["node", "server.js"]
