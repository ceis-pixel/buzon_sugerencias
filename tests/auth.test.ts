import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mocks.signInWithOAuth,
      signOut: mocks.signOut,
    },
  }),
}));

import {
  getAuthErrorMessage,
  signInWithInstitutionalGoogle,
  signOut,
} from "@/lib/auth/authActions";

describe("Authentication Actions and Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: "https://accounts.google.com/o/oauth2/v2/auth" }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  describe("signInWithInstitutionalGoogle", () => {
    it("configures Google provider with hosted domain unsch.edu.pe and select_account prompt", async () => {
      await signInWithInstitutionalGoogle("/");

      expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: expect.stringContaining("/auth/callback"),
          queryParams: {
            hd: "unsch.edu.pe",
            prompt: "select_account",
          },
        },
      });
    });

    it("attaches next destination query parameter to callback redirectTo URL", async () => {
      await signInWithInstitutionalGoogle("/buzon/nuevo");

      expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: expect.stringMatching(/\/auth\/callback\?next=%2Fbuzon%2Fnuevo/),
          queryParams: {
            hd: "unsch.edu.pe",
            prompt: "select_account",
          },
        },
      });
    });
  });

  describe("signOut", () => {
    it("invokes client auth signOut and resolves cleanly", async () => {
      await signOut();
      expect(mocks.signOut).toHaveBeenCalledTimes(1);
    });

    it("throws when Supabase signOut returns an error", async () => {
      mocks.signOut.mockResolvedValueOnce({
        error: new Error("Network disconnection"),
      });
      await expect(signOut()).rejects.toThrow("Network disconnection");
    });
  });

  describe("getAuthErrorMessage", () => {
    it("returns specific Peruvian Spanish guidance for unauthorized domain error", () => {
      const result = getAuthErrorMessage("domain_not_allowed");
      expect(result.code).toBe("domain_not_allowed");
      expect(result.title).toContain("institucional");
      expect(result.message).toContain("@unsch.edu.pe");
    });

    it("returns user-friendly error for oauth callback failure", () => {
      const result = getAuthErrorMessage("oauth_callback_error");
      expect(result.code).toBe("oauth_callback_error");
      expect(result.message).toContain("Google");
    });

    it("returns user-friendly error for missing authorization session code", () => {
      const result = getAuthErrorMessage("session_missing");
      expect(result.code).toBe("session_missing");
    });

    it("returns default fallback for unknown error codes", () => {
      const result = getAuthErrorMessage("some_unexpected_error");
      expect(result.code).toBe("unknown_error");
      expect(result.title).toBe("Error al iniciar sesión");
    });
  });
});
