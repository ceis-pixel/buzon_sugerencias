import { createClient } from "@/lib/supabase/server";
import { AdminDashboardView } from "@/components/admin/AdminDashboardView";
import type { SuggestionWithResponse } from "@/components/admin/SuggestionDetailModal";
import type { SuggestionRow, TicketResponseRow } from "@/types/database.types";

/**
 * /admin — Moderation and Feedback Dashboard Page (Sprint 8)
 *
 * Server Component that queries the full suggestions backlog and their
 * official responses. Renders the interactive AdminDashboardView.
 */
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Query all suggestions ordered chronologically by newest first
  const { data: suggestionsData, error: suggestionsError } = await supabase
    .from("suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  if (suggestionsError) {
    console.error("[AdminDashboardPage] Suggestions fetch error:", suggestionsError);
  }

  // Query all responses to correlate with suggestions
  const { data: responsesData, error: responsesError } = await supabase
    .from("ticket_responses")
    .select("*")
    .order("created_at", { ascending: true });

  if (responsesError) {
    console.error("[AdminDashboardPage] Responses fetch error:", responsesError);
  }

  const rawSuggestions = (suggestionsData ?? []) as SuggestionRow[];
  const rawResponses = (responsesData ?? []) as TicketResponseRow[];

  // Map responses by suggestion_id
  const responsesBySuggestion = new Map<string, TicketResponseRow[]>();
  for (const resp of rawResponses) {
    const list = responsesBySuggestion.get(resp.suggestion_id) || [];
    list.push(resp);
    responsesBySuggestion.set(resp.suggestion_id, list);
  }

  // Build SuggestionWithResponse items
  const initialSuggestions: SuggestionWithResponse[] = rawSuggestions.map((s) => {
    const responses = responsesBySuggestion.get(s.id) || [];
    const latest_response =
      responses.length > 0 ? responses[responses.length - 1] : null;

    return {
      ...s,
      responses,
      latest_response,
    };
  });

  return <AdminDashboardView initialSuggestions={initialSuggestions} />;
}
