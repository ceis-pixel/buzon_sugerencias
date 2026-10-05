import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  createAnonymousSuggestion: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/lib/db", () => ({ query: vi.fn(), withTransaction: vi.fn() }));
vi.mock("@/lib/services/suggestionService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/services/suggestionService")>()),
  createAnonymousSuggestion: mocks.createAnonymousSuggestion,
}));

import { submitSuggestion } from "@/lib/actions/suggestionActions";
import {
  mapSuggestionError,
  submitSuggestionSchema,
  type SubmitSuggestionInput,
} from "@/lib/validations/suggestionSchema";
import { RateLimitExceededError } from "@/lib/services/suggestionService";
import type { SubmittedTicketResult } from "@/types/database.types";

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
        photoUrl: "/uploads/lunch/2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp",
      },
      {
        shift: "dinner",
        category: "portion",
        message: "La porción de la cena fue adecuada y caliente.",
        photo_url: "/uploads/dinner/2026/10/a1b2c3d4-e5f6-4a1b-8c2d-123456789abc.webp",
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

  it("rejects invalid photo URLs and arbitrary strings", () => {
    const result = submitSuggestionSchema.safeParse({
      shift: "lunch",
      category: "menu",
      message: "Mensaje válido con más de diez caracteres.",
      photoUrl: "not-a-valid-url",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "La ruta de la fotografía adjunta no es válida",
      );
    }
  });

  it("rejects external HTTP/HTTPS URLs (Security Hardening Hito 3)", () => {
    const externalInputs = [
      {
        shift: "lunch",
        category: "menu",
        message: "Mensaje válido con más de diez caracteres.",
        photo_url: "https://malicious-site.com/image.jpg",
      },
      {
        shift: "dinner",
        category: "hygiene",
        message: "Mensaje válido con más de diez caracteres.",
        photoUrl: "http://malicious-site.com/photo.webp",
      },
      {
        shift: "breakfast",
        category: "service",
        message: "Mensaje válido con más de diez caracteres.",
        photo_url: "https://storage.supabase.co/img.webp",
      },
    ];

    for (const input of externalInputs) {
      const result = submitSuggestionSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "La ruta de la fotografía adjunta no es válida",
        );
      }
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

  it("maps rate limit quota errors to didactic shift-aware Peruvian Spanish advice", () => {
    expect(
      mapSuggestionError(
        new Error(
          "Has alcanzado el límite de 2 reportes para este turno (lunch). Podrás enviar otra observación en el siguiente turno.",
        ),
      ),
    ).toBe(
      "Has alcanzado el límite de 2 reportes para el turno de almuerzo. Podrás enviar otra observación en el siguiente turno del comedor universitario para cuidar la estabilidad del buzón.",
    );

    expect(
      mapSuggestionError(
        new Error(
          "Has alcanzado el límite de 2 reportes para este turno (breakfast). Podrás enviar otra observación en el siguiente turno.",
        ),
      ),
    ).toBe(
      "Has alcanzado el límite de 2 reportes para el turno de desayuno. Podrás enviar otra observación en el siguiente turno del comedor universitario para cuidar la estabilidad del buzón.",
    );

    expect(
      mapSuggestionError(
        new Error(
          "Has alcanzado el límite de 2 reportes para este turno (dinner). Podrás enviar otra observación en el siguiente turno.",
        ),
      ),
    ).toBe(
      "Has alcanzado el límite de 2 reportes para el turno de cena. Podrás enviar otra observación en el siguiente turno del comedor universitario para cuidar la estabilidad del buzón.",
    );
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
  const STUDENT = "27215508@unsch.edu.pe";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue({
      ok: true,
      session: { email: STUDENT, isAdmin: false },
    });
  });

  it("returns validation error and fieldErrors without touching the session when input is invalid", async () => {
    const result = await submitSuggestion({
      shift: "lunch",
      category: "menu",
      message: "corto",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.data).toBeNull();
      expect(result.error).toBe("El mensaje es demasiado corto (mínimo 10 caracteres).");
      expect(result.fieldErrors?.message).toBeDefined();
    }
    expect(mocks.resolveSession).not.toHaveBeenCalled();
    expect(mocks.createAnonymousSuggestion).not.toHaveBeenCalled();
  });

  it("stores the sanitized message and returns the ticket without any student identifier", async () => {
    const ticketMock: SubmittedTicketResult = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      ticket_code: "UNSCH-7X9K",
      shift: "lunch",
      category: "menu",
      status: "pending",
      created_at: "2026-09-22T19:00:00.000Z",
    };

    mocks.createAnonymousSuggestion.mockResolvedValue(ticketMock);

    const result = await submitSuggestion({
      shift: "lunch",
      category: "menu",
      message: "   Comida muy balanceada y nutritiva hoy.   ",
      photoUrl: "/uploads/2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp",
    });

    expect(mocks.createAnonymousSuggestion).toHaveBeenCalledWith({
      email: STUDENT,
      shift: "lunch",
      category: "menu",
      message: "Comida muy balanceada y nutritiva hoy.",
      photoUrl: "/uploads/2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp",
    });

    expect(result).toEqual({
      success: true,
      data: ticketMock,
      error: null,
    });
    expect(JSON.stringify(result)).not.toContain(STUDENT);
  });

  it("converts empty string photoUrl to null for database cleanliness", async () => {
    mocks.createAnonymousSuggestion.mockResolvedValue({ id: "1" });

    await submitSuggestion({
      shift: "breakfast",
      category: "service",
      message: "Desayuno puntual a las 7:00 am.",
      photoUrl: "",
    });

    expect(mocks.createAnonymousSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ shift: "breakfast", photoUrl: null }),
    );
  });

  it.each([
    [
      "unauthenticated",
      "Tu sesión no es válida o ha expirado. Por favor, inicia sesión con tu correo institucional @unsch.edu.pe.",
    ],
    [
      "forbidden_domain",
      "Acceso denegado: solo cuentas institucionales @unsch.edu.pe pueden enviar sugerencias.",
    ],
    [
      "auth_unavailable",
      "El servicio de autenticación no está disponible temporalmente. Intenta nuevamente en unos minutos.",
    ],
  ] as const)("rejects the submission when the session is %s", async (reason, message) => {
    mocks.resolveSession.mockResolvedValue({ ok: false, reason });

    const result = await submitSuggestion({
      shift: "dinner",
      category: "infrastructure",
      message: "Revisar la iluminación de la salida del comedor.",
    });

    expect(result).toEqual({ success: false, data: null, error: message });
    expect(mocks.createAnonymousSuggestion).not.toHaveBeenCalled();
  });

  it("explains the exhausted shift quota (429) in didactic Peruvian Spanish", async () => {
    mocks.createAnonymousSuggestion.mockRejectedValue(new RateLimitExceededError("lunch"));

    const result = await submitSuggestion({
      shift: "lunch",
      category: "menu",
      message: "Tercer intento en el mismo turno de almuerzo.",
    });

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBe(
      "Has alcanzado el límite de 2 reportes para el turno de almuerzo. Podrás enviar otra observación en el siguiente turno del comedor universitario para cuidar la estabilidad del buzón.",
    );
  });

  it("hides database failures behind a generic message", async () => {
    mocks.createAnonymousSuggestion.mockRejectedValue(
      new Error("connect ECONNREFUSED postgresql://unsch_admin:clave@db:5432"),
    );

    const result = await submitSuggestion({
      shift: "lunch",
      category: "menu",
      message: "Mensaje válido enviado con la base de datos caída.",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Ocurrió un problema al enviar tu sugerencia. Por favor, intenta de nuevo en unos momentos.",
    );
  });
});
