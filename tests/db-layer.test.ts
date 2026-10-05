import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pg = vi.hoisted(() => {
  const client = { query: vi.fn(), release: vi.fn() };
  const pool = {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
  };
  return { client, pool, Pool: vi.fn(), configs: [] as Array<Record<string, unknown>> };
});

vi.mock("pg", () => {
  class Pool {
    constructor(config: Record<string, unknown>) {
      pg.Pool(config);
      pg.configs.push(config);
      return pg.pool as unknown as Pool;
    }
  }
  const types = {
    getTypeParser: (oid: number) =>
      oid === 1184 ? (value: string) => new Date(value) : (value: string) => `default:${value}`,
  };
  return { Pool, types, default: { Pool, types } };
});

import { closePool, getPool, query, sanitizeDbMessage, withTransaction } from "@/lib/db";

const DATABASE_URL = "postgresql://unsch_admin:S3creta-Clave@db:5432/buzon_comedor";

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", DATABASE_URL);
  vi.spyOn(process, "once").mockImplementation(() => process);
  vi.spyOn(console, "error").mockImplementation(() => {});
  pg.configs.length = 0;
  pg.pool.connect.mockResolvedValue(pg.client);
  pg.pool.end.mockResolvedValue(undefined);
  pg.pool.query.mockResolvedValue({ rows: [] });
  pg.client.query.mockResolvedValue({ rows: [] });
});

afterEach(async () => {
  await closePool();
});

describe("native PostgreSQL pool", () => {
  it("is created lazily from DATABASE_URL and reused across calls", () => {
    expect(pg.Pool).not.toHaveBeenCalled();

    const first = getPool();
    const second = getPool();

    expect(first).toBe(second);
    expect(pg.Pool).toHaveBeenCalledTimes(1);
    expect(pg.configs[0]).toMatchObject({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    // Idle connection failures are handled instead of crashing the process.
    expect(pg.pool.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("reports a missing or malformed DATABASE_URL without creating a pool", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    expect(getPool()).toBeNull();
    await expect(query("SELECT 1")).rejects.toThrow("DATABASE_URL");

    vi.stubEnv("DATABASE_URL", "mysql://root:clave@db/buzon");
    expect(getPool).toThrow("postgresql://");
    expect(pg.Pool).not.toHaveBeenCalled();
  });

  it("maps dates to strings so rows match the application types", () => {
    getPool();
    const { getTypeParser } = pg.configs[0].types as {
      getTypeParser: (oid: number, format?: string) => (value: string) => unknown;
    };

    expect(getTypeParser(1082)("2026-10-05")).toBe("2026-10-05");
    expect(getTypeParser(1184)("2026-10-05 12:30:00-05")).toBe("2026-10-05T17:30:00.000Z");
    expect(getTypeParser(25)("texto")).toBe("default:texto");
  });

  it("closes the pool cleanly and builds a new one afterwards", async () => {
    getPool();
    await closePool();
    expect(pg.pool.end).toHaveBeenCalledTimes(1);

    await closePool(); // idempotent
    expect(pg.pool.end).toHaveBeenCalledTimes(1);

    getPool();
    expect(pg.Pool).toHaveBeenCalledTimes(2);
  });
});

describe("query()", () => {
  it("sends parameterized statements and returns typed rows", async () => {
    pg.pool.query.mockResolvedValue({ rows: [{ ticket_code: "UNSCH-7K4M" }] });

    const rows = await query<{ ticket_code: string }>(
      "SELECT ticket_code FROM public.suggestions WHERE ticket_code = $1",
      ["UNSCH-7K4M"],
    );

    expect(rows).toEqual([{ ticket_code: "UNSCH-7K4M" }]);
    expect(pg.pool.query).toHaveBeenCalledWith(
      "SELECT ticket_code FROM public.suggestions WHERE ticket_code = $1",
      ["UNSCH-7K4M"],
    );
  });

  it("logs failures without the password, the parameters or the statement", async () => {
    const failure = Object.assign(
      new Error(`connect ECONNREFUSED ${DATABASE_URL}`),
      { code: "ECONNREFUSED" },
    );
    pg.pool.query.mockRejectedValue(failure);

    await expect(query("SELECT $1::text", ["dato-sensible@unsch.edu.pe"])).rejects.toBe(failure);

    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("ECONNREFUSED");
    expect(logged).toContain("postgresql://***@db:5432");
    expect(logged).not.toContain("S3creta-Clave");
    expect(logged).not.toContain("dato-sensible");
    expect(logged).not.toContain("SELECT");
  });

  it("redacts credentials in any connection string", () => {
    expect(sanitizeDbMessage("fallo en postgres://u:p%40ss@host/db y postgresql://a:b@h2/x"))
      .toBe("fallo en postgres://***@host/db y postgresql://***@h2/x");
  });
});

describe("withTransaction()", () => {
  const statements = () => pg.client.query.mock.calls.map(([text]) => text as string);

  it("commits the unit of work on a dedicated connection and releases it", async () => {
    const result = await withTransaction(async (tx) => {
      await tx.query("INSERT INTO a VALUES ($1)", [1]);
      await tx.query("INSERT INTO b VALUES ($1)", [2]);
      return "ok";
    });

    expect(result).toBe("ok");
    expect(statements()).toEqual([
      "BEGIN", "INSERT INTO a VALUES ($1)", "INSERT INTO b VALUES ($1)", "COMMIT",
    ]);
    expect(pg.pool.query).not.toHaveBeenCalled();
    expect(pg.client.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back and rethrows when the work fails", async () => {
    const failure = new Error("límite alcanzado");

    await expect(
      withTransaction(async (tx) => {
        await tx.query("INSERT INTO a VALUES ($1)", [1]);
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(statements()).toEqual(["BEGIN", "INSERT INTO a VALUES ($1)", "ROLLBACK"]);
    expect(pg.client.release).toHaveBeenCalledTimes(1);
    // Expected domain errors are not reported as database failures.
    expect(console.error).not.toHaveBeenCalled();
  });

  it("still releases the connection when the rollback itself fails", async () => {
    pg.client.query.mockImplementation(async (text: string) => {
      if (text === "ROLLBACK") throw new Error("connection lost");
      if (text.startsWith("INSERT")) throw Object.assign(new Error("duplicate key"), { code: "23505" });
      return { rows: [] };
    });

    await expect(
      withTransaction((tx) => tx.query("INSERT INTO a VALUES (1)")),
    ).rejects.toMatchObject({ code: "23505" });
    expect(pg.client.release).toHaveBeenCalledTimes(1);
  });
});
