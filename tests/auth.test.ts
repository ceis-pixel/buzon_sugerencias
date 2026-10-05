import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: mocks.signIn,
  signOut: mocks.signOut,
}));

import {
  getAuthErrorMessage,
  signInWithInstitutionalGoogle,
  signOut,
  toSafeRedirectPath,
} from "@/lib/auth/authActions";

describe("Authentication Actions and Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signIn.mockResolvedValue(undefined);
    mocks.signOut.mockResolvedValue(undefined);
  });

  describe("signInWithInstitutionalGoogle", () => {
    it("starts the NextAuth Google flow and returns no error", async () => {
      await expect(signInWithInstitutionalGoogle("/")).resolves.toEqual({ error: null });
      expect(mocks.signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
    });

    it("carries the destination path as the post-login callbackUrl", async () => {
      await signInWithInstitutionalGoogle("/admin");
      expect(mocks.signIn).toHaveBeenCalledWith("google", { callbackUrl: "/admin" });
    });

    it.each(["https://evil.example/phish", "//evil.example", "javascript:alert(1)", ""])(
      "never forwards the external destination %j",
      async (destination) => {
        await signInWithInstitutionalGoogle(destination);
        expect(mocks.signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
        expect(toSafeRedirectPath(destination)).toBe("/");
      },
    );

    it("reports a friendly error when the provider cannot be reached", async () => {
      mocks.signIn.mockResolvedValue({ error: "OAuthSignin", ok: false, status: 500, url: null });
      const { error } = await signInWithInstitutionalGoogle("/");
      expect(error?.message).toContain("Google");
    });
  });

  describe("signOut", () => {
    it("ends the NextAuth session without a full page redirect", async () => {
      await signOut();
      expect(mocks.signOut).toHaveBeenCalledWith({ redirect: false });
    });

    it("propagates sign-out failures so the UI can surface them", async () => {
      mocks.signOut.mockRejectedValueOnce(new Error("Network disconnection"));
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

    it("maps the NextAuth error codes delivered to /login", () => {
      expect(getAuthErrorMessage("AccessDenied").code).toBe("domain_not_allowed");
      expect(getAuthErrorMessage("OAuthCallback").code).toBe("oauth_callback_error");
    });

    it("returns default fallback for unknown error codes", () => {
      const result = getAuthErrorMessage("some_unexpected_error");
      expect(result.code).toBe("unknown_error");
      expect(result.title).toBe("Error al iniciar sesión");
    });
  });
});
