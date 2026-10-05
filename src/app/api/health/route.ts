import { access, constants } from "node:fs/promises";

import { getPool, sanitizeDbMessage } from "@/lib/db";
import {
  getAuthEnv,
  getRateLimitSecret,
  getUploadDir,
  InfrastructureEnvironmentError,
} from "@/lib/server-env";

export const dynamic = "force-dynamic";

type ComponentStatus = "ok" | "error" | "not_configured";

async function checkDatabase(): Promise<ComponentStatus> {
  try {
    const pool = getPool();
    if (!pool) return "not_configured";
    await pool.query("SELECT 1");
    return "ok";
  } catch (error) {
    if (!(error instanceof InfrastructureEnvironmentError)) {
      console.error(
        "[health] PostgreSQL no disponible:",
        sanitizeDbMessage((error as Error).message),
      );
    }
    return "error";
  }
}

async function checkStorage(): Promise<ComponentStatus> {
  try {
    await access(getUploadDir(), constants.R_OK | constants.W_OK);
    return "ok";
  } catch {
    return "error";
  }
}

/** Presence and strength of the auth secrets only; values are never echoed. */
function checkAuthConfiguration(): ComponentStatus {
  try {
    getAuthEnv();
    getRateLimitSecret();
    return "ok";
  } catch {
    return "not_configured";
  }
}

/**
 * GET /api/health — infrastructure readiness probe used by the Docker healthcheck.
 * Healthy (200) when PostgreSQL answers and the uploads volume is writable.
 * The auth configuration is reported for operators and does not affect liveness.
 */
export async function GET() {
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  const [database, storage] = await Promise.all([checkDatabase(), checkStorage()]);
  const auth = checkAuthConfiguration();
  const healthy = database === "ok" && storage === "ok";

  return Response.json(
    {
      status: healthy ? "ok" : "unavailable",
      message: healthy
        ? "Servicios de infraestructura operativos."
        : "Uno o más servicios de infraestructura no están disponibles.",
      checks: { database, storage, auth },
    },
    { status: healthy ? 200 : 503, headers },
  );
}
