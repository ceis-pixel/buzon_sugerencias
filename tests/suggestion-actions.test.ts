import { beforeEach, describe, expect, it, vi } from "vitest";

import { submitSuggestion } from "@/lib/actions/suggestionActions";
import {
  mapSuggestionError,
  submitSuggestionSchema,
  type SubmitSuggestionInput,
} from "@/lib/validations/suggestionSchema";
import type { Database, SubmittedTicketResult } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Suggestion Schema Validation (submitSuggestionSchema)", () => {
  it("accepts valid suggestion payloads with trimmed message and valid shifts", () => {
    const validInputs: SubmitSuggestionInput[] = [
      {
        shift: "breakfast",
        category: "menu",
        message: "   El desayuno de hoy estuvo bien servido.   ",
      },
      {
        shift: "lunch",
        category: "hygiene",
        message: "Las bandejas se encuentran en excelente estado de limpieza.",
        photoUrl: "https://storage.supabase.co/img1.webp",
      },
      {
        shift: "dinner",
        category: "portion",
        message: "La porción de la cena fue adecuada y caliente.",
        photo_url: "https://storage.supabase.co/img2.webp",
      },
      {
        shift: "lunch",
        category: "service",
        message: "La atención del personal en barra fue muy rápida y ordenada.",
        photoUrl: "",
      },
      {
        shift: "dinner",
        category: "infrastructure",
        message: "Las mesas del comedor requieren un ajuste en los asientos.",
        photoUrl: null,
      },
    ];

    for (const input of validInputs) {
      const parsed = submitSuggestionSchema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.message).toBe(input.message.trim());
      }
    }
  });

  it("rejects message shorter than 10 characters", () => {
    const result = submitSuggestionSchema.safeParse({
      shift: "lunch",
      category: "menu",
      message: "   corto  ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "El mensaje es demasiado corto (mínimo 10 caracteres).",
      );
    }
  });

  it("rejects message exceeding 500 characters", () => {
    const longMessage = "a".repeat(501);
    const result = submitSuggestionSchema.safeParse({
      shift: "lunch",
      category: "menu",
      message: longMessage,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "El mensaje excede el límite máximo de 500 caracteres.",
      );
    }
  });

  it("rejects invalid shift values", () => {
    const result = submitSuggestionSchema.safeParse({
      shift: "snack" as unknown as "lunch",
      category: "menu",
      message: "Mensaje válido con más de diez caracteres.",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "Debes seleccionar un turno válido",
      );
    }
  });

  it("rejects invalid category values", () => {
    const result = submitSuggestionSchema.safeParse({
      shift: "lunch",
      category: "sports" as unknown as "menu",
      message: "Mensaje válido con más de diez caracteres.",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "Debes seleccionar una categoría válida",
      );
    }
  });

  it("rejects invalid photo URLs", () => {
    const result = submitSuggestionSchema.safeParse({
      shift: "lunch",
      category: "menu",
      message: "Mensaje válido con más de diez caracteres.",
      photoUrl: "not-a-valid-url",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "La URL de la fotografía adjunta no es válida",
      );
    }
  });
});

