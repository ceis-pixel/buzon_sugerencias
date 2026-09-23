import { z } from "zod";

import type { ShiftType, SuggestionCategory } from "@/types/database.types";

export const suggestionShifts: readonly [ShiftType, ...ShiftType[]] = [
  "breakfast",
  "lunch",
  "dinner",
];

export const suggestionCategories: readonly [SuggestionCategory, ...SuggestionCategory[]] = [
  "menu",
  "hygiene",
  "portion",
  "service",
  "infrastructure",
];

export const submitSuggestionSchema = z.object({
  shift: z.enum(suggestionShifts, {
    error: "Debes seleccionar un turno válido (desayuno, almuerzo o cena).",
  }),
  category: z.enum(suggestionCategories, {
    error: "Debes seleccionar una categoría válida.",
  }),
  message: z
    .string({ error: "El mensaje es obligatorio." })
    .trim()
    .min(10, "El mensaje es demasiado corto (mínimo 10 caracteres).")
    .max(500, "El mensaje excede el límite máximo de 500 caracteres."),
  photoUrl: z
    .string()
    .url("La URL de la fotografía adjunta no es válida.")
    .nullable()
    .optional()
    .or(z.literal("")),
  photo_url: z
    .string()
    .url("La URL de la fotografía adjunta no es válida.")
    .nullable()
    .optional()
    .or(z.literal("")),
});

export type SubmitSuggestionInput = z.infer<typeof submitSuggestionSchema>;

export function mapSuggestionError(error: unknown): string {
  if (!error) {
    return "Ocurrió un error inesperado al registrar tu sugerencia.";
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);

  if (
    message.includes("Sesión no válida") ||
    message.includes("JWT") ||
    message.includes("auth.uid")
  ) {
    return "Tu sesión no es válida o ha expirado. Por favor, inicia sesión con tu correo institucional @unsch.edu.pe.";
  }

  if (message.includes("@unsch.edu.pe")) {
    return "Acceso denegado: solo cuentas institucionales @unsch.edu.pe pueden enviar sugerencias.";
  }

  if (message.includes("demasiado corto")) {
    return "El mensaje es demasiado corto (mínimo 10 caracteres).";
  }

  if (message.includes("excede el límite")) {
    return "El mensaje excede el límite máximo de 500 caracteres.";
  }

  if (message.includes("código de ticket")) {
    return "No se pudo generar un código de ticket disponible. Por favor, inténtalo nuevamente.";
  }

  if (message.includes("permission denied") || message.includes("42501")) {
    return "No tienes permisos suficientes para registrar sugerencias. Inicia sesión institucional.";
  }

  return "Ocurrió un problema al enviar tu sugerencia. Por favor, intenta de nuevo en unos momentos.";
}
