import { readFile, readdir } from "node:fs/promises";
import { PGlite, types } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * In-process PostgreSQL (PGlite) loaded with the real project migrations, plus
 * a drop-in replacement for `@/lib/db` so services run their actual SQL.
 *
 *   vi.mock("@/lib/db", async () => (await import("./helpers/testDb")).dbModuleMock);
 */

const migrationsUrl = new URL("../../supabase/migrations/", import.meta.url);
const bootstrapUrl = new URL("../fixtures/supabase-bootstrap.sql", import.meta.url);

let current: PGlite | null = null;

/** Mirrors the pool type parsers: timestamptz as ISO-8601 UTC, date as YYYY-MM-DD. */
function toIsoInstant(value: string): string {
  return new Date(value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00")).toISOString();
}

export async function startTestDb(): Promise<PGlite> {
  const db = new PGlite({
    extensions: { pgcrypto },
    parsers: {
      [types.TIMESTAMPTZ]: toIsoInstant,
      [types.DATE]: (value: string) => value,
    },
  });

  await db.exec(await readFile(bootstrapUrl, "utf8"));
  for (const name of (await readdir(migrationsUrl)).filter((file) => file.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(name, migrationsUrl), "utf8"));
  }

  current = db;
  return db;
}

export async function stopTestDb(): Promise<void> {
  await current?.close();
  current = null;
}

function requireDb(): PGlite {
  if (!current) throw new Error("Test database not started. Call startTestDb() in beforeAll.");
  return current;
}

type Queryable = Pick<PGlite, "query">;

function executorFor(target: Queryable) {
  return {
    async query<T>(text: string, params: readonly unknown[] = []): Promise<T[]> {
      return (await target.query<T>(text, params as unknown[])).rows;
    },
  };
}

export const dbModuleMock = {
  query: <T>(text: string, params: readonly unknown[] = []) =>
    executorFor(requireDb()).query<T>(text, params),
  withTransaction: <T>(work: (tx: ReturnType<typeof executorFor>) => Promise<T>) =>
    requireDb().transaction((tx) => work(executorFor(tx as unknown as Queryable))) as Promise<T>,
  getPool: () => null,
  closePool: async () => {},
  sanitizeDbMessage: (message: string) => message,
};
