import { z } from "zod";

/**
 * Validation schema for official JVC responses (Sprint 8 - Issue 8.5).
 * - Minimum 15 useful characters (trimmed) for substantive institutional feedback.
 * - Maximum 600 characters for conciseness.
 * - Target status: `resolved` (default) or `in_review` for a provisional answer.
 */
export const officialResponseSchema = z.object({
  suggestionId: z
    .string()
    .uuid("El identificador de sugerencia debe ser un UUID válido."),
  responseText: z
    .string({
      error: "La respuesta oficial es obligatoria.",
    })
    .transform((val) => val.trim())
    .refine(
      (val) => val.length >= 15,
      "La respuesta oficial debe tener al menos 15 caracteres significativos.",
    )
    .refine(
      (val) => val.length <= 600,
      "La respuesta oficial no debe superar los 600 caracteres.",
    ),
  status: z.enum(["in_review", "resolved"]).default("resolved"),
});

export type OfficialResponseInput = z.input<typeof officialResponseSchema>;
