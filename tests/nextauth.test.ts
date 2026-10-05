import type { Account, Profile, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findActiveAdmin: vi.fn(),
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/services/adminService", () => ({ findActiveAdmin: mocks.findActiveAdmin }));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));

import {
  authCallbacks,
  DOMAIN_REJECTED_URL,
  getAuthOptions,
  isInstitutionalEmail,
} from "@/lib/auth/authOptions";
import { generateRateHash, getLimaDate } from "@/lib/auth/rateHash";
import { getInstitutionalSession, getVerifiedAdmin, resolveSession } from "@/lib/auth/session";
import { getUploadSession } from "@/lib/auth/uploadSession";

const SECRET = "nextauth-test-secret-0123456789abcdefghij";
const googleAccount = { provider: "google", type: "oauth", providerAccountId: "1" } as Account;

function signIn(profile: Record<string, unknown>, account: Account | null = googleAccount) {
  return authCallbacks.signIn({
    user: { id: "1", email: profile.email as string } as User,
    account,
    profile: profile as Profile,
  });
}

function runJwt(token: JWT, user?: Partial<User>) {
  return authCallbacks.jwt({ token, user: user as User, account: null });
}

beforeEach(() => {
  vi.stubEnv("ALLOWED_EMAIL_DOMAIN", "unsch.edu.pe");
  vi.stubEnv("NEXTAUTH_SECRET", SECRET);
  vi.stubEnv("GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
  vi.stubEnv("RATE_LIMIT_HMAC_SECRET", "rate-limit-test-secret-0123456789abcdefgh");
  mocks.findActiveAdmin.mockResolvedValue(null);
  mocks.getServerSession.mockResolvedValue(null);
});

describe("signIn callback — strict institutional domain filter", () => {
  it("accepts a verified Google Workspace account of the institution", async () => {
    await expect(
      signIn({ email: "27215508@unsch.edu.pe", email_verified: true, hd: "unsch.edu.pe" }),
    ).resolves.toBe(true);
  });

  it("rejects a @gmail.com account and redirects to the didactic error screen", async () => {
    const result = await signIn({ email: "alumno@gmail.com", email_verified: true });
    expect(result).toBe(DOMAIN_REJECTED_URL);
    expect(result).toBe("/login?error=domain_not_allowed");
  });

  it.each([
    ["look-alike suffix", { email: "a@unsch.edu.pe.evil.com", email_verified: true, hd: "unsch.edu.pe" }],
    ["subdomain", { email: "a@mail.unsch.edu.pe", email_verified: true, hd: "unsch.edu.pe" }],
    ["domain embedded in the local part", { email: "unsch.edu.pe@gmail.com", email_verified: true }],
    ["unverified e-mail", { email: "a@unsch.edu.pe", email_verified: false, hd: "unsch.edu.pe" }],
    ["personal Google account using an institutional address", { email: "a@unsch.edu.pe", email_verified: true }],
    ["another Workspace tenant", { email: "a@unsch.edu.pe", email_verified: true, hd: "otra.edu.pe" }],
  ])("rejects %s", async (_label, profile) => {
    await expect(signIn(profile)).resolves.toBe(DOMAIN_REJECTED_URL);
  });

  it("rejects any provider other than Google", async () => {
    await expect(
      signIn(
        { email: "a@unsch.edu.pe", email_verified: true, hd: "unsch.edu.pe" },
        { provider: "credentials", type: "credentials", providerAccountId: "1" } as Account,
      ),
    ).resolves.toBe(DOMAIN_REJECTED_URL);
  });

  it("matches the domain exactly and case-insensitively", () => {
    expect(isInstitutionalEmail("Alumno@UNSCH.EDU.PE")).toBe(true);
    expect(isInstitutionalEmail("alumno@gmail.com")).toBe(false);
    expect(isInstitutionalEmail("@unsch.edu.pe")).toBe(false);
    expect(isInstitutionalEmail(null)).toBe(false);
  });
});

describe("jwt and session callbacks — minimal session with isAdmin", () => {
  it("keeps only the e-mail and injects isAdmin from the admins table", async () => {
    mocks.findActiveAdmin.mockResolvedValue({ email: "salud.fusch@unsch.edu.pe" });

    const token = await runJwt(
      { name: "Nombre Real", picture: "https://lh3.googleusercontent.com/a/photo", sub: "1" },
      { email: "Salud.FUSCH@unsch.edu.pe" },
    );

    expect(mocks.findActiveAdmin).toHaveBeenCalledWith("salud.fusch@unsch.edu.pe");
    expect(token).toMatchObject({ email: "salud.fusch@unsch.edu.pe", isAdmin: true });
    expect(token).not.toHaveProperty("name");
    expect(token).not.toHaveProperty("picture");

    const session = await authCallbacks.session({
      session: { user: { name: "x", image: "y" }, expires: "2099-01-01" } as unknown as Session,
      token,
    } as Parameters<typeof authCallbacks.session>[0]);
    expect(session.user).toEqual({ email: "salud.fusch@unsch.edu.pe", isAdmin: true });
  });

  it("marks regular students as non-admin and caches the lookup for a few minutes", async () => {
    const token = await runJwt({}, { email: "alumno@unsch.edu.pe" });
    expect(token.isAdmin).toBe(false);

    await runJwt(token);
    expect(mocks.findActiveAdmin).toHaveBeenCalledTimes(1);

    // A moderator removed from the whitelist loses the flag once the cache expires.
    await runJwt({ ...token, isAdmin: true, adminCheckedAt: Date.now() - 6 * 60 * 1000 });
    expect(mocks.findActiveAdmin).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the admins table cannot be read", async () => {
    mocks.findActiveAdmin.mockRejectedValue(new Error("connection refused"));
    await expect(runJwt({}, { email: "salud.fusch@unsch.edu.pe" })).resolves.toMatchObject({
      isAdmin: false,
    });
  });
});

describe("getAuthOptions — runtime configuration", () => {
  it("configures Google with the hosted domain hint and a minimal scope", () => {
    const options = getAuthOptions();
    const google = options.providers[0] as unknown as {
      id: string;
      options: { clientId: string; authorization: { params: Record<string, string> } };
    };

    expect(options.secret).toBe(SECRET);
    expect(options.session).toMatchObject({ strategy: "jwt" });
    expect(options.adapter).toBeUndefined(); // no users table: nothing personal is stored
    expect(options.pages).toEqual({ signIn: "/login", error: "/login" });
    expect(google.id).toBe("google");
    expect(google.options.authorization.params).toEqual({
      scope: "openid email",
      hd: "unsch.edu.pe",
      prompt: "select_account",
    });
  });

  it.each([
    ["NEXTAUTH_SECRET", undefined],
    ["NEXTAUTH_SECRET", "short"],
    ["NEXTAUTH_SECRET", "genera_un_hash_aleatorio_32_bytes"],
    ["GOOGLE_CLIENT_ID", undefined],
    ["GOOGLE_CLIENT_SECRET", "  "],
  ])("refuses to start with an invalid %s (%j)", (name, value) => {
    vi.stubEnv(name, value);
    expect(getAuthOptions).toThrow(name.startsWith("GOOGLE") ? "GOOGLE_CLIENT" : name);
  });

  it("never echoes the secret in configuration errors", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "weak-secret");
    try {
      getAuthOptions();
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain("weak-secret");
    }
  });
});

