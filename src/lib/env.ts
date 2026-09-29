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

function publicKeySchema(name: string) {
  return requiredString(name)
    .min(12, `${name} debe tener al menos 12 caracteres.`)
    .refine(
      (value) => !isPrivilegedKey(value),
      `${name} debe ser pública; no puede contener una clave privilegiada.`,
    );
}

function getSupabasePublicKey(): string {
  // Direct references let Next.js inline only explicitly public variables.
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Validate both configured slots, even the one that is not selected.
  const anon = anonKey?.trim() ? parseEnvironment(publicKeySchema("NEXT_PUBLIC_SUPABASE_ANON_KEY"), anonKey) : undefined;
  const publishable = publishableKey?.trim() ? parseEnvironment(publicKeySchema("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), publishableKey) : undefined;
  if (!anon && !publishable) {
    throw new SupabaseEnvironmentError("Falta configurar la variable de entorno NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Define al menos una clave pública.");
  }
  return (publishable ?? anon)!;
}

const supabasePublicSchema = z.strictObject({
  NEXT_PUBLIC_SUPABASE_URL: httpUrl("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKeySchema("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
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
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getSupabasePublicKey(),
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
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getSupabasePublicKey(),
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
