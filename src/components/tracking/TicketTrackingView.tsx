"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  HelpCircle,
  Search,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { Badge } from "@/components/common/Badge";
import { RecentTicketsSidebar } from "@/components/tracking/RecentTicketsSidebar";
import { TicketResponseList } from "@/components/tracking/TicketResponseList";
import { TicketSearchBar } from "@/components/tracking/TicketSearchBar";
import { TicketStatusCard } from "@/components/tracking/TicketStatusCard";
import { lookupTicket, type TicketDetail } from "@/lib/actions/ticketActions";
import { useRecentTickets } from "@/lib/hooks/useRecentTickets";
import { normalizeTicketCode } from "@/lib/utils/ticket";

/**
 * Issue 7.6 — TicketTrackingView (Client Component)
 *
 * Orchestrates the full Sprint 7 ticket tracking flow:
 * - Reads the `code` query param on mount and auto-searches if present.
 * - Manages search state with `useTransition` for non-blocking UX.
 * - Syncs the searched code into the URL for shareability.
 * - Persists successfully found codes to localStorage via useRecentTickets.
 * - Renders TicketSearchBar, TicketStatusCard, TicketResponseList, and
 *   RecentTicketsSidebar in a responsive two-column layout.
 */
export function TicketTrackingView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [lookupError, setLookupError] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<TicketDetail | null>(null);
  const [activeCode, setActiveCode] = useState<string>("");

  const { addRecentTicket } = useRecentTickets();
  const resultRef = useRef<HTMLDivElement>(null);

  /**
   * Core search handler — called by TicketSearchBar and RecentTicketsSidebar.
   */
  const handleSearch = useCallback(
    (rawCode: string) => {
      const code = normalizeTicketCode(rawCode);
      if (!code) return;

      setLookupError(null);
      setTicketDetail(null);
      setActiveCode(code);

      // Update URL for shareability (no full navigation).
      const url = new URL(window.location.href);
      url.searchParams.set("code", code);
      router.replace(url.pathname + url.search, { scroll: false });

      startTransition(async () => {
        const result = await lookupTicket({ code });

        if (!result.success) {
          setLookupError(result.error);
          setTicketDetail(null);
        } else {
          setLookupError(null);
          setTicketDetail(result.data);
          addRecentTicket(code);
          // Smooth-scroll to result on mobile
          setTimeout(() => {
            resultRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 100);
        }
      });
    },
    [router, addRecentTicket],
  );

  // Auto-trigger search when a `code` query param is present on first render.
  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam) {
      queueMicrotask(() => {
        handleSearch(codeParam);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Page hero header ── */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="tertiary"
            size="sm"
            icon={<ShieldCheck className="size-3.5" />}
          >
            100% Anónimo
          </Badge>
          <Badge
            variant="neutral"
            size="sm"
            icon={<Ticket className="size-3.5" />}
          >
            Consulta Pública
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Seguimiento de Sugerencias
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-gray">
          Ingresa el código de seguimiento que recibiste al enviar tu reporte
          para consultar su estado y ver las respuestas del equipo del comedor
          universitario.
        </p>
      </div>

      {/* ── Two-column layout on desktop ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left / main column */}
        <div className="min-w-0 space-y-6">
          {/* Search card */}
          <section
            aria-labelledby="search-heading"
            className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
          >
            <h2
              id="search-heading"
              className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900"
            >
              <Search className="size-4.5 text-primary" aria-hidden="true" />
              Consultar estado del ticket
            </h2>

            <TicketSearchBar
              defaultCode={activeCode || (searchParams.get("code") ?? "")}
              onSearch={handleSearch}
              isLoading={isPending}
            />
          </section>

          {/* Loading skeleton */}
          {isPending && (
            <div
              role="status"
              aria-label="Buscando ticket…"
              className="min-w-0 animate-pulse rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="space-y-4">
                <div className="h-6 w-1/3 rounded-lg bg-gray-100" />
                <div className="h-4 w-2/3 rounded-lg bg-gray-100" />
                <div className="h-4 w-1/2 rounded-lg bg-gray-100" />
                <div className="mt-6 h-20 rounded-xl bg-gray-100" />
              </div>
              <span className="sr-only">Buscando ticket, por favor espera…</span>
            </div>
          )}

          {/* Error state */}
          {!isPending && lookupError && (
            <AlertBanner
              variant="error"
              title="No encontramos tu ticket"
              description={lookupError}
            />
          )}

          {/* Results */}
          {!isPending && ticketDetail && (
            <div ref={resultRef} className="space-y-5">
              <TicketStatusCard suggestion={ticketDetail.suggestion} />
              <TicketResponseList responses={ticketDetail.responses} />
            </div>
          )}

          {/* Empty / initial state */}
          {!isPending && !lookupError && !ticketDetail && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-slate-50/60 px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/5">
                <HelpCircle
                  className="size-6 text-primary"
                  aria-hidden="true"
                />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                ¿Cuál es tu código?
              </p>
              <p className="max-w-sm text-xs leading-relaxed text-neutral-gray">
                El código tiene el formato{" "}
                <span className="font-mono font-bold text-gray-900">
                  UNSCH-XXXX
                </span>
                . Lo encontrarás en el modal de confirmación que apareció al
                enviar tu sugerencia, o en la notificación que guardaste.
              </p>
            </div>
          )}
        </div>

        {/* Right / sidebar column */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <RecentTicketsSidebar
            onSelect={handleSearch}
            activeCode={activeCode}
          />

          {/* Privacy info card */}
          <div className="min-w-0 rounded-2xl border border-tertiary/15 bg-tertiary/5 p-4">
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-tertiary"
                aria-hidden="true"
              />
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-tertiary">
                  Consulta 100% anónima
                </p>
                <p className="text-[11px] leading-relaxed text-tertiary/80">
                  Esta página no requiere inicio de sesión. El código es la
                  única llave de acceso. Sin él, nadie puede relacionar la
                  sugerencia con ninguna identidad.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
