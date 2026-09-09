import { loadEnvConfig } from "@next/env";

import { getPublicEnv, SupabaseEnvironmentError } from "../src/lib/env";
import { assertNoPublicSecrets } from "./environment";

// Usa la misma precedencia de archivos de entorno que next build.
loadEnvConfig(process.cwd(), false);

try {
  assertNoPublicSecrets(process.env);
  getPublicEnv();
  console.info("Configuración pública validada. No se requiere una clave de servicio para compilar.");
} catch (error) {
  console.error(error instanceof SupabaseEnvironmentError
    ? error.message
    : "No se pudo validar la configuración del entorno.");
  process.exitCode = 1;
}
