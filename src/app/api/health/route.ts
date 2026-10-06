import { access, constants, statfs } from "node:fs/promises";

import { getPool, sanitizeDbMessage } from "@/lib/db";
import {
  getAuthEnv,
  getRateLimitSecret,
  getUploadDir,
  InfrastructureEnvironmentError,
} from "@/lib/server-env";

export const dynamic = "force-dynamic";

export const SYSTEM_VERSION = "v1.0.0-onpremise";

type ComponentStatus = "ok" | "error" | "not_configured";

interface DatabaseCheckResult {
  status: ComponentStatus;
  responseTimeMs: number | null;
}

interface StorageCheckResult {
  status: ComponentStatus;
  writable: boolean;
  freeBytes: number | null;
  totalBytes: number | null;
}

async function checkDatabase(): Promise<DatabaseCheckResult> {
  const start = performance.now();
  try {
    const pool = getPool();
    if (!pool) return { status: "not_configured", responseTimeMs: null };
    await pool.query("SELECT 1");
    const responseTimeMs = Math.round((performance.now() - start) * 100) / 100;
    return { status: "ok", responseTimeMs };
  } catch (error) {
    if (!(error instanceof InfrastructureEnvironmentError)) {
      console.error(
        "[health] PostgreSQL no disponible:",
        sanitizeDbMessage((error as Error).message),
      );
    }
    return { status: "error", responseTimeMs: null };
  }
}

async function checkStorage(): Promise<StorageCheckResult> {
  const uploadDir = getUploadDir();
  try {
    await access(uploadDir, constants.R_OK | constants.W_OK);
    let freeBytes: number | null = null;
    let totalBytes: number | null = null;
    try {
      const stats = await statfs(uploadDir);
      freeBytes = Number(stats.bavail) * Number(stats.bsize);
      totalBytes = Number(stats.blocks) * Number(stats.bsize);
    } catch {
      // statfs may be unavailable on unsupported platforms or mock fs
    }
    return { status: "ok", writable: true, freeBytes, totalBytes };
  } catch {
    return { status: "error", writable: false, freeBytes: null, totalBytes: null };
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
 * GET /api/health — infrastructure readiness probe and deep diagnostic endpoint.
 * Healthy (200) when PostgreSQL answers and the uploads volume is writable.
 * Degraded (503) if PostgreSQL or the uploads volume fails.
 * Includes database latency (ms), storage metrics, system uptime and version.
 */
export async function GET() {
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  const [dbResult, storageResult] = await Promise.all([checkDatabase(), checkStorage()]);
  const auth = checkAuthConfiguration();
  const healthy = dbResult.status === "ok" && storageResult.status === "ok";
  const uptime = Math.round(process.uptime() * 100) / 100;

  return Response.json(
    {
      status: healthy ? "ok" : "unavailable",
      version: SYSTEM_VERSION,
      uptime,
      message: healthy
        ? "Servicios de infraestructura operativos."
        : "Uno o más servicios de infraestructura no están disponibles.",
      checks: {
        database: dbResult.status,
        storage: storageResult.status,
        auth,
      },
      metrics: {
        dbResponseTimeMs: dbResult.responseTimeMs,
        storage: {
          writable: storageResult.writable,
          freeBytes: storageResult.freeBytes,
          totalBytes: storageResult.totalBytes,
        },
        uptimeSeconds: uptime,
      },
    },
    { status: healthy ? 200 : 503, headers },
  );
}

