import type { CookieMethodsServer } from "@supabase/ssr";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { GET } from "@/app/api/health/route";
import { createClient } from "@/lib/supabase/server";

function getCookieAdapter(): CookieMethodsServer {
  return mocks.createServerClient.mock.calls[0][2].cookies;
}

describe("request-scoped server client", () => {
  const cookieStore = { getAll: vi.fn(), set: vi.fn() };

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    cookieStore.getAll.mockReset().mockReturnValue([]);
    cookieStore.set.mockReset();
    mocks.cookies.mockResolvedValue(cookieStore);
    mocks.createServerClient.mockImplementation(() => ({ auth: {} }));
  });

  it("creates a separate client and reads cookies for each request", async () => {
    const first = await createClient();
    const second = await createClient();
    expect(first).not.toBe(second);
    expect(mocks.cookies).toHaveBeenCalledTimes(2);

    const requestCookies = [{ name: "sb-session.0", value: "first-chunk" }];
    cookieStore.getAll.mockReturnValue(requestCookies);
    expect(getCookieAdapter().getAll()).toEqual(requestCookies);
  });

  it("writes every cookie chunk and forwards cache prevention headers", async () => {
    const responseHeaders = new Headers();
    await createClient(responseHeaders);
    const options = { path: "/", sameSite: "lax" as const, secure: true };
    const chunks = [
      { name: "sb-session.0", value: "first-chunk", options },
      { name: "sb-session.1", value: "second-chunk", options },
      { name: "sb-session.2", value: "", options: { ...options, maxAge: 0 } },
    ];

    await getCookieAdapter().setAll?.(chunks, {
      "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
      Expires: "0",
      Pragma: "no-cache",
    });

    expect(cookieStore.set).toHaveBeenCalledTimes(3);
    chunks.forEach(({ name, value, options: cookieOptions }, index) => {
      expect(cookieStore.set).toHaveBeenNthCalledWith(index + 1, name, value, cookieOptions);
    });
    expect(responseHeaders.get("Cache-Control")).toContain("no-store");
    expect(responseHeaders.get("Expires")).toBe("0");
    expect(responseHeaders.get("Pragma")).toBe("no-cache");
  });

  it("tolerates the documented read-only cookie error in Server Components", async () => {
    await createClient();
    cookieStore.set.mockImplementation(() => {
      throw new Error(
        "Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options",
      );
    });

    expect(() => getCookieAdapter().setAll?.([
      { name: "sb-session", value: "session", options: {} },
    ], {})).not.toThrow();
  });

  it("propagates other write failures instead of silently losing sessions", async () => {
    await createClient();
    const error = new TypeError("Cookie serialization failed");
    cookieStore.set.mockImplementation(() => { throw error; });

    expect(() => getCookieAdapter().setAll?.([
      { name: "sb-session", value: "session", options: {} },
    ], {})).toThrow(error);
  });

  it("rejects missing configuration before accessing request cookies", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
    await expect(createClient()).rejects.toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("returns an uncached health response after client initialization", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(await response.json()).toEqual({
      status: "ok",
      message: "Cliente de Supabase inicializado correctamente.",
    });
  });

  it("reports configuration failure as 503 without exposing credentials", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    const response = await GET();
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(body).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(body).not.toContain("test-anon-key");
  });

  it("does not misreport an unexpected failure as a healthy client", async () => {
    const error = new Error("Unexpected failure");
    mocks.createServerClient.mockImplementationOnce(() => { throw error; });
    await expect(GET()).rejects.toThrow(error);
  });
});
