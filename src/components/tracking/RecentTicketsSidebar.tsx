"use client";

import { ChevronRight, Clock, Trash2 } from "lucide-react";

import { useRecentTickets } from "@/lib/hooks/useRecentTickets";

export interface RecentTicketsSidebarProps {
  /** Called when the user clicks a recent ticket code to search it. */
  onSelect: (code: string) => void;
  /** The currently displayed code (to highlight the active entry). */
  activeCode?: string;
  className?: string;
}

/**
 * Issue 7.5 — RecentTicketsSidebar
 * Shows the list of ticket codes the user has previously submitted or searched,
 * persisted in localStorage. Renders as a stacked card list suitable for a
 * sidebar or inline below the search bar on mobile.
 *
 * SSR-safe: shows nothing until hydrated (prevents flash of stale content).
 */
export function RecentTicketsSidebar({
  onSelect,
  activeCode,
  className = "",
}: RecentTicketsSidebarProps) {
  const {
    recentTickets,
    isHydrated,
    removeRecentTicket,
    clearRecentTickets,
  } = useRecentTickets();

  // During SSR / pre-hydration avoid a content mismatch.
  if (!isHydrated || recentTickets.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Tickets recientes"
      className={`min-w-0 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="size-3.5 text-neutral-gray" aria-hidden="true" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-gray">
            Consultados recientemente
          </h2>
        </div>

        <button
          type="button"
          onClick={clearRecentTickets}
          aria-label="Borrar historial de tickets recientes"
          className="text-[11px] font-semibold text-neutral-gray underline underline-offset-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
        >
          Borrar todo
        </button>
      </div>

      {/* List */}
      <ul className="divide-y divide-gray-50" role="list">
        {recentTickets.map((code) => {
          const isActive = code === activeCode;

          return (
            <li key={code} className="flex items-center gap-0">
              {/* Select button */}
              <button
                type="button"
                onClick={() => onSelect(code)}
                aria-current={isActive ? "true" : undefined}
                className={[
                  "flex min-h-11 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
                  isActive
                    ? "bg-primary/5 font-bold text-primary"
                    : "text-gray-700 hover:bg-gray-50 hover:text-primary",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="font-mono text-sm tracking-wider">
                  {code}
                </span>
                {isActive && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary">
                    Activo
                  </span>
                )}
                {!isActive && (
                  <ChevronRight
                    className="ml-auto size-3.5 shrink-0 text-neutral-gray"
                    aria-hidden="true"
                  />
                )}
              </button>

              {/* Remove from history */}
              <button
                type="button"
                onClick={() => removeRecentTicket(code)}
                aria-label={`Eliminar ${code} del historial`}
                className="flex size-11 shrink-0 items-center justify-center text-neutral-gray transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
