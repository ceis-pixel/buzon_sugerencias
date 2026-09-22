import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PrivacyNotice } from "@/components/auth/PrivacyNotice";
import { LoginCard } from "@/components/auth/LoginCard";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  }),
}));

describe("Login and Authentication UI Components", () => {
  describe("PrivacyNotice", () => {
    it("renders identity protection title and didactic anonymity guarantee", () => {
      const html = renderToStaticMarkup(createElement(PrivacyNotice));

      expect(html).toContain("Tu identidad está protegida");
      expect(html).toContain(
        "Iniciar sesión con tu correo @unsch.edu.pe únicamente certifica que eres un estudiante de la universidad.",
      );
      expect(html).toContain("jamás se almacenarán junto a tus reportes o comentarios.");
      expect(html).toContain("role=\"region\"");
      expect(html).toContain("aria-label=\"Aviso de privacidad y protección de identidad\"");
      expect(html).toContain("<svg");
      expect(html).toContain("aria-hidden=\"true\"");
    });

    it("accepts custom className and forwardable attributes", () => {
      const html = renderToStaticMarkup(
        createElement(PrivacyNotice, { className: "my-custom-notice", id: "privacy-box" }),
      );

      expect(html).toContain("my-custom-notice");
      expect(html).toContain("id=\"privacy-box\"");
    });
  });

  describe("LoginCard", () => {
    it("renders institutional badge, main title and Google institutional button", () => {
      const html = renderToStaticMarkup(createElement(LoginCard));

      expect(html).toContain("Comedor Universitario · FUSCH");
      expect(html).toContain("Acceso al Buzón");
      expect(html).toContain("Comedor Universitario UNSCH — FUSCH");
      expect(html).toContain("Continuar con correo institucional (@unsch.edu.pe)");
      expect(html).toContain("Tu identidad está protegida");
    });
  });
});
