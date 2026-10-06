import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Top-level mocks for server actions & Next.js navigation
const e2e = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  getVerifiedAdmin: vi.fn(),
  createAnonymousSuggestion: vi.fn(),
  fetchTicketDetails: vi.fn(),
  updateSuggestionStatusById: vi.fn(),
  submitOfficialResponse: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  resolveSession: e2e.resolveSession,
  getVerifiedAdmin: e2e.getVerifiedAdmin,
}));

vi.mock("@/lib/services/suggestionService", () => ({
  createAnonymousSuggestion: e2e.createAnonymousSuggestion,
  fetchTicketDetails: e2e.fetchTicketDetails,
  updateSuggestionStatusById: e2e.updateSuggestionStatusById,
  submitOfficialResponse: e2e.submitOfficialResponse,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import { UnauthorizedAccessState } from "@/components/admin/UnauthorizedAccessState";
import { CategorySelector } from "@/components/suggestion/CategorySelector";
import { SuggestionMessageField } from "@/components/suggestion/SuggestionMessageField";
import {
  saveOfficialResponse,
  updateSuggestionStatus,
} from "@/lib/actions/adminActions";
import { submitSuggestion } from "@/lib/actions/suggestionActions";
import { lookupTicket } from "@/lib/actions/ticketActions";
import {
  calculateDimensions,
  compressImage,
} from "@/lib/utils/imageCompression";
import { suggestionFormSchema } from "@/lib/validations/suggestionSchema";

/**
 * Sprint 9 — End-to-End Critical Integration Test Suite (Issue 9.4)
 *
 * Covers the 5 mandatory critical production flows:
 * 1. Form Validation (sub-10 char rejection, missing category, crimson error borders)
 * 2. In-Browser Image Compression (1200 px clamp, WebP format)
 * 3. Dissociated Anonymity (payload verification, zero user_id/email leak)
 * 4. Ticket Traceability (public code lookup & official response resolution)
 * 5. Admin Shielding (403 unauthorized rejection for non-moderators)
 */
describe("Sprint 9 Critical E2E & Production Integration Suite (Issue 9.4)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    e2e.resolveSession.mockResolvedValue({
      ok: true,
      session: { email: "estudiante.regular@unsch.edu.pe", isAdmin: false },
    });
    e2e.getVerifiedAdmin.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // =========================================================================
  // PRUEBA 1: Validación de Formulario
  // =========================================================================
  describe("Prueba 1: Validación de Formulario (Reglas Didácticas y Bordes Carmesí)", () => {
    it("bloquea envíos con texto menor a 10 caracteres útiles y rechaza espacios en blanco", () => {
      const invalidShortMessages = [
        "",
        "   ",
        "corto",
        "123456789",
        "   hola   ",
      ];

      for (const msg of invalidShortMessages) {
        const result = suggestionFormSchema.safeParse({
          shift: "lunch",
          category: "menu",
          message: msg,
          mediaFile: null,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const messageError = result.error.issues.find((issue) =>
            issue.path.includes("message"),
          );
          expect(messageError).toBeDefined();
          expect(messageError?.message).toContain("10 caracteres");
        }
      }
    });

    it("bloquea envíos cuando no se ha seleccionado ninguna categoría", () => {
      const resultWithoutCategory = suggestionFormSchema.safeParse({
        shift: "lunch",
        category: undefined,
        message: "El almuerzo del día de hoy estuvo excelente y bien servido.",
        mediaFile: null,
      });

      expect(resultWithoutCategory.success).toBe(false);
      if (!resultWithoutCategory.success) {
        const categoryError = resultWithoutCategory.error.issues.find((issue) =>
          issue.path.includes("category"),
        );
        expect(categoryError).toBeDefined();
        expect(categoryError?.message).toContain("categoría");
      }
    });

    it("renderiza bordes carmesí didácticos (border-2 border-primary) y role='alert' ante errores", () => {
      const fieldHtml = renderToStaticMarkup(
        createElement(SuggestionMessageField, {
          id: "test-message",
          errorMessage: "La observación debe tener al menos 10 caracteres útiles.",
        }),
      );

      // Verify crimson error border and alert attributes
      expect(fieldHtml).toContain("border-primary");
      expect(fieldHtml).toContain('role="alert"');
      expect(fieldHtml).toContain('aria-invalid="true"');
      expect(fieldHtml).toContain("La observación debe tener al menos 10 caracteres útiles.");
    });

    it("CategorySelector marca aria-invalid='true' cuando existe mensaje de error", () => {
      const selectorHtml = renderToStaticMarkup(
        createElement(CategorySelector, {
          value: null,
          onChange: () => {},
          errorMessage: "Debes seleccionar una categoría para continuar.",
        }),
      );

      expect(selectorHtml).toContain('aria-invalid="true"');
      expect(selectorHtml).toContain("Debes seleccionar una categoría para continuar.");
    });
  });

  // =========================================================================
  // PRUEBA 2: Compresión en Navegador
  // =========================================================================
  describe("Prueba 2: Compresión de Evidencia Fotográfica en Navegador (Issue 9.4)", () => {
    it("redimensiona imágenes panorámicas y verticales respetando el límite máximo de 1200 px", () => {
      // Landscape: 4000 x 3000 -> 1200 x 900
      const landscape = calculateDimensions(4000, 3000, 1200);
      expect(landscape).toEqual({ width: 1200, height: 900 });

      // Portrait: 3000 x 4000 -> 900 x 1200
      const portrait = calculateDimensions(3000, 4000, 1200);
      expect(portrait).toEqual({ width: 900, height: 1200 });

      // Square: 2000 x 2000 -> 1200 x 1200
      const square = calculateDimensions(2000, 2000, 1200);
      expect(square).toEqual({ width: 1200, height: 1200 });

      // Already smaller image: 800 x 600 -> stays 800 x 600 (no upscaling)
      const small = calculateDimensions(800, 600, 1200);
      expect(small).toEqual({ width: 800, height: 600 });
    });

    it("genera formato WebP con compresión de calidad 0.82", async () => {
      // Mock createImageBitmap
      const mockBitmap = {
        width: 3000,
        height: 2000,
        close: vi.fn(),
      };
      vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(mockBitmap));

      let requestedMimeType = "";
      let requestedQuality = 0;

      const mockCtx = {
        drawImage: vi.fn(),
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
      };

      const mockBlob = new Blob(["mock-webp-data-stream"], { type: "image/webp" });
      Object.defineProperty(mockBlob, "size", { value: 125000 });

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockCtx),
        toBlob: vi.fn((callback: (b: Blob | null) => void, mime?: string, quality?: number) => {
          requestedMimeType = mime || "";
          requestedQuality = quality || 0;
          callback(mockBlob);
        }),
      };

      vi.stubGlobal("document", {
        createElement: vi.fn((tagName: string) => {
          if (tagName === "canvas") {
            return mockCanvas as unknown as HTMLCanvasElement;
          }
          return {};
        }),
      });

      vi.stubGlobal("URL", {
        createObjectURL: vi.fn().mockReturnValue("blob:http://localhost/mock-preview-id"),
        revokeObjectURL: vi.fn(),
      });

      const dummyFile = new File(["dummy raw image content"], "evidencia.jpg", {
        type: "image/jpeg",
      });

      const result = await compressImage(dummyFile, {
        maxDimension: 1200,
        quality: 0.82,
      });

      expect(requestedMimeType).toBe("image/webp");
      expect(requestedQuality).toBe(0.82);
      expect(result.file.type).toBe("image/webp");
      expect(result.file.name.endsWith(".webp")).toBe(true);
      expect(result.width).toBe(1200);
      expect(result.height).toBe(800);
    });
  });

  // =========================================================================
  // PRUEBA 3: Anonimato Disociado
  // =========================================================================
  describe("Prueba 3: Anonimato Disociado hacia la Base de Datos (Issue 9.4)", () => {
    it("asegura que el ticket devuelto y la alerta NO expongan user_id ni email del estudiante", async () => {
      e2e.createAnonymousSuggestion.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440000",
        ticket_code: "UNSCH-A9X2",
        shift: "lunch",
        category: "hygiene",
        status: "pending",
        created_at: new Date().toISOString(),
      });

      const submissionPayload = {
        shift: "lunch" as const,
        category: "hygiene" as const,
        message: "El personal de cocina utilizó mascarillas y cofias reglamentarias.",
        photoUrl: "/uploads/2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp",
      };

      const result = await submitSuggestion(submissionPayload);

      expect(result.success).toBe(true);

      // The e-mail is handed to the service solely to derive the ephemeral hash.
      expect(e2e.createAnonymousSuggestion).toHaveBeenCalledWith({
        email: "estudiante.regular@unsch.edu.pe",
        shift: "lunch",
        category: "hygiene",
        message: submissionPayload.message,
        photoUrl: submissionPayload.photoUrl,
      });

      // Obligatory Anonymity invariants on everything returned to the browser
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("estudiante.regular");
      expect(serialized).not.toContain("@unsch.edu.pe");
      if (result.success) {
        expect(result.data).not.toHaveProperty("user_id");
        expect(result.data).not.toHaveProperty("email");
        expect(result.data).not.toHaveProperty("student_id");
        expect(result.data).not.toHaveProperty("author");
      }
    });

    it("rechaza el envío cuando no existe una sesión institucional activa", async () => {
      e2e.resolveSession.mockResolvedValue({ ok: false, reason: "unauthenticated" });

      const result = await submitSuggestion({
        shift: "lunch",
        category: "menu",
        message: "Intento de envío sin haber iniciado sesión institucional.",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("inicia sesión con tu correo institucional");
      expect(e2e.createAnonymousSuggestion).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // PRUEBA 4: Trazabilidad y Consulta Pública en /seguimiento
  // =========================================================================
  describe("Prueba 4: Trazabilidad y Consulta Pública en /seguimiento (Issue 9.4)", () => {
    it("permite consultar un ticket por su código y resuelve la respuesta oficial de la comisión", async () => {
      const mockSuggestionRow = {
        id: "sugg-12345",
        ticket_code: "UNSCH-T92M",
        shift: "lunch",
        category: "portion",
        message: "La porción de proteína servida el día de hoy fue insuficiente.",
        status: "resolved",
        photo_url: null,
        created_at: "2026-09-28T12:00:00Z",
        updated_at: "2026-09-28T14:30:00Z",
      };

      const mockOfficialResponse = {
        id: "resp-789",
        suggestion_id: "sugg-12345",
        responder_email: "nutricionista@unsch.edu.pe",
        response_text:
          "Se verificó con el nutricionista de turno y se procedió a calibrar el gramaje de las raciones en barra.",
        is_internal: false,
        created_at: "2026-09-28T14:30:00Z",
        updated_at: "2026-09-28T14:30:00Z",
      };

      e2e.fetchTicketDetails.mockResolvedValue({
        suggestion: mockSuggestionRow,
        responses: [mockOfficialResponse],
      });

      // Query with mixed case and leading/trailing whitespace
      const result = await lookupTicket({ code: "  unsch-t92m  " });

      expect(e2e.fetchTicketDetails).toHaveBeenCalledWith("UNSCH-T92M");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.suggestion.ticket_code).toBe("UNSCH-T92M");
        expect(result.data.suggestion.status).toBe("resolved");
        expect(result.data.responses).toHaveLength(1);
        expect(result.data.responses[0]?.response_text).toContain("calibrar el gramaje");
      }
    });
  });

  // =========================================================================
  // PRUEBA 5: Blindaje Admin (Restricción 403 para no moderadores)
  // =========================================================================
  describe("Prueba 5: Blindaje Admin y Manejo Didáctico 403 (Issue 9.4)", () => {
    it("bloquea operaciones de moderación con error 403 cuando el usuario no está en la tabla admins", async () => {
      // Active institutional session whose e-mail is NOT in the admins table
      e2e.getVerifiedAdmin.mockResolvedValue(null);

      const statusResult = await updateSuggestionStatus("sugg-test-id", "in_review");
      expect(statusResult.success).toBe(false);
      expect(statusResult.error).toContain("Acceso no autorizado");

      const responseResult = await saveOfficialResponse({
        suggestionId: "d3b07384-d113-40e9-a720-7f215d2f6233",
        responseText: "Respuesta no autorizada de prueba con más de quince caracteres.",
      });
      expect(responseResult.success).toBe(false);
      expect(responseResult.error).toContain("Acceso no autorizado");

      expect(e2e.updateSuggestionStatusById).not.toHaveBeenCalled();
      expect(e2e.submitOfficialResponse).not.toHaveBeenCalled();
    });

    it("renderiza el componente UnauthorizedAccessState con código 403 y diseño Crimson Heritage", () => {
      const html = renderToStaticMarkup(
        createElement(UnauthorizedAccessState, {
          userEmail: "estudiante.noadmin@unsch.edu.pe",
        }),
      );

      // Verify Crimson Heritage tokens and 403 status
      expect(html).toContain("Código 403 • Acceso Restringido");
      expect(html).toContain("Acceso restringido a la Junta de Vigilancia");
      expect(html).toContain("estudiante.noadmin@unsch.edu.pe");
      expect(html).toContain("Junta de Vigilancia del Comedor Universitario (JVC)");
      expect(html).toContain("Volver al Inicio");
      expect(html).toContain("Cambiar Cuenta");
    });
  });
});
