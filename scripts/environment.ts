import { SupabaseEnvironmentError } from "../src/lib/env";

export function assertNoPublicSecrets(environment: Record<string, string | undefined>): void {
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const exposesSecret = Object.entries(environment).some(([name, value]) =>
    name.startsWith("NEXT_PUBLIC_") && (
      /SERVICE_ROLE/i.test(name) ||
      (serviceRoleKey && value?.trim() === serviceRoleKey)
    ),
  );

  if (exposesSecret) {
    throw new SupabaseEnvironmentError(
      "La configuración pública expone una clave de servicio. Elimina la variable NEXT_PUBLIC_ correspondiente antes de compilar.",
    );
  }
}
