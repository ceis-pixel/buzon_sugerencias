import { loadEnvConfig } from "@next/env";

import { getPublicEnv, PublicEnvironmentError } from "../src/lib/env";
import { assertNoPublicSecrets } from "./environment";

// Usa la misma precedencia de archivos de entorno que next build.
loadEnvConfig(process.cwd(), false);

try {
  assertNoPublicSecrets(process.env);
  // Los secretos (base de datos, NextAuth, Google) se inyectan en tiempo de
  // ejecución y nunca se requieren para compilar.
  getPublicEnv();
  console.info("Configuración pública validada. No se requieren secretos para compilar.");
} catch (error) {
  console.error(error instanceof PublicEnvironmentError
    ? error.message
    : "No se pudo validar la configuración de entorno.");
  process.exitCode = 1;
}
