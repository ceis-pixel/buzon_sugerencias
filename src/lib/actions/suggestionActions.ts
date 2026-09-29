"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { sendCriticalAlertWebhook } from "@/lib/services/alertWebhook";
import {
  mapSuggestionError,
  submitSuggestionSchema,
  type SubmitSuggestionInput,
} from "@/lib/validations/suggestionSchema";
import type { Database, SubmittedTicketResult } from "@/types/database.types";

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

export async function submitSuggestion(
  input: SubmitSuggestionInput,
  options?: { supabase?: SupabaseClient<Database> },
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
    const supabase = options?.supabase ?? (await createClient());
    const photoUrl =
      validation.data.photoUrl || validation.data.photo_url || null;

    const { data, error } = await supabase.rpc("submit_anonymous_suggestion", {
      p_shift: validation.data.shift,
      p_category: validation.data.category,
      p_message: validation.data.message,
      p_photo_url: photoUrl,
    });

    if (error) {
      return {
        success: false,
        data: null,
        error: mapSuggestionError(error),
      };
    }

    const submitted = data as unknown as SubmittedTicketResult;

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
