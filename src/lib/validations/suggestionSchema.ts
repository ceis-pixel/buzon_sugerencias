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

export const shiftEnum = z.enum(suggestionShifts, {
  error: "Por favor selecciona el turno a reportar.",
});

export const categoryEnum = z.enum(suggestionCategories, {
  error: "Debes elegir una categoría para clasificar tu observación.",
});

export const suggestionFormSchema = z.object({
  shift: shiftEnum,
  category: categoryEnum,
  message: z
    .string({ error: "Escribe tu observación o sugerencia." })
    .trim()
    .min(10, "Tu mensaje debe tener al menos 10 caracteres para entender el caso.")
    .max(500, "El mensaje no puede exceder los 500 caracteres."),
  mediaFile: z.instanceof(File).nullable().optional(),
});

export type SuggestionFormValues = z.infer<typeof suggestionFormSchema>;

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

  if (
    message.includes("Has alcanzado el límite de 2 reportes") ||
    message.includes("límite de 2 reportes")
  ) {
    let shiftText = "este turno";
    if (message.includes("breakfast") || message.includes("desayuno")) {
      shiftText = "el turno de desayuno";
    } else if (message.includes("lunch") || message.includes("almuerzo")) {
      shiftText = "el turno de almuerzo";
    } else if (message.includes("dinner") || message.includes("cena")) {
      shiftText = "el turno de cena";
    }

    return `Has alcanzado el límite de 2 reportes para ${shiftText}. Podrás enviar otra observación en el siguiente turno del comedor universitario para cuidar la estabilidad del buzón.`;
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
