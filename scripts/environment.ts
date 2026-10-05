import { PublicEnvironmentError } from "../src/lib/env";

/** Server-only variables; a NEXT_PUBLIC_ copy would be inlined in the browser bundle. */
const SERVER_SECRET_NAMES = [
  "DATABASE_URL",
  "POSTGRES_PASSWORD",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "RATE_LIMIT_HMAC_SECRET",
] as const;

const SECRET_NAME_PATTERN = /(SECRET|PASSWORD|DATABASE_URL|PRIVATE_KEY|SERVICE_ROLE)/i;

export function assertNoPublicSecrets(environment: Record<string, string | undefined>): void {
  const secretValues = SERVER_SECRET_NAMES
    .map((name) => environment[name]?.trim())
    .filter((value): value is string => Boolean(value));

  const exposesSecret = Object.entries(environment).some(([name, value]) =>
    name.startsWith("NEXT_PUBLIC_") && (
      SECRET_NAME_PATTERN.test(name) ||
      (value?.trim() ? secretValues.includes(value.trim()) : false)
    ),
  );

  if (exposesSecret) {
    throw new PublicEnvironmentError(
      "La configuración pública expone un secreto del servidor. Elimina la variable NEXT_PUBLIC_ correspondiente antes de compilar.",
    );
  }
}
