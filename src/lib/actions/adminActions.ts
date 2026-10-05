"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getVerifiedAdmin } from "@/lib/auth/session";
import {
  submitOfficialResponse,
  updateSuggestionStatusById,
} from "@/lib/services/suggestionService";
import {
  officialResponseSchema,
  type OfficialResponseInput,
} from "@/lib/validations/responseSchema";
import type {
  SuggestionRow,
  TicketResponseRow,
  TicketStatus,
} from "@/types/database.types";

export interface AdminActionResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

const UNAUTHORIZED_MESSAGE =
  "Acceso no autorizado. Se requieren credenciales de moderador activo.";

const suggestionIdSchema = z.uuid();

/**
 * Server Action: Updates a suggestion status (pending | in_review | resolved).
 * Restricted to active administrators.
 */
export async function updateSuggestionStatus(
  suggestionId: string,
  newStatus: TicketStatus,
): Promise<AdminActionResponse<SuggestionRow>> {
  try {
    const admin = await getVerifiedAdmin();
    if (!admin) {
      return { success: false, data: null, error: UNAUTHORIZED_MESSAGE };
    }

    if (!["pending", "in_review", "resolved"].includes(newStatus)) {
      return {
        success: false,
        data: null,
        error: "Estado de ticket no válido.",
      };
    }

    const updated = suggestionIdSchema.safeParse(suggestionId).success
      ? await updateSuggestionStatusById(suggestionId, newStatus)
      : null;

    if (!updated) {
      return {
        success: false,
        data: null,
        error: "No se pudo actualizar el estado de la sugerencia en la base de datos.",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/seguimiento");

    return { success: true, data: updated, error: null };
  } catch (err) {
    console.error("[updateSuggestionStatus] Unexpected exception:", (err as Error).message);
    return {
      success: false,
      data: null,
      error: "Ocurrió un error inesperado al procesar la actualización.",
    };
  }
}

/**
 * Server Action: Submits or updates an official response from FUSCH.
 * Automatically marks the suggestion as `resolved`.
 */
export async function saveOfficialResponse(
  input: OfficialResponseInput,
): Promise<
  AdminActionResponse<{
    response: TicketResponseRow;
    suggestion: SuggestionRow;
  }>
> {
  const validation = officialResponseSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      data: null,
      error:
        validation.error.issues[0]?.message ??
        "La respuesta no cumple con los criterios de validación institucional.",
    };
  }

  try {
    const admin = await getVerifiedAdmin();
    if (!admin) {
      return { success: false, data: null, error: UNAUTHORIZED_MESSAGE };
    }

    // Response and status change commit together or not at all.
    const saved = suggestionIdSchema.safeParse(validation.data.suggestionId).success
      ? await submitOfficialResponse({
          suggestionId: validation.data.suggestionId,
          responderEmail: admin.userEmail,
          responseText: validation.data.responseText,
        })
      : null;

    if (!saved) {
      return {
        success: false,
        data: null,
        error: "No se encontró la sugerencia a la que intentas responder.",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/seguimiento");

    return { success: true, data: saved, error: null };
  } catch (err) {
    console.error("[saveOfficialResponse] Unexpected exception:", (err as Error).message);
    return {
      success: false,
      data: null,
      error: "Ocurrió un error inesperado al procesar la respuesta oficial.",
    };
  }
}
