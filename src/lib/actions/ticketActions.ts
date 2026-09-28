"use server";

import { createClient } from "@/lib/supabase/server";
import {
  ticketLookupSchema,
  type TicketLookupInput,
} from "@/lib/validations/ticketSchema";
import type { SuggestionRow, TicketResponse } from "@/types/database.types";

/** Full ticket detail returned to the tracking page. */
export interface TicketDetail {
  suggestion: SuggestionRow;
  responses: TicketResponse[];
}

export type LookupTicketResult =
  | { success: true; data: TicketDetail; error: null }
  | { success: false; data: null; error: string };

/**
 * Server Action: looks up a ticket by its public code.
 * Performs zero authentication — any visitor with the code can query.
 * Uses the public anon key which is restricted by RLS to read-only, public fields.
 */
export async function lookupTicket(
  input: TicketLookupInput,
): Promise<LookupTicketResult> {
  const validation = ticketLookupSchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      data: null,
      error:
        validation.error.issues[0]?.message ??
        "El código ingresado no tiene un formato válido.",
    };
  }

  const normalizedCode = validation.data.code.trim().toUpperCase();

  try {
    const supabase = await createClient();

    // Query the suggestions table for the ticket code (public read via RLS).
    const { data: suggestion, error: suggestionError } = await supabase
      .from("suggestions")
      .select("*")
      .eq("ticket_code", normalizedCode)
      .maybeSingle();

    if (suggestionError) {
      console.error("[lookupTicket] Supabase error:", suggestionError);
      return {
        success: false,
        data: null,
        error:
          "Ocurrió un problema al consultar el sistema. Por favor intenta de nuevo en unos momentos.",
      };
    }

    if (!suggestion) {
      return {
        success: false,
        data: null,
        error: `No encontramos ningún ticket con el código «${normalizedCode}». Verifica que hayas copiado el código correctamente, incluyendo el prefijo UNSCH-.`,
      };
    }

    // Fetch only non-internal (public) responses for this ticket.
    const { data: responses, error: responsesError } = await supabase
      .from("ticket_responses")
      .select("*")
      .eq("suggestion_id", suggestion.id)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });

    if (responsesError) {
      // Non-fatal: return ticket without responses rather than blocking the user.
      console.error("[lookupTicket] Responses fetch error:", responsesError);
    }

    return {
      success: true,
      data: {
        suggestion: suggestion as SuggestionRow,
        responses: (responses ?? []) as TicketResponse[],
      },
      error: null,
    };
  } catch (err) {
    console.error("[lookupTicket] Unexpected error:", err);
    return {
      success: false,
      data: null,
      error:
        "Ocurrió un error inesperado al buscar tu ticket. Por favor intenta nuevamente.",
    };
  }
}
