import { z } from "zod";

export class SupabaseEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseEnvironmentError";
  }
}

function requiredString(name: string) {
  const message = `Falta configurar la variable de entorno ${name}. Agrégala en .env.local o en la configuración del servidor.`;
  return z.string({ error: message }).trim().min(1, message);
}

function httpUrl(name: string) {
  return requiredString(name).pipe(
    z.url({
      protocol: /^https?$/,
      error: `${name} debe ser una URL válida con protocolo HTTP o HTTPS.`,
    }).refine(
      (value) => {
        try {
          const url = new URL(value);
          return !url.username && !url.password;
        } catch {
          return true;
        }
      },
      `${name} no debe incluir credenciales en la URL.`,
    ),
  );
}

function isPrivilegedKey(value: string): boolean {
  if (value.startsWith("sb_secret_")) return true;
  const payload = value.split(".")[1];
  if (!payload) return false;

  try {
    const claims: unknown = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof claims === "object" && claims !== null &&
      "role" in claims && claims.role === "service_role";
  } catch {
    return false;
  }
}

const supabasePublicSchema = z.strictObject({
  NEXT_PUBLIC_SUPABASE_URL: httpUrl("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    .min(12, "NEXT_PUBLIC_SUPABASE_ANON_KEY debe tener al menos 12 caracteres.")
    .refine(
      (value) => !isPrivilegedKey(value),
      "NEXT_PUBLIC_SUPABASE_ANON_KEY debe ser pública; no puede contener una clave privilegiada.",
    ),
});

export const publicEnvironmentSchema = supabasePublicSchema.extend({
  NEXT_PUBLIC_APP_URL: httpUrl("NEXT_PUBLIC_APP_URL"),
  NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN: requiredString("NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN")
    .max(253, "NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN no debe superar 253 caracteres.")
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i,
      "NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN debe ser un dominio válido, sin @, protocolo ni ruta.",
    )
    .toLowerCase(),
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;

function parseEnvironment<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new SupabaseEnvironmentError(
      result.error.issues.map((issue) => issue.message).join(" "),
    );
  }
  return result.data;
}

export function getPublicEnv(): PublicEnvironment {
  // Accesos directos para que Next.js incorpore solo las variables públicas.
  return parseEnvironment(publicEnvironmentSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN: process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN,
  });
}

export function getSupabaseUrl(): string {
  return parseEnvironment(
    supabasePublicSchema.shape.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function getSupabasePublicEnv() {
  const env = parseEnvironment(supabasePublicSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function validateServiceRoleKey(value: string | undefined): string {
  // El módulo server-only entrega el valor; este archivo nunca lee el secreto.
  return parseEnvironment(
    requiredString("SUPABASE_SERVICE_ROLE_KEY")
      .min(20, "SUPABASE_SERVICE_ROLE_KEY debe tener al menos 20 caracteres."),
    value,
  );
}