describe("Error Mapping (mapSuggestionError)", () => {
  it("maps session expiration errors to clear Peruvian Spanish instructions", () => {
    expect(
      mapSuggestionError(
        new Error("Sesión no válida o expirada. Debes iniciar sesión institucional."),
      ),
    ).toBe(
      "Tu sesión no es válida o ha expirado. Por favor, inicia sesión con tu correo institucional @unsch.edu.pe.",
    );
  });

  it("maps domain access denial errors", () => {
    expect(
      mapSuggestionError(
        new Error("Acceso denegado: solo cuentas @unsch.edu.pe pueden enviar sugerencias."),
      ),
    ).toBe(
      "Acceso denegado: solo cuentas institucionales @unsch.edu.pe pueden enviar sugerencias.",
    );
  });

  it("maps message length errors", () => {
    expect(
      mapSuggestionError(new Error("El mensaje es demasiado corto (mínimo 10 caracteres).")),
    ).toBe("El mensaje es demasiado corto (mínimo 10 caracteres).");

    expect(
      mapSuggestionError(new Error("El mensaje excede el límite máximo de 500 caracteres.")),
    ).toBe("El mensaje excede el límite máximo de 500 caracteres.");
  });

  it("maps ticket code collision errors", () => {
    expect(
      mapSuggestionError(new Error("No se pudo generar un código de ticket disponible.")),
    ).toBe("No se pudo generar un código de ticket disponible. Por favor, inténtalo nuevamente.");
  });

  it("maps permission errors", () => {
    expect(
      mapSuggestionError(new Error("permission denied for function submit_anonymous_suggestion")),
    ).toBe("No tienes permisos suficientes para registrar sugerencias. Inicia sesión institucional.");
  });

  it("handles fallback and null errors safely", () => {
    expect(mapSuggestionError(null)).toBe(
      "Ocurrió un error inesperado al registrar tu sugerencia.",
    );
    expect(mapSuggestionError(new Error("Connection reset by peer"))).toBe(
      "Ocurrió un problema al enviar tu sugerencia. Por favor, intenta de nuevo en unos momentos.",
    );
  });
});

describe("Server Action: submitSuggestion", () => {
  const mockRpc = vi.fn();
  const mockClient = {
    rpc: mockRpc,
  } as unknown as SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error and fieldErrors without calling RPC when input is invalid", async () => {
    const result = await submitSuggestion(
      {
        shift: "lunch",
        category: "menu",
        message: "corto",
      },
      { supabase: mockClient },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.data).toBeNull();
      expect(result.error).toBe("El mensaje es demasiado corto (mínimo 10 caracteres).");
      expect(result.fieldErrors?.message).toBeDefined();
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("calls RPC with sanitized message and returns success with ticket data", async () => {
    const ticketMock: SubmittedTicketResult = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      ticket_code: "UNSCH-7X9K",
      shift: "lunch",
      category: "menu",
      status: "pending",
      created_at: "2026-09-22T19:00:00.000Z",
    };

    mockRpc.mockResolvedValue({ data: ticketMock, error: null });

    const result = await submitSuggestion(
      {
        shift: "lunch",
        category: "menu",
        message: "   Comida muy balanceada y nutritiva hoy.   ",
        photoUrl: "https://storage.supabase.co/img.webp",
      },
      { supabase: mockClient },
    );

    expect(mockRpc).toHaveBeenCalledWith("submit_anonymous_suggestion", {
      p_shift: "lunch",
      p_category: "menu",
      p_message: "Comida muy balanceada y nutritiva hoy.",
      p_photo_url: "https://storage.supabase.co/img.webp",
    });

    expect(result).toEqual({
      success: true,
      data: ticketMock,
      error: null,
    });
  });

  it("converts empty string photoUrl to null for database cleanliness", async () => {
    mockRpc.mockResolvedValue({ data: { id: "1" }, error: null });

    await submitSuggestion(
      {
        shift: "breakfast",
        category: "service",
        message: "Desayuno puntual a las 7:00 am.",
        photoUrl: "",
      },
      { supabase: mockClient },
    );

    expect(mockRpc).toHaveBeenCalledWith("submit_anonymous_suggestion", {
      p_shift: "breakfast",
      p_category: "service",
      p_message: "Desayuno puntual a las 7:00 am.",
      p_photo_url: null,
    });
  });

  it("handles RPC errors gracefully and returns localized error message", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Sesión no válida o expirada. Debes iniciar sesión institucional." },
    });

    const result = await submitSuggestion(
      {
        shift: "dinner",
        category: "infrastructure",
        message: "Revisar la iluminación de la salida del comedor.",
      },
      { supabase: mockClient },
    );

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBe(
      "Tu sesión no es válida o ha expirado. Por favor, inicia sesión con tu correo institucional @unsch.edu.pe.",
    );
  });
});
