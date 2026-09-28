import { describe, expect, it } from "vitest";

import {
  formatPeruvianDateTime,
  getPeruvianDateStamp,
  mapSuggestionsToReportRows,
  type SuggestionWithResponse,
} from "@/lib/utils/exportReport";
import { officialResponseSchema } from "@/lib/validations/responseSchema";

describe("Sprint 8 — Admin Security & Validation (Issue 8.5)", () => {
  it("validates official response length between 15 and 600 characters", () => {
    const validData = {
      suggestionId: "d3b07384-d113-40e9-a720-7f215d2f6233",
      responseText: "Se procedió con la inspección técnica del concesionario y se corrigió la porción.",
    };
    const result = officialResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responseText).toBe(validData.responseText);
    }
  });

  it("rejects responses shorter than 15 characters", () => {
    const shortData = {
      suggestionId: "d3b07384-d113-40e9-a720-7f215d2f6233",
      responseText: "Muy corto.",
    };
    const result = officialResponseSchema.safeParse(shortData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("al menos 15 caracteres");
    }
  });

  it("rejects responses with 15 characters of pure whitespace", () => {
    const whitespaceData = {
      suggestionId: "d3b07384-d113-40e9-a720-7f215d2f6233",
      responseText: "               ",
    };
    const result = officialResponseSchema.safeParse(whitespaceData);
    expect(result.success).toBe(false);
  });

  it("rejects responses exceeding 600 characters", () => {
    const longData = {
      suggestionId: "d3b07384-d113-40e9-a720-7f215d2f6233",
      responseText: "a".repeat(601),
    };
    const result = officialResponseSchema.safeParse(longData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("no debe superar los 600 caracteres");
    }
  });

  it("requires a valid UUID for suggestionId", () => {
    const invalidId = {
      suggestionId: "not-a-uuid",
      responseText: "Respuesta válida de más de quince caracteres.",
    };
    const result = officialResponseSchema.safeParse(invalidId);
    expect(result.success).toBe(false);
  });
});

describe("Sprint 8 — Report Export & Date Utilities (Issue 8.6)", () => {
  it("formats Peruvian timestamps correctly without throwing", () => {
    const isoString = "2026-09-28T14:30:00.000Z";
    const formatted = formatPeruvianDateTime(isoString);
    expect(formatted).toBeDefined();
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("generates a date stamp in YYYY-MM-DD format", () => {
    const stamp = getPeruvianDateStamp();
    expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("maps suggestions into formal Excel report rows according to Issue 8.6 spec", () => {
    const mockSuggestions: SuggestionWithResponse[] = [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        ticket_code: "UNSCH-7K4M",
        shift: "lunch",
        category: "menu",
        message: "El guiso del almuerzo tenía exceso de sal.",
        photo_url: "https://storage.supabase.co/img.webp",
        status: "resolved",
        created_at: "2026-09-28T12:00:00Z",
        updated_at: "2026-09-28T14:00:00Z",
        latest_response: {
          id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          suggestion_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          responder_email: "salud.fusch@unsch.edu.pe",
          response_text: "Se notificó al jefe de cocina y se calibró la receta del menú.",
          is_internal: false,
          created_at: "2026-09-28T14:00:00Z",
          updated_at: "2026-09-28T14:00:00Z",
        },
      },
      {
        id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        ticket_code: "UNSCH-2345",
        shift: "dinner",
        category: "portion",
        message: "La porción de arroz servida en la cena fue insuficiente.",
        photo_url: null,
        status: "pending",
        created_at: "2026-09-28T18:00:00Z",
        updated_at: "2026-09-28T18:00:00Z",
      },
    ];

    const rows = mapSuggestionsToReportRows(mockSuggestions);
    expect(rows).toHaveLength(2);

    // Row 1 (Resolved with photo and official response)
    const row1 = rows[0];
    expect(row1["Código Ticket"]).toBe("UNSCH-7K4M");
    expect(row1["Turno"]).toBe("Almuerzo");
    expect(row1["Categoría"]).toBe("Menú / Sabor");
    expect(row1["Observación del Estudiante"]).toBe("El guiso del almuerzo tenía exceso de sal.");
    expect(row1["Tiene Evidencia Fotográfica (Sí/No)"]).toBe("Sí");
    expect(row1["URL Foto"]).toBe("https://storage.supabase.co/img.webp");
    expect(row1["Estado"]).toBe("Atendido");
    expect(row1["Respuesta Oficial"]).toBe("Se notificó al jefe de cocina y se calibró la receta del menú.");

    // Row 2 (Pending without photo or response)
    const row2 = rows[1];
    expect(row2["Código Ticket"]).toBe("UNSCH-2345");
    expect(row2["Turno"]).toBe("Cena");
    expect(row2["Categoría"]).toBe("Cantidad / Porción");
    expect(row2["Tiene Evidencia Fotográfica (Sí/No)"]).toBe("No");
    expect(row2["URL Foto"]).toBe("Sin evidencia");
    expect(row2["Estado"]).toBe("Pendiente");
    expect(row2["Respuesta Oficial"]).toBe("Sin respuesta oficial aún");
  });

  it("handles null, undefined or invalid dates gracefully in formatPeruvianDateTime", () => {
    expect(formatPeruvianDateTime(null)).toBe("");
    expect(formatPeruvianDateTime(undefined)).toBe("");
    expect(formatPeruvianDateTime("invalid-date")).toBe("");
  });
});

