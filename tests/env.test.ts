import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPublicEnv,
  getSupabasePublicEnv,
  SupabaseEnvironmentError,
  validateServiceRoleKey,
} from "@/lib/env";
import { assertNoPublicSecrets } from "../scripts/environment";

describe("Supabase environment validation", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN", "unsch.edu.pe");
  });

  it("does not require an administrative key for public clients", () => {
    expect(getSupabasePublicEnv()).toEqual({
      url: "http://127.0.0.1:54321",
      anonKey: "test-anon-key",
    });
  });

  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])(
    "rejects missing %s with an explanatory error",
    (name) => {
      vi.stubEnv(name, undefined);
      expect(getSupabasePublicEnv).toThrow(SupabaseEnvironmentError);
      expect(getSupabasePublicEnv).toThrow(`Falta configurar la variable de entorno ${name}`);
    },
  );

  it("rejects a whitespace-only key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "   ");
    expect(getSupabasePublicEnv).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("accepts only the publishable key and prefers it when both keys exist", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_public-test-marker");
    expect(getSupabasePublicEnv().anonKey).toBe("sb_publishable_public-test-marker");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
    expect(getPublicEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("sb_publishable_public-test-marker");
  });

  it("falls back to anon when the publishable slot is blank", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "   ");
    expect(getSupabasePublicEnv().anonKey).toBe("test-anon-key");
  });

  it("rejects privileged or malformed keys in either configured slot", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_secret_private-test-marker");
    expect(getSupabasePublicEnv).toThrow("no puede contener una clave privilegiada");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "short");
    expect(getSupabasePublicEnv).toThrow("al menos 12 caracteres");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_public-test-marker");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_secret_private-test-marker");
    expect(getSupabasePublicEnv).toThrow("no puede contener una clave privilegiada");
  });

  it.each(["invalid-url", "file:///private", "ftp://localhost"])(
    "rejects invalid URL %s without echoing its value",
    (url) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
      expect(getSupabasePublicEnv).toThrow(
        "NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida con protocolo HTTP o HTTPS.",
      );
    },
  );

  it("validates CI placeholders without a service key or network requests", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://your-project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "your-anon-key");
    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://your-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "your-anon-key",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN: "unsch.edu.pe",
    });
  });

  it.each(["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN"])(
    "requires %s for the complete build configuration",
    (name) => {
      vi.stubEnv(name, undefined);
      expect(getPublicEnv).toThrow(`Falta configurar la variable de entorno ${name}`);
    },
  );

  it.each(["invalid", "javascript:alert(1)", "https://user:password@example.com"])(
    "rejects invalid or credential-bearing application URL %s",
    (value) => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", value);
      expect(getPublicEnv).toThrow("NEXT_PUBLIC_APP_URL");
    },
  );

  it.each(["@unsch.edu.pe", "https://unsch.edu.pe", "unsch.edu.pe/path", "-unsch.edu.pe"])(
    "rejects invalid student domain %s",
    (value) => {
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN", value);
      expect(getPublicEnv).toThrow("NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN");
    },
  );

  it("normalizes the domain without leaking private configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN", " UNSCH.EDU.PE ");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "private-service-test-marker");
    expect(getPublicEnv().NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN).toBe("unsch.edu.pe");
    expect(JSON.stringify(getPublicEnv())).not.toContain("private-service-test-marker");
  });

  it("rejects short anon keys without revealing their value", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "short-value");
    expect(getPublicEnv).toThrow("al menos 12 caracteres");
    try {
      getPublicEnv();
    } catch (error) {
      expect(String(error)).not.toContain("short-value");
    }
  });

  it.each([
    "sb_secret_private-test-marker",
    `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`,
  ])("rejects privileged tokens in the anon key slot", (value) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", value);
    expect(getSupabasePublicEnv).toThrow("no puede contener una clave privilegiada");
  });

  it("allows public JWT and publishable key formats", () => {
    for (const value of [
      "sb_publishable_public-test-marker",
      `header.${Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")}.signature`,
    ]) {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", value);
      expect(getSupabasePublicEnv().anonKey).toBe(value);
    }
  });

  it.each([undefined, "", "short-key"])("requires a valid privileged key when requested", (value) => {
    expect(() => validateServiceRoleKey(value)).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("blocks service role aliases under the public prefix", () => {
    expect(() => assertNoPublicSecrets({ NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "" }))
      .toThrow("configuración pública expone una clave de servicio");
  });

  it("blocks a service key copied into another public variable without echoing it", () => {
    const secret = "private-service-test-marker";
    expect(() => assertNoPublicSecrets({
      SUPABASE_SERVICE_ROLE_KEY: secret,
      NEXT_PUBLIC_OTHER_VALUE: secret,
    })).toThrow("Elimina la variable NEXT_PUBLIC_");
  });

  it("allows a private service key with separate public values", () => {
    expect(() => assertNoPublicSecrets({
      SUPABASE_SERVICE_ROLE_KEY: "private-service-test-marker",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "your-anon-key",
    })).not.toThrow();
  });
});
