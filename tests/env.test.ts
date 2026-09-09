import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabasePublicEnv, SupabaseEnvironmentError } from "@/lib/env";

describe("Supabase environment validation", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
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

  it.each(["invalid-url", "file:///private", "ftp://localhost"])(
    "rejects invalid URL %s without echoing its value",
    (url) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
      expect(getSupabasePublicEnv).toThrow(
        "NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida con protocolo HTTP o HTTPS.",
      );
    },
  );
});
