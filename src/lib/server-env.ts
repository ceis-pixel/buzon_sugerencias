import "server-only";

import path from "node:path";

/**
 * Server-only infrastructure configuration for the on-premise deployment (OTI UNSCH).
 *
 * These values are read at RUNTIME from the container environment (docker compose
 * `env_file`), never at build time, so credentials are not baked into image layers
 * or client bundles. Never prefix them with NEXT_PUBLIC_.
 */

const DEFAULT_UPLOAD_DIR = "/app/uploads";
const DEFAULT_ALLOWED_EMAIL_DOMAIN = "unsch.edu.pe";
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export class InfrastructureEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InfrastructureEnvironmentError";
  }
}

/**
 * Absolute directory where suggestion photos are persisted (Docker volume `app_uploads`).
 * Falls back to `/app/uploads` in containers; relative values resolve from the process cwd.
 */
export function getUploadDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  // Runtime-only location (Docker volume): keep it out of build-time file tracing.
  return path.resolve(/* turbopackIgnore: true */ configured || DEFAULT_UPLOAD_DIR);
}

/** Institutional e-mail domain (without "@") allowed to upload media. */
export function getAllowedEmailDomain(): string {
  const configured = (
    process.env.ALLOWED_EMAIL_DOMAIN ??
    process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ??
    DEFAULT_ALLOWED_EMAIL_DOMAIN
  ).trim().toLowerCase();

  if (!DOMAIN_PATTERN.test(configured)) {
    throw new InfrastructureEnvironmentError(
      "ALLOWED_EMAIL_DOMAIN debe ser un dominio válido, sin @, protocolo ni ruta.",
    );
  }

  return configured;
}

/**
 * PostgreSQL connection string for the local `db` service.
 * Returns null when not configured so callers can report a degraded state
 * instead of crashing; the value itself is never logged or echoed.
 */
export function getDatabaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new InfrastructureEnvironmentError(
      "DATABASE_URL debe ser una cadena de conexión válida con el esquema postgresql://.",
    );
  }

  return value;
}

/** Example values shipped in .env.example; they must never reach a real deployment. */
const PLACEHOLDER_SECRET_PATTERN = /^(genera_|cambia_|tu_|changeme)/i;

function requireSecret(name: string, minLength: number): string {
  const value = process.env[name]?.trim() ?? "";

  if (!value) {
    throw new InfrastructureEnvironmentError(
      `Falta configurar la variable de entorno ${name} en el servidor.`,
    );
  }
  if (value.length < minLength || PLACEHOLDER_SECRET_PATTERN.test(value)) {
    throw new InfrastructureEnvironmentError(
      `${name} debe ser un secreto aleatorio de al menos ${minLength} caracteres (por ejemplo: openssl rand -base64 32).`,
    );
  }

  return value;
}

export interface AuthEnvironment {
  secret: string;
  googleClientId: string;
  googleClientSecret: string;
}

/** NextAuth + Google Workspace SSO credentials. Read per request, never at build time. */
export function getAuthEnv(): AuthEnvironment {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";

  if (!googleClientId || !googleClientSecret) {
    throw new InfrastructureEnvironmentError(
      "Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET para el inicio de sesión institucional.",
    );
  }

  return {
    secret: requireSecret("NEXTAUTH_SECRET", 32),
    googleClientId,
    googleClientSecret,
  };
}

/**
 * Server-side key for the ephemeral anti-spam hash. It must stay independent
 * from NEXTAUTH_SECRET so a leaked session key never allows re-linking a
 * student to a rate-limit record.
 */
export function getRateLimitSecret(): string {
  return requireSecret("RATE_LIMIT_HMAC_SECRET", 32);
}
