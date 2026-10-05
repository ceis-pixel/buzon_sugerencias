import { z } from "zod";

/**
 * Validation schema for daily menu student evaluation (Sprint 11 - Issue 11.3).
 * - Quantitative 1-touch feedback (1 to 5 stars).
 * - ratingMain (Plato Principal) is strictly mandatory (1-5).
 * - ratingSide (Sopa / Entrada) and ratingBeverage (Refresco / Bebida) are optional (1-5).
 */
export const menuRatingSchema = z.object({
  menuId: z.string().uuid("El identificador del menú debe ser un UUID válido."),
  shift: z.enum(["breakfast", "lunch", "dinner"], {
    error: "El turno debe ser desayuno, almuerzo o cena.",
  }),
  ratingMain: z
    .number({
      error: "La calificación del plato principal es obligatoria.",
    })
    .int("La calificación debe ser un número entero.")
    .min(1, "La calificación mínima es 1 estrella.")
    .max(5, "La calificación máxima es 5 estrellas."),
  ratingSide: z
    .number()
    .int("La calificación debe ser un número entero.")
    .min(1, "La calificación mínima es 1 estrella.")
    .max(5, "La calificación máxima es 5 estrellas.")
    .optional()
    .nullable(),
  ratingBeverage: z
    .number()
    .int("La calificación debe ser un número entero.")
    .min(1, "La calificación mínima es 1 estrella.")
    .max(5, "La calificación máxima es 5 estrellas.")
    .optional()
    .nullable(),
});

export type MenuRatingInput = z.infer<typeof menuRatingSchema>;

/**
 * Validation schema for administrative daily menu management (Sprint 11 - Issue 11.5).
 */
export const dailyMenuSchema = z.object({
  id: z.string().uuid().optional(),
  date: z
    .string({
      error: "La fecha es obligatoria.",
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "El formato de fecha debe ser AAAA-MM-DD."),
  shift: z.enum(["breakfast", "lunch", "dinner"], {
    error: "El turno debe ser desayuno, almuerzo o cena.",
  }),
  mainDish: z
    .string({
      error: "El nombre del plato principal es obligatorio.",
    })
    .transform((val) => val.trim())
    .refine((val) => val.length >= 3, "El plato principal debe tener al menos 3 caracteres.")
    .refine((val) => val.length <= 150, "El plato principal no puede superar los 150 caracteres."),
  sideDish: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length <= 150, "La sopa o entrada no puede superar los 150 caracteres.")
    .optional()
    .nullable(),
  beverage: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length <= 100, "La bebida no puede superar los 100 caracteres.")
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
});

export type DailyMenuInput = z.infer<typeof dailyMenuSchema>;

/**
 * Maps domain and PostgreSQL errors to user-friendly messages in Peruvian Spanish.
 */
export function mapMenuRatingError(error: unknown): string {
  if (!error) return "Ocurrió un error inesperado al procesar la solicitud.";

  const message =
    typeof error === "string"
      ? error
      : (error as { message?: string }).message || "";

  if (
    message.includes("Ya registraste tu opinión") ||
    message.includes("Ya registraste tu calificación") ||
    message.includes("uq_menu_rate_hash_shift_date") ||
    message.includes("uq_menu_rating_limits")
  ) {
    return "Ya registraste tu opinión para el turno de hoy. ¡Gracias por participar!";
  }

  if (message.includes("Sesión no válida") || message.includes("auth.uid()")) {
    return "Debes iniciar sesión con tu cuenta institucional @unsch.edu.pe para calificar.";
  }

  if (message.includes("solo cuentas @unsch.edu.pe")) {
    return "Acceso denegado: solo cuentas @unsch.edu.pe pueden calificar el menú.";
  }

  if (message.includes("cerrada o inactiva") || message.includes("no está disponible")) {
    return "La recepción de calificaciones para este menú ha sido cerrada o se encuentra inactiva.";
  }

  if (message.includes("no coincide con el menú")) {
    return "El turno seleccionado no coincide con la programación del menú.";
  }

  if (message.includes("no existe")) {
    return "El menú universitario solicitado no fue encontrado.";
  }

  return message || "Ocurrió un error al registrar la calificación. Intenta nuevamente.";
}

/**
 * Computes rating metrics (count and component averages) from raw ratings.
 */
export function calculateRatingStats(
  ratings: Array<{
    rating_main: number;
    rating_side: number | null;
    rating_beverage: number | null;
  }>,
): import("@/types/database.types").MenuRatingStats {
  if (!ratings || ratings.length === 0) {
    return {
      count: 0,
      avg_main: 0,
      avg_side: null,
      avg_beverage: null,
      avg_overall: 0,
    };
  }

  const count = ratings.length;
  let sumMain = 0;
  let sumSide = 0;
  let countSide = 0;
  let sumBeverage = 0;
  let countBeverage = 0;
  let sumComposite = 0;

  for (const r of ratings) {
    sumMain += r.rating_main;
    let compCount = 1;
    let compSum = r.rating_main;

    if (r.rating_side !== null && r.rating_side !== undefined) {
      sumSide += r.rating_side;
      countSide++;
      compSum += r.rating_side;
      compCount++;
    }

    if (r.rating_beverage !== null && r.rating_beverage !== undefined) {
      sumBeverage += r.rating_beverage;
      countBeverage++;
      compSum += r.rating_beverage;
      compCount++;
    }

    sumComposite += compSum / compCount;
  }

  const round1 = (val: number) => Math.round(val * 10) / 10;

  return {
    count,
    avg_main: round1(sumMain / count),
    avg_side: countSide > 0 ? round1(sumSide / countSide) : null,
    avg_beverage: countBeverage > 0 ? round1(sumBeverage / countBeverage) : null,
    avg_overall: round1(sumComposite / count),
  };
}
