import type { Metadata } from "next";

import { AnalyticsDashboardView } from "@/components/admin/analytics/AnalyticsDashboardView";
import type { SuggestionWithResponse } from "@/components/admin/SuggestionDetailModal";
import { createClient } from "@/lib/supabase/server";
import type { SuggestionRow, TicketResponseRow } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Analítica de Impacto y Gestión FUSCH • Comedor UNSCH",
  description:
    "Panel visual de métricas, distribución de incidencias y tasas de resolución para fundamentar informes técnicos ante la Dirección de Bienestar Universitario.",
};

/**
 * /admin/analitica — Impact Analytics Page (Issue 10.1)
 *
 * Protected Server Component that aggregates operational metrics and renders
 * the graphical visualization dashboard for the FUSCH Dining Hall Commission.
 */
export default async function AdminAnaliticaPage() {
  const supabase = await createClient();

  // Query suggestions for analytics computation
  const { data: suggestionsData, error: suggestionsError } = await supabase
    .from("suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  if (suggestionsError) {
    console.error("[AdminAnaliticaPage] Suggestions fetch error:", suggestionsError);
  }

  // Query responses to evaluate resolution rate
  const { data: responsesData, error: responsesError } = await supabase
    .from("ticket_responses")
    .select("*")
    .order("created_at", { ascending: true });

  if (responsesError) {
    console.error("[AdminAnaliticaPage] Responses fetch error:", responsesError);
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

  // Correlate into SuggestionWithResponse
  const suggestions: SuggestionWithResponse[] = rawSuggestions.map((s) => {
    const responses = responsesBySuggestion.get(s.id) || [];
    const latest_response =
      responses.length > 0 ? responses[responses.length - 1] : null;

    return {
      ...s,
      responses,
      latest_response,
    };
  });

  return <AnalyticsDashboardView suggestions={suggestions} />;
}
