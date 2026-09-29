import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/PageContainer";
import {
  TransparencyBoardView,
  type PublicImprovementItem,
} from "@/components/transparency/TransparencyBoardView";
import { createClient } from "@/lib/supabase/server";
import type { SuggestionRow, TicketResponseRow } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Mural de Transparencia Pública • Comedor UNSCH",
  description:
    "Mural informativo público con las mejoras realizadas e incidencias atendidas por la Comisión de Comedor FUSCH y Bienestar Universitario.",
};

export const revalidate = 60; // ISR cache revalidation every 60 seconds

/**
 * /transparencia — Public Transparency Board (Issue 10.6)
 *
 * Public Server Component that showcases exclusively resolved tickets with
 * official, published responses from FUSCH.
 *
 * Security and Dissociation Audit:
 * - Status must be strictly 'resolved'.
 * - Responses must be strictly 'is_internal = false'.
 * - No user emails, student identifiers, or private moderator notes are exposed.
 */
export default async function TransparenciaPage() {
  const supabase = await createClient();

  // 1. Query exclusively resolved suggestions
  const { data: suggestionsData, error: suggestionsError } = await supabase
    .from("suggestions")
    .select("id, ticket_code, shift, category, message, photo_url, created_at, updated_at")
    .eq("status", "resolved")
    .order("updated_at", { ascending: false });

  if (suggestionsError) {
    console.error("[TransparenciaPage] Error fetching resolved suggestions:", suggestionsError);
  }

  const resolvedSuggestions = (suggestionsData ?? []) as SuggestionRow[];
  const suggestionIds = resolvedSuggestions.map((s) => s.id);

  let publicResponses: TicketResponseRow[] = [];

  // 2. Query public official responses strictly (is_internal = false)
  if (suggestionIds.length > 0) {
    const { data: responsesData, error: responsesError } = await supabase
      .from("ticket_responses")
      .select("id, suggestion_id, response_text, is_internal, created_at, updated_at")
      .in("suggestion_id", suggestionIds)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });

    if (responsesError) {
      console.error("[TransparenciaPage] Error fetching public responses:", responsesError);
    } else {
      publicResponses = (responsesData ?? []) as TicketResponseRow[];
    }
  }

  // 3. Map responses by suggestion_id
  const responsesBySuggestion = new Map<string, TicketResponseRow>();
  for (const resp of publicResponses) {
    // Keep the latest public response
    responsesBySuggestion.set(resp.suggestion_id, resp);
  }

  // 4. Construct PublicImprovementItem array (only include items that possess an official public response)
  const improvements: PublicImprovementItem[] = [];

  for (const s of resolvedSuggestions) {
    const resp = responsesBySuggestion.get(s.id);
    if (!resp || !resp.response_text.trim()) {
      // Exclude resolved items lacking an explicit official response
      continue;
    }

    improvements.push({
      id: s.id,
      ticketCode: s.ticket_code || "UNSCH",
      shift: s.shift,
      category: s.category,
      message: s.message,
      photoUrl: s.photo_url,
      createdAt: s.created_at,
      resolvedAt: resp.created_at || s.updated_at,
      officialResponse: resp.response_text,
    });
  }

  return (
    <PageContainer
      title="Mural de Transparencia de Mejoras"
      subtitle="Resultados concretos y medidas adoptadas por la Comisión FUSCH en el Comedor Universitario."
      badge="Cierre del Círculo de Confianza Estudiantil"
    >
      <TransparencyBoardView improvements={improvements} />
    </PageContainer>
  );
}
