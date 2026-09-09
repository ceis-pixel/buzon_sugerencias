export class SupabaseEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseEnvironmentError";
  }
}

export function requireEnvironmentVariable(
  name: string,
  value: string | undefined,
): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new SupabaseEnvironmentError(
      `Falta configurar la variable de entorno ${name}. Agrégala en .env.local o en la configuración del servidor.`,
    );
  }

  return normalizedValue;
}

export function getSupabaseUrl(): string {
  const value = requireEnvironmentVariable(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error();
    }
  } catch {
    throw new SupabaseEnvironmentError(
      "NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida con protocolo HTTP o HTTPS.",
    );
  }

  return value;
}

export function getSupabasePublicEnv() {
  // Keep direct property access so Next.js can inline public browser variables.
  return {
    url: getSupabaseUrl(),
    anonKey: requireEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}
