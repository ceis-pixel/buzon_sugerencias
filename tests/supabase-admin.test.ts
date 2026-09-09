import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

describe("privileged server client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    mocks.createClient.mockReturnValue({ auth: {} });
  });

  it("uses its own key with all user-session persistence disabled", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    expect(supabaseAdmin).toBeDefined();
    expect(mocks.createClient).toHaveBeenCalledWith(
      "http://127.0.0.1:54321",
      "test-service-role-key",
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
  });

  it("rejects import when the privileged key is missing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    await expect(import("@/lib/supabase/admin")).rejects.toThrow("SUPABASE_SERVICE_ROLE_KEY");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects browser execution before reading configuration or creating a client", async () => {
    vi.stubGlobal("window", {});
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    await expect(import("@/lib/supabase/admin")).rejects.toThrow(
      "El cliente administrativo de Supabase solo puede ejecutarse en el servidor.",
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
