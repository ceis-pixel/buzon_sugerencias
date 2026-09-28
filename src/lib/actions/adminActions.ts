"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  officialResponseSchema,
  type OfficialResponseInput,
} from "@/lib/validations/responseSchema";
import type {
  AdminRow,
  SuggestionRow,
  TicketResponseRow,
  TicketStatus,
} from "@/types/database.types";

export interface AdminActionResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Validates that the current session belongs to an active administrator.
 */
export async function getVerifiedAdmin(): Promise<{
  userEmail: string;
  adminRecord: AdminRow;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return null;
  }

  const { data: adminRecord, error: adminError } = await supabase
    .from("admins")
    .select("*")
    .eq("email", user.email.toLowerCase())
    .eq("is_active", true)
    .maybeSingle();

  if (adminError || !adminRecord) {
    return null;
  }

  return {
    userEmail: user.email.toLowerCase(),
    adminRecord: adminRecord as AdminRow,
  };
}

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
      return {
        success: false,
        data: null,
        error: "Acceso no autorizado. Se requieren credenciales de moderador activo.",
      };
    }

    if (!["pending", "in_review", "resolved"].includes(newStatus)) {
      return {
        success: false,
        data: null,
        error: "Estado de ticket no válido.",
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("suggestions")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", suggestionId)
      .select()
      .single();

    if (error) {
      console.error("[updateSuggestionStatus] Error:", error);
      return {
        success: false,
        data: null,
        error: "No se pudo actualizar el estado de la sugerencia en la base de datos.",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/seguimiento");

    return {
      success: true,
      data: data as SuggestionRow,
      error: null,
    };
  } catch (err) {
    console.error("[updateSuggestionStatus] Unexpected exception:", err);
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
      return {
        success: false,
        data: null,
        error: "Acceso no autorizado. Se requieren credenciales de moderador activo.",
      };
    }

    const supabase = await createClient();

    // Check if an existing public response exists for this suggestion
    const { data: existingResponse } = await supabase
      .from("ticket_responses")
      .select("*")
      .eq("suggestion_id", validation.data.suggestionId)
      .eq("is_internal", false)
      .maybeSingle();

    let savedResponse: TicketResponseRow;

    if (existingResponse) {
      const { data: updatedResp, error: updateError } = await supabase
        .from("ticket_responses")
        .update({
          responder_email: admin.userEmail,
          response_text: validation.data.responseText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingResponse.id)
        .select()
        .single();

      if (updateError || !updatedResp) {
        console.error("[saveOfficialResponse] Update error:", updateError);
        return {
          success: false,
          data: null,
          error: "Error al actualizar la respuesta oficial previa.",
        };
      }
      savedResponse = updatedResp as TicketResponseRow;
    } else {
      const { data: insertedResp, error: insertError } = await supabase
        .from("ticket_responses")
        .insert({
          suggestion_id: validation.data.suggestionId,
          responder_email: admin.userEmail,
          response_text: validation.data.responseText,
          is_internal: false,
        })
        .select()
        .single();

      if (insertError || !insertedResp) {
        console.error("[saveOfficialResponse] Insert error:", insertError);
        return {
          success: false,
          data: null,
          error: "Error al registrar la nueva respuesta institucional.",
        };
      }
      savedResponse = insertedResp as TicketResponseRow;
    }

    // Automatically transition ticket to resolved
    const { data: updatedSuggestion, error: suggestionError } = await supabase
      .from("suggestions")
      .update({
        status: "resolved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", validation.data.suggestionId)
      .select()
      .single();

    if (suggestionError || !updatedSuggestion) {
      console.error(
        "[saveOfficialResponse] Suggestion status update error:",
        suggestionError,
      );
      return {
        success: false,
        data: null,
        error: "La respuesta se guardó pero falló la actualización del estado a atendido.",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/seguimiento");

    return {
      success: true,
      data: {
        response: savedResponse,
        suggestion: updatedSuggestion as SuggestionRow,
      },
      error: null,
    };
  } catch (err) {
    console.error("[saveOfficialResponse] Unexpected exception:", err);
    return {
      success: false,
      data: null,
      error: "Ocurrió un error inesperado al procesar la respuesta oficial.",
    };
  }
}
