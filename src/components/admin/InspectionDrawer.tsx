"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, FileText, Maximize2, X } from "lucide-react";

import { EvidenceLightbox } from "@/components/admin/EvidenceLightbox";
import { CATEGORY_DISPLAY } from "@/components/admin/inboxLabels";
import { OfficialResponseEditor } from "@/components/admin/OfficialResponseEditor";
import { StatusQuickSelect } from "@/components/admin/StatusQuickSelect";
import { TicketCodeCopy } from "@/components/admin/TicketCodeCopy";
import { Drawer } from "@/components/common/Drawer";
import { ShiftBadge } from "@/components/common/ShiftBadge";
import { getCategoryLabel } from "@/components/suggestion/CategorySelector";
import { getShiftSchedule } from "@/components/suggestion/ShiftSelector";
import { formatLimaDateAndTime } from "@/lib/utils/exportReport";
import type {
  SuggestionRow,
  TicketResponseRow,
  TicketStatus,
} from "@/types/database.types";

export interface SuggestionWithResponse extends SuggestionRow {
  latest_response?: TicketResponseRow | null;
  responses?: TicketResponseRow[];
}

export interface InspectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: SuggestionWithResponse | null;
  onStatusChange: (
    suggestionId: string,
    newStatus: TicketStatus,
    updatedRow: SuggestionRow,
  ) => void;
  onResponseSaved: (
    savedResponse: TicketResponseRow,
    updatedSuggestion: SuggestionRow,
  ) => void;
}

const TITLE_ID = "inspection-drawer-title";

/**
 * Inspection and resolution panel for a single report. It opens over the
 * inbox without leaving the page: full detail, zoomable evidence, status
 * control and the official response editor.
 */
export function InspectionDrawer({
  isOpen,
  onClose,
  suggestion,
  onStatusChange,
  onResponseSaved,
}: InspectionDrawerProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const registered = formatLimaDateAndTime(suggestion?.created_at);
  const ticketCode = suggestion?.ticket_code ?? "S/C";

  return (
    <Drawer isOpen={isOpen && suggestion !== null} onClose={onClose} labelledBy={TITLE_ID}>
      {suggestion && (
        <>
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="min-w-0 space-y-1">
              <h2 id={TITLE_ID} className="text-xs font-bold uppercase tracking-wider text-neutral-gray">
                Inspección del reporte
              </h2>
              <TicketCodeCopy code={suggestion.ticket_code} className="text-base" />
              <p className="text-xs text-neutral-gray">
                Registrado el {registered.date} a las {registered.time} (hora de Lima)
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar inspección"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-neutral-gray transition-colors hover:bg-neutral-gray/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            {/* Classification and status */}
            <div className="flex flex-wrap items-center gap-2">
              <ShiftBadge shift={suggestion.shift} />
              <span className="text-[11px] text-neutral-gray">
                {getShiftSchedule(suggestion.shift)}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${CATEGORY_DISPLAY[suggestion.category].tone}`}
              >
                {getCategoryLabel(suggestion.category)}
              </span>
              <span className="ml-auto">
                <StatusQuickSelect
                  suggestionId={suggestion.id}
                  ticketCode={suggestion.ticket_code}
                  status={suggestion.status}
                  onStatusChange={onStatusChange}
                  size="md"
                />
              </span>
            </div>

            {/* Full report text */}
            <section aria-labelledby="inspection-message-title" className="space-y-2">
              <h3
                id="inspection-message-title"
                className="flex items-center gap-1.5 text-xs font-bold text-gray-800"
              >
                <FileText aria-hidden="true" className="size-4 text-primary" />
                Observación del comensal
              </h3>
              <p className="whitespace-pre-wrap break-words rounded-xl border border-neutral-gray/20 bg-white p-4 text-sm leading-relaxed text-gray-900 shadow-sm">
                {suggestion.message}
              </p>
            </section>

            {/* Evidence viewer */}
            <section aria-labelledby="inspection-evidence-title" className="space-y-2">
              <h3
                id="inspection-evidence-title"
                className="flex items-center gap-1.5 text-xs font-bold text-gray-800"
              >
                <Camera aria-hidden="true" className="size-4 text-primary" />
                Evidencia fotográfica
              </h3>
              {suggestion.photo_url ? (
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  aria-label="Ampliar la evidencia fotográfica"
                  className="group relative block w-full overflow-hidden rounded-xl border border-neutral-gray/25 bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Image
                    src={suggestion.photo_url}
                    alt={`Evidencia fotográfica del ticket ${ticketCode}`}
                    width={1200}
                    height={900}
                    sizes="(max-width: 640px) 100vw, 576px"
                    className="mx-auto h-auto max-h-80 w-auto max-w-full object-contain"
                  />
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white">
                    <Maximize2 aria-hidden="true" className="size-3.5" />
                    Ampliar
                  </span>
                </button>
              ) : (
                <p className="rounded-xl border border-dashed border-neutral-gray/30 bg-white px-4 py-3 text-xs text-neutral-gray">
                  Este reporte no incluye fotografía.
                </p>
              )}
            </section>

            <div className="border-t border-gray-200 pt-5">
              <OfficialResponseEditor
                key={suggestion.id}
                suggestionId={suggestion.id}
                ticketCode={ticketCode}
                existingResponse={suggestion.latest_response ?? null}
                onResponseSaved={onResponseSaved}
              />
            </div>
          </div>

          {suggestion.photo_url && (
            <EvidenceLightbox
              isOpen={isLightboxOpen}
              onClose={() => setIsLightboxOpen(false)}
              imageUrl={suggestion.photo_url}
              ticketCode={ticketCode}
            />
          )}
        </>
      )}
    </Drawer>
  );
}
