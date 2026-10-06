import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/PageContainer";
import {
  TransparencyBoardView,
  type PublicImprovementItem,
} from "@/components/transparency/TransparencyBoardView";
import { fetchPublicImprovements, type PublicImprovement } from "@/lib/services/suggestionService";

export const metadata: Metadata = {
  title: "Mural de Transparencia Pública • Comedor UNSCH",
  description:
    "Mural público con las medidas y mejoras adoptadas por la Junta de Vigilancia del Comedor Universitario (JVC) a partir de las sugerencias de los comensales.",
};

// Read from PostgreSQL on each request: the on-premise image is compiled
// without database access, so this page must not be prerendered.
export const dynamic = "force-dynamic";

/**
 * /transparencia — Public Transparency Board (Issue 10.6)
 *
 * Public Server Component that showcases exclusively resolved tickets with
 * official, published responses from the JVC.
 *
 * Security and Dissociation Audit:
 * - Status must be strictly 'resolved'.
 * - Responses must be strictly 'is_internal = false'.
 * - No user emails, student identifiers, or private moderator notes are exposed.
 */
export default async function TransparenciaPage() {
  // Resolved tickets with their latest public (is_internal = false) response.
  let rows: PublicImprovement[] = [];
  try {
    rows = await fetchPublicImprovements();
  } catch (error) {
    console.error("[TransparenciaPage] Error fetching improvements:", (error as Error).message);
  }

  const improvements: PublicImprovementItem[] = rows.map((row) => ({
    id: row.id,
    ticketCode: row.ticket_code || "UNSCH",
    shift: row.shift,
    category: row.category,
    message: row.message,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
    resolvedAt: row.response_created_at || row.updated_at,
    officialResponse: row.response_text,
  }));

  return (
    <PageContainer
      title="Mural de Transparencia de Mejoras"
      subtitle="Medidas y mejoras adoptadas por la Junta de Vigilancia del Comedor Universitario (JVC)."
      badge="Cierre del Círculo de Confianza Estudiantil"
    >
      <TransparencyBoardView improvements={improvements} />
    </PageContainer>
  );
}
