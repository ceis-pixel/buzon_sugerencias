import { z } from "zod";

/**
 * Public (browser-safe) build configuration. Server-only infrastructure
 * settings and secrets live in `server-env.ts` and are read at runtime.
 */

export class PublicEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicEnvironmentError";
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

export const publicEnvironmentSchema = z.strictObject({
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

export function getPublicEnv(): PublicEnvironment {
  // Accesos directos para que Next.js incorpore solo las variables públicas.
  const result = publicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN: process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN,
  });

  if (!result.success) {
    throw new PublicEnvironmentError(
      result.error.issues.map((issue) => issue.message).join(" "),
    );
  }

  return result.data;
}
