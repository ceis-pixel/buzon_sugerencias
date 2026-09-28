import { Suspense } from "react";

import { TicketTrackingView } from "@/components/tracking/TicketTrackingView";

/**
 * /seguimiento — Public Ticket Tracking Page (Issue 7.6)
 *
 * Uses a wider max-w-4xl container to accommodate the two-column desktop layout
 * (search + results | recent tickets sidebar).
 *
 * Wrapped in <Suspense> because TicketTrackingView uses useSearchParams(),
 * which requires a suspense boundary when rendering on the server.
 */
export default function SeguimientoPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <Suspense
        fallback={
          <div
            role="status"
            aria-label="Cargando módulo de seguimiento…"
            className="min-w-0 animate-pulse space-y-4"
          >
            <div className="h-8 w-1/2 rounded-xl bg-gray-100" />
            <div className="h-4 w-2/3 rounded-xl bg-gray-100" />
            <div className="h-32 rounded-2xl bg-gray-100" />
          </div>
        }
      >
        <TicketTrackingView />
      </Suspense>
    </main>
  );
}
