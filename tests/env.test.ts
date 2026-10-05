import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPublicEnv, PublicEnvironmentError } from "@/lib/env";
import { assertNoPublicSecrets } from "../scripts/environment";

describe("Public environment validation", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN", "unsch.edu.pe");
  });

  it("validates the build configuration without any secret or cloud credential", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("NEXTAUTH_SECRET", undefined);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", undefined);

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN: "unsch.edu.pe",
    });
  });

  it.each(["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN"])(
    "requires %s for the complete build configuration",
    (name) => {
      vi.stubEnv(name, undefined);
      expect(getPublicEnv).toThrow(PublicEnvironmentError);
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
    vi.stubEnv("NEXTAUTH_SECRET", "private-session-test-marker");
    vi.stubEnv("DATABASE_URL", "postgresql://user:private-db-test-marker@db:5432/buzon");

    expect(getPublicEnv().NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN).toBe("unsch.edu.pe");
    expect(JSON.stringify(getPublicEnv())).not.toContain("private-session-test-marker");
    expect(JSON.stringify(getPublicEnv())).not.toContain("private-db-test-marker");
  });
});

describe("Public bundle secret guard", () => {
  it.each([
    "NEXT_PUBLIC_NEXTAUTH_SECRET",
    "NEXT_PUBLIC_GOOGLE_CLIENT_SECRET",
    "NEXT_PUBLIC_DATABASE_URL",
    "NEXT_PUBLIC_POSTGRES_PASSWORD",
    "NEXT_PUBLIC_RATE_LIMIT_HMAC_SECRET",
  ])("blocks %s under the public prefix", (name) => {
    expect(() => assertNoPublicSecrets({ [name]: "" }))
      .toThrow("configuración pública expone un secreto del servidor");
  });

  it.each(["NEXTAUTH_SECRET", "DATABASE_URL", "RATE_LIMIT_HMAC_SECRET", "GOOGLE_CLIENT_SECRET"])(
    "blocks the value of %s copied into another public variable without echoing it",
    (name) => {
      const secret = "private-server-test-marker";
      try {
        assertNoPublicSecrets({ [name]: secret, NEXT_PUBLIC_OTHER_VALUE: secret });
        expect.unreachable();
      } catch (error) {
        expect(String(error)).toContain("Elimina la variable NEXT_PUBLIC_");
        expect(String(error)).not.toContain(secret);
      }
    },
  );

  it("allows server secrets alongside unrelated public values", () => {
    expect(() => assertNoPublicSecrets({
      NEXTAUTH_SECRET: "private-server-test-marker",
      DATABASE_URL: "postgresql://user:clave@db:5432/buzon",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN: "unsch.edu.pe",
      NEXT_PUBLIC_EMPTY: "",
    })).not.toThrow();
  });
});