describe("server session helpers", () => {
  it("returns the institutional session for a valid cookie", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { email: "Alumno@unsch.edu.pe", isAdmin: false },
    });
    await expect(getInstitutionalSession()).resolves.toEqual({
      email: "alumno@unsch.edu.pe",
      isAdmin: false,
    });
  });

  it("distinguishes visitors, foreign domains and missing configuration", async () => {
    await expect(resolveSession()).resolves.toEqual({ ok: false, reason: "unauthenticated" });

    mocks.getServerSession.mockResolvedValue({ user: { email: "a@gmail.com", isAdmin: true } });
    await expect(resolveSession()).resolves.toEqual({ ok: false, reason: "forbidden_domain" });

    vi.stubEnv("NEXTAUTH_SECRET", undefined);
    await expect(resolveSession()).resolves.toEqual({ ok: false, reason: "auth_unavailable" });
  });

  it("authorizes moderators from the database, not from the cookie flag", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { email: "exmoderador@unsch.edu.pe", isAdmin: true },
    });
    await expect(getVerifiedAdmin()).resolves.toBeNull();
    await expect(getUploadSession({ requireAdminLookup: true })).resolves.toEqual({
      ok: true,
      email: "exmoderador@unsch.edu.pe",
      isAdmin: false,
    });

    const adminRecord = { email: "exmoderador@unsch.edu.pe", is_active: true };
    mocks.findActiveAdmin.mockResolvedValue(adminRecord);
    await expect(getVerifiedAdmin()).resolves.toEqual({
      userEmail: "exmoderador@unsch.edu.pe",
      adminRecord,
    });
  });

  it("lets any institutional student upload without querying the whitelist", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { email: "a@unsch.edu.pe", isAdmin: false } });
    await expect(getUploadSession()).resolves.toEqual({
      ok: true,
      email: "a@unsch.edu.pe",
      isAdmin: false,
    });
    expect(mocks.findActiveAdmin).not.toHaveBeenCalled();

    mocks.getServerSession.mockResolvedValue(null);
    await expect(getUploadSession()).resolves.toEqual({ ok: false, reason: "unauthenticated" });
  });
});

describe("generateRateHash — ephemeral keyed digest", () => {
  const hash = (email: string, shift: "breakfast" | "lunch" | "dinner", date: string, secret?: string) =>
    generateRateHash(email, shift, date, secret);

  it("is deterministic and normalizes the e-mail", () => {
    const value = hash("alumno@unsch.edu.pe", "lunch", "2026-10-05");
    expect(value).toMatch(/^[0-9a-f]{64}$/);
    expect(hash("  Alumno@UNSCH.edu.pe ", "lunch", "2026-10-05")).toBe(value);
  });

  it("changes with the shift, the date, the student and the server secret", () => {
    const base = hash("alumno@unsch.edu.pe", "lunch", "2026-10-05");
    expect(hash("alumno@unsch.edu.pe", "dinner", "2026-10-05")).not.toBe(base);
    expect(hash("alumno@unsch.edu.pe", "lunch", "2026-10-06")).not.toBe(base);
    expect(hash("alumna@unsch.edu.pe", "lunch", "2026-10-05")).not.toBe(base);
    expect(hash("alumno@unsch.edu.pe", "lunch", "2026-10-05", "another-secret-0123456789abcdefghijklmn"))
      .not.toBe(base);
  });

  it("requires a strong RATE_LIMIT_HMAC_SECRET", () => {
    vi.stubEnv("RATE_LIMIT_HMAC_SECRET", "genera_otro_hash_seguro_para_disociacion");
    expect(() => generateRateHash("a@unsch.edu.pe", "lunch", "2026-10-05"))
      .toThrow("RATE_LIMIT_HMAC_SECRET");
  });

  it("uses the dining hall calendar day (America/Lima), not UTC", () => {
    expect(getLimaDate(new Date("2026-10-06T03:30:00Z"))).toBe("2026-10-05"); // 22:30 in Lima
    expect(getLimaDate(new Date("2026-10-06T05:00:00Z"))).toBe("2026-10-06");
  });
});
