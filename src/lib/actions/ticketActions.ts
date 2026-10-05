"use server";

import { fetchTicketDetails } from "@/lib/services/suggestionService";
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
 * Only public fields and non-internal responses are returned.
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
    const details = await fetchTicketDetails(normalizedCode);

    if (!details) {
      return {
        success: false,
        data: null,
        error: `No encontramos ningún ticket con el código «${normalizedCode}». Verifica que hayas copiado el código correctamente, incluyendo el prefijo UNSCH-.`,
      };
    }

    return { success: true, data: details, error: null };
  } catch (err) {
    console.error("[lookupTicket] Unexpected error:", (err as Error).message);
    return {
      success: false,
      data: null,
      error:
        "Ocurrió un problema al consultar el sistema. Por favor intenta de nuevo en unos momentos.",
    };
  }
}
