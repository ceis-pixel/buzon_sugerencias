"use server";

import { resolveSession } from "@/lib/auth/session";
import { sendCriticalAlertWebhook } from "@/lib/services/alertWebhook";
import { createAnonymousSuggestion } from "@/lib/services/suggestionService";
import {
  mapSuggestionError,
  submitSuggestionSchema,
  type SubmitSuggestionInput,
} from "@/lib/validations/suggestionSchema";
import type { SubmittedTicketResult } from "@/types/database.types";

export type SubmitSuggestionResult =
  | {
      success: true;
      data: SubmittedTicketResult;
      error: null;
    }
  | {
      success: false;
      data: null;
      error: string;
      fieldErrors?: Partial<Record<keyof SubmitSuggestionInput, string[]>>;
    };

const SESSION_ERRORS = {
  unauthenticated:
    "Tu sesión no es válida o ha expirado. Por favor, inicia sesión con tu correo institucional @unsch.edu.pe.",
  forbidden_domain:
    "Acceso denegado: solo cuentas institucionales @unsch.edu.pe pueden enviar sugerencias.",
  auth_unavailable:
    "El servicio de autenticación no está disponible temporalmente. Intenta nuevamente en unos minutos.",
} as const;

export async function submitSuggestion(
  input: SubmitSuggestionInput,
): Promise<SubmitSuggestionResult> {
  const validation = submitSuggestionSchema.safeParse(input);

  if (!validation.success) {
    const fieldErrors: Partial<Record<keyof SubmitSuggestionInput, string[]>> = {};
    for (const issue of validation.error.issues) {
      const field = issue.path[0] as keyof SubmitSuggestionInput;
      if (field) {
        fieldErrors[field] = fieldErrors[field] || [];
        fieldErrors[field]!.push(issue.message);
      }
    }

    return {
      success: false,
      data: null,
      error:
        validation.error.issues[0]?.message ??
        "Los datos ingresados no cumplen con los requisitos de validación.",
      fieldErrors,
    };
  }

  try {
    // The e-mail stays in this scope: it only feeds the ephemeral rate hash.
    const lookup = await resolveSession();
    if (!lookup.ok) {
      return { success: false, data: null, error: SESSION_ERRORS[lookup.reason] };
    }

    const photoUrl =
      validation.data.photoUrl || validation.data.photo_url || null;

    const submitted = await createAnonymousSuggestion({
      email: lookup.session.email,
      shift: validation.data.shift,
      category: validation.data.category,
      message: validation.data.message,
      photoUrl,
    });

    // Issue 10.2: Trigger automated webhook alert for critical cases (fault-tolerant & non-blocking)
    try {
      sendCriticalAlertWebhook({
        ticketCode: submitted.ticket_code,
        shift: submitted.shift,
        category: submitted.category,
        message: validation.data.message,
        photoUrl,
      }).catch((webhookErr) => {
        console.error("[submitSuggestion] Webhook non-blocking error:", webhookErr);
      });
    } catch (webhookErr) {
      console.error("[submitSuggestion] Webhook dispatch exception:", webhookErr);
    }

    return {
      success: true,
      data: submitted,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: mapSuggestionError(err),
    };
  }
}
