import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getVerifiedAdmin: vi.fn(),
  loadAdmin: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/actions/adminActions", () => ({ getVerifiedAdmin: mocks.getVerifiedAdmin }));
vi.mock("@/lib/supabase/admin", () => {
  mocks.loadAdmin();
  return { supabaseAdmin: { rpc: mocks.rpc } };
});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
  mocks.getVerifiedAdmin.mockResolvedValue(null);
  mocks.rpc.mockResolvedValue({ data: { success: true, purged_count: 0, purged_urls: [] }, error: null });
});

describe("Maintenance route privileged client boundary", () => {
  it("can be imported during build without loading privileged credentials", async () => {
    const { POST } = await import("@/app/api/admin/maintenance/route");
    expect(POST).toBeTypeOf("function");
    expect(mocks.loadAdmin).not.toHaveBeenCalled();
  });

  it("rejects unauthorized requests before importing the privileged client", async () => {
    const { POST } = await import("@/app/api/admin/maintenance/route");
    const response = await POST(new Request("http://localhost/api/admin/maintenance", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mocks.loadAdmin).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("loads the client and performs maintenance only after admin verification", async () => {
    mocks.getVerifiedAdmin.mockResolvedValue({ userEmail: "moderator@unsch.edu.pe" });
    const { POST } = await import("@/app/api/admin/maintenance/route");
    const response = await POST(new Request("http://localhost/api/admin/maintenance", { method: "POST" }));
    expect(response.status).toBe(200);
    expect(mocks.loadAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("purge_orphaned_or_old_media", { p_days_old: 90 });
  });
});
