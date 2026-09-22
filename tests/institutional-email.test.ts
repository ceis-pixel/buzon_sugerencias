import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InstitutionalFeedbackBox } from "@/components/auth/InstitutionalFeedbackBox";
import { InstitutionalEmailInput } from "@/components/auth/InstitutionalEmailInput";
import { useInstitutionalEmail } from "@/lib/hooks/useInstitutionalEmail";

function HookTester({ email }: { email: string }) {
  const result = useInstitutionalEmail(email);
  return createElement("div", {
    "data-valid": result.isValidDomain ? "true" : "false",
    "data-error": result.isDomainError ? "true" : "false",
    "data-message": result.errorMessage ?? "",
  });
}

describe("Institutional Email Exclusivity Filter (Section 4.1)", () => {
  describe("useInstitutionalEmail logic", () => {
    it("identifies valid institutional emails ending strictly with @unsch.edu.pe", () => {
      const html = renderToStaticMarkup(createElement(HookTester, { email: "28190012@unsch.edu.pe" }));
      expect(html).toContain('data-valid="true"');
      expect(html).toContain('data-error="false"');
    });

    it("triggers domain error for unauthorized public domains (@gmail.com)", () => {
      const html = renderToStaticMarkup(createElement(HookTester, { email: "estudiante@gmail.com" }));
      expect(html).toContain('data-valid="false"');
      expect(html).toContain('data-error="true"');
      expect(html).toContain("Debes usar tu correo universitario");
    });

    it("triggers domain error for lookalike non-institutional domains (@unsch.com)", () => {
      const html = renderToStaticMarkup(createElement(HookTester, { email: "usuario@unsch.com" }));
      expect(html).toContain('data-valid="false"');
      expect(html).toContain('data-error="true"');
    });

    it("normalizes uppercase and surrounding whitespace", () => {
      const html = renderToStaticMarkup(createElement(HookTester, { email: "  ALUMNO@UNSCH.EDU.PE  " }));
      expect(html).toContain('data-valid="true"');
      expect(html).toContain('data-error="false"');
    });
  });

  describe("InstitutionalFeedbackBox", () => {
    it("renders pedagogical explanation, title and guide link according to Section 4.1", () => {
      const html = renderToStaticMarkup(createElement(InstitutionalFeedbackBox));

      expect(html).toContain("Usa tu correo institucional @unsch.edu.pe");
      expect(html).toContain(
        "Para garantizar que las sugerencias provengan de comensales reales del comedor",
      );
      expect(html).toContain("Tu reporte seguirá siendo 100% anónimo para los administradores.");
      expect(html).toContain("Ver guía de activación de cuenta institucional");
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-live="polite"');
    });

    it("accepts custom guideUrl and className", () => {
      const html = renderToStaticMarkup(
        createElement(InstitutionalFeedbackBox, {
          guideUrl: "https://ayuda.unsch.edu.pe",
          className: "custom-class",
        }),
      );

      expect(html).toContain('href="https://ayuda.unsch.edu.pe"');
      expect(html).toContain("custom-class");
    });
  });

  describe("InstitutionalEmailInput", () => {
    it("renders email input with label and helper text", () => {
      const html = renderToStaticMarkup(
        createElement(InstitutionalEmailInput, {
          id: "email-input",
          label: "Correo institucional",
        }),
      );

      expect(html).toContain("Correo institucional");
      expect(html).toContain('id="email-input"');
      expect(html).toContain('type="email"');
    });
  });
});
