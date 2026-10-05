import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getPool: vi.fn(), query: vi.fn() }));

vi.mock("@/lib/db", () => ({
  getPool: mocks.getPool,
  sanitizeDbMessage: (message: string) =>
    message.replace(/(postgres(?:ql)?:\/\/)[^@\s/]*@/gi, "$1***@"),
}));

import { GET } from "@/app/api/health/route";

let uploadDir: string;

beforeEach(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), "buzon-health-"));
  vi.stubEnv("UPLOAD_DIR", uploadDir);
  vi.stubEnv("NEXTAUTH_SECRET", "health-test-nextauth-secret-0123456789abcd");
  vi.stubEnv("GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
  vi.stubEnv("RATE_LIMIT_HMAC_SECRET", "health-test-rate-secret-0123456789abcdefg");
  mocks.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
  mocks.getPool.mockReturnValue({ query: mocks.query });
});

afterEach(async () => {
  await rm(uploadDir, { recursive: true, force: true });
});

describe("GET /api/health", () => {
  it("is healthy when PostgreSQL answers and the uploads volume is writable", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.query).toHaveBeenCalledWith("SELECT 1");
    expect(await response.json()).toMatchObject({
      status: "ok",
      checks: { database: "ok", storage: "ok", auth: "ok" },
    });
  });

  it("stays alive but flags incomplete auth configuration without echoing secrets", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "weak-secret");
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(body).checks.auth).toBe("not_configured");
    expect(body).not.toContain("weak-secret");
    expect(body).not.toContain("supabase");
  });

  it("reports 503 when the database is unreachable, without leaking details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.query.mockRejectedValue(new Error("connect ECONNREFUSED postgresql://user:secret@db:5432"));

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body).checks.database).toBe("error");
    expect(body).not.toContain("secret");
  });

  it("reports 503 when DATABASE_URL is not configured", async () => {
    mocks.getPool.mockReturnValue(null);
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).checks.database).toBe("not_configured");
  });

  it("reports 503 when the uploads directory is missing", async () => {
    vi.stubEnv("UPLOAD_DIR", path.join(uploadDir, "missing"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).checks.storage).toBe("error");
  });
});
