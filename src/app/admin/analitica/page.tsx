import type { Metadata } from "next";

import { AnalyticsDashboardView } from "@/components/admin/analytics/AnalyticsDashboardView";
import type { SuggestionWithResponse } from "@/components/admin/SuggestionDetailModal";
import { getVerifiedAdmin } from "@/lib/auth/session";
import { fetchAllSuggestions, fetchResponses } from "@/lib/services/suggestionService";
import type { TicketResponseRow } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Analítica de Impacto y Gestión FUSCH • Comedor UNSCH",
  description:
    "Panel visual de métricas, distribución de incidencias y tasas de resolución para fundamentar informes técnicos ante la Dirección de Bienestar Universitario.",
};

export const dynamic = "force-dynamic";

/**
 * /admin/analitica — Impact Analytics Page (Issue 10.1)
 *
 * Protected Server Component that aggregates operational metrics and renders
 * the graphical visualization dashboard for the FUSCH Dining Hall Commission.
 */
export default async function AdminAnaliticaPage() {
  // The layout renders the access screens; the page refuses to load data on its own.
  if (!(await getVerifiedAdmin())) {
    return null;
  }

  // Suggestions for analytics computation and responses to evaluate resolution rate
  const [rawSuggestions, rawResponses] = await Promise.all([
    fetchAllSuggestions(),
    fetchResponses(),
  ]);

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

  // Fetch menus with rating metrics for correlation analysis (Issue 11.6)
  let recentMenus: import("@/types/database.types").DailyMenuWithStats[] = [];
  try {
    const { getRecentMenusWithStats } = await import("@/lib/actions/menuRatingActions");
    recentMenus = await getRecentMenusWithStats(30);
  } catch (menuErr) {
    console.error("[AdminAnaliticaPage] Menus fetch error:", menuErr);
  }

  return <AnalyticsDashboardView suggestions={suggestions} menus={recentMenus} />;
}
