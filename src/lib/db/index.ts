import "server-only";

import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

import { getDatabaseUrl, InfrastructureEnvironmentError } from "@/lib/server-env";

/**
 * Native PostgreSQL access layer for the local `db` service (postgres:16-alpine).
 *
 * - One lazily created pool per process, shared across hot reloads via globalThis.
 * - `query()` for single statements, `withTransaction()` for atomic units of work.
 * - Errors are logged without connection strings, parameters or row contents.
 */

/** Minimal executor shared by the pool and by a transaction-bound client. */
export interface DbExecutor {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[],
  ): Promise<T[]>;
}

const OID_DATE = 1082;
const OID_TIMESTAMP = 1114;
const OID_TIMESTAMPTZ = 1184;

const parseTimestamptz = types.getTypeParser(OID_TIMESTAMPTZ) as (value: string) => Date;

/**
 * Row types across the app model dates as strings: `date` stays `YYYY-MM-DD`
 * (no time zone shift) and `timestamptz` becomes an ISO-8601 UTC instant.
 */
const rowTypes = {
  getTypeParser(oid: number, format?: string) {
    if (format !== "binary") {
      if (oid === OID_DATE || oid === OID_TIMESTAMP) return (value: string) => value;
      if (oid === OID_TIMESTAMPTZ) return (value: string) => parseTimestamptz(value).toISOString();
    }
    return types.getTypeParser(oid, format as "text");
  },
} as unknown as typeof types;

const globalForDb = globalThis as unknown as {
  __buzonPgPool?: Pool;
  __buzonPgShutdownHook?: boolean;
};

/** Strips credentials from anything that looks like a connection string. */
export function sanitizeDbMessage(message: string): string {
  return message.replace(/(postgres(?:ql)?:\/\/)[^@\s/]*@/gi, "$1***@");
}

function logDbError(scope: string, error: unknown): void {
  const code = (error as { code?: string })?.code ?? "UNKNOWN";
  const message = error instanceof Error ? sanitizeDbMessage(error.message) : "Error desconocido";
  console.error(`[db] ${scope} (${code}): ${message}`);
}

function registerShutdownHook(): void {
  if (globalForDb.__buzonPgShutdownHook) return;
  globalForDb.__buzonPgShutdownHook = true;

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      void closePool().finally(() => process.exit(0));
    });
  }
}

/**
 * Returns the shared pool, or null when DATABASE_URL is not configured so
 * health checks can report a degraded state instead of crashing.
 */
export function getPool(): Pool | null {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return null;

  if (!globalForDb.__buzonPgPool) {
    const pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      application_name: "buzon-comedor-unsch",
      types: rowTypes,
    });

    // An idle client dropped by the server must not take the process down.
    pool.on("error", (error) => logDbError("conexión inactiva", error));

    globalForDb.__buzonPgPool = pool;
    registerShutdownHook();
  }

  return globalForDb.__buzonPgPool;
}

function requirePool(): Pool {
  const pool = getPool();
  if (!pool) {
    throw new InfrastructureEnvironmentError(
      "Falta configurar la variable de entorno DATABASE_URL en el servidor.",
    );
  }
  return pool;
}

function executorFor(client: Pool | PoolClient): DbExecutor {
  return {
    async query<T extends QueryResultRow = QueryResultRow>(
      text: string,
      params: readonly unknown[] = [],
    ): Promise<T[]> {
      const result = await client.query<T>(text, params as unknown[]);
      return result.rows;
    },
  };
}

/** Runs a single parameterized statement and returns its rows. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  try {
    return await executorFor(requirePool()).query<T>(text, params);
  } catch (error) {
    logDbError("consulta", error);
    throw error;
  }
}

/**
 * Runs `work` inside BEGIN/COMMIT on a dedicated connection. Any thrown error
 * rolls the transaction back and is rethrown to the caller.
 */
export async function withTransaction<T>(work: (tx: DbExecutor) => Promise<T>): Promise<T> {
  const client = await requirePool().connect();

  try {
    await client.query("BEGIN");
    const result = await work(executorFor(client));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      logDbError("rollback", rollbackError);
    }
    // Domain errors (rate limits, validations) are expected; only driver errors are logged.
    if ((error as { code?: unknown })?.code !== undefined) {
      logDbError("transacción", error);
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Drains and closes the pool (graceful shutdown, tests and hot reloads). */
export async function closePool(): Promise<void> {
  const pool = globalForDb.__buzonPgPool;
  if (!pool) return;

  globalForDb.__buzonPgPool = undefined;
  try {
    await pool.end();
  } catch (error) {
    logDbError("cierre del pool", error);
  }
}
