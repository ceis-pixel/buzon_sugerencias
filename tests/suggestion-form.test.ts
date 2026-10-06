import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SuggestionForm } from "@/components/suggestion/SuggestionForm";
import {
  SuggestionMessageField,
  type SuggestionMessageFieldProps,
} from "@/components/suggestion/SuggestionMessageField";
import {
  categoryEnum,
  shiftEnum,
  suggestionFormSchema,
} from "@/lib/validations/suggestionSchema";

function renderMessageField(props: SuggestionMessageFieldProps = {}) {
  return renderToStaticMarkup(createElement(SuggestionMessageField, props));
}

function renderSuggestionForm() {
  return renderToStaticMarkup(createElement(SuggestionForm, {}));
}

describe("Zod suggestionFormSchema validation (Issues 6.3 & 6.4)", () => {
  it("accepts valid submission data with minimum 10 useful characters", () => {
    const valid = {
      shift: "lunch",
      category: "hygiene",
      message: "Las mesas del segundo piso no fueron desinfectadas a tiempo.",
      mediaFile: null,
    };
    const result = suggestionFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("trims whitespace and rejects messages with fewer than 10 useful characters", () => {
    const shortMessages = ["", "   ", "bien", "muy rico", "        12345        "];
    for (const msg of shortMessages) {
      const result = suggestionFormSchema.safeParse({
        shift: "breakfast",
        category: "menu",
        message: msg,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messageIssue = result.error.issues.find((i) => i.path.includes("message"));
        expect(messageIssue).toBeDefined();
      }
    }
  });

  it("rejects messages exceeding 500 characters", () => {
    const longMessage = "A".repeat(501);
    const result = suggestionFormSchema.safeParse({
      shift: "dinner",
      category: "portion",
      message: longMessage,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messageIssue = result.error.issues.find((i) => i.path.includes("message"));
      expect(messageIssue?.message).toContain("500 caracteres");
    }
  });

  it("validates shift and category against strict Enums", () => {
    expect(shiftEnum.safeParse("breakfast").success).toBe(true);
    expect(shiftEnum.safeParse("snack").success).toBe(false);

    expect(categoryEnum.safeParse("menu").success).toBe(true);
    expect(categoryEnum.safeParse("unknown").success).toBe(false);
  });
});

describe("SuggestionMessageField component (Issue 6.3)", () => {
  it("renders with didactic label, placeholder, and initial 0/500 character counter", () => {
    const html = renderMessageField({ value: "" });

    expect(html).toContain("Detalle de tu observación");
    expect(html).toContain("Sé claro y específico sobre lo ocurrido");
    expect(html).toContain("Describe el inconveniente o sugerencia");
    expect(html).toContain("0/500 caracteres");
    expect(html.toLowerCase()).toContain('maxlength="500"');
  });

  it("transitions counter color to neutral for normal text length", () => {
    const html = renderMessageField({ value: "Texto corto" });
    expect(html).toContain("11/500 caracteres");
    expect(html).toContain("text-neutral-gray");
  });

  it("transitions counter color to amber warning zone between 450 and 499 characters", () => {
    const warningText = "x".repeat(460);
    const html = renderMessageField({ value: warningText });
    expect(html).toContain("460/500 caracteres");
    expect(html).toContain("text-amber-700");
  });

  it("transitions counter color to primary crimson font-bold when limit of 500 is reached", () => {
    const maxText = "x".repeat(500);
    const html = renderMessageField({ value: maxText });
    expect(html).toContain("500/500 caracteres");
    expect(html).toContain("text-primary font-bold");
  });

  it("displays crimson border and accessible alert container when errorMessage is passed", () => {
    const errorMessage = "Tu mensaje debe tener al menos 10 caracteres.";
    const html = renderMessageField({ errorMessage, value: "corto" });

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
    expect(html).toContain(errorMessage);
    expect(html).toContain("border-primary");
    expect(html).toContain("text-primary");
  });
});

describe("SuggestionForm full integration (Issue 6.4)", () => {
  it("renders the master card with anonymity banner and all 4 form sections", () => {
    const html = renderSuggestionForm();

    // Anonymity header
    expect(html).toContain("100% Anónimo • Ley N.º 29733");
    expect(html).toContain("Envía tu sugerencia o reclamo");
    expect(html).toContain("Tu identidad se mantiene 100% en reserva");

    // Sections
    expect(html).toContain("Turno de atención");
    expect(html).toContain("Categoría de la observación");
    expect(html).toContain("Detalle de tu observación");
    expect(html).toContain("Evidencia fotográfica (opcional)");

    // Submit button
    expect(html).toContain("Enviar Sugerencia Anónima");
    expect(html).toContain('type="submit"');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*class="[^"]*w-full/);
  });

  it("carries no development or sprint wording", () => {
    const html = renderSuggestionForm();

    expect(html).not.toMatch(/Sprint|Issue \d|Demostración|Simular/);
  });
});
