"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileQuestion,
  MessageSquare,
  ZoomIn,
} from "lucide-react";

import { EvidenceLightbox } from "@/components/admin/EvidenceLightbox";
import { CATEGORY_DISPLAY } from "@/components/admin/inboxLabels";
import type { SuggestionWithResponse } from "@/components/admin/InspectionDrawer";
import { StatusQuickSelect } from "@/components/admin/StatusQuickSelect";
import { TicketCodeCopy } from "@/components/admin/TicketCodeCopy";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ShiftBadge } from "@/components/common/ShiftBadge";
import { getCategoryLabel } from "@/components/suggestion/CategorySelector";
import { formatLimaDateAndTime } from "@/lib/utils/exportReport";
import type { SuggestionCategory, SuggestionRow, TicketStatus } from "@/types/database.types";

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface SuggestionsTableProps {
  suggestions: SuggestionWithResponse[];
  onSelectSuggestion: (suggestion: SuggestionWithResponse) => void;
  onStatusChange: (suggestionId: string, status: TicketStatus, updatedRow: SuggestionRow) => void;
  onResetFilters: () => void;
  pagination: PaginationInfo;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
}

function CategoryBadge({ category }: { category: SuggestionCategory }) {
  const display = CATEGORY_DISPLAY[category];
  return (
    <span
      title={getCategoryLabel(category)}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${display.tone}`}
    >
      {display.label}
    </span>
  );
}

function EvidenceThumbnail({
  item,
  onOpen,
}: {
  item: SuggestionWithResponse;
  onOpen: (item: SuggestionWithResponse) => void;
}) {
  if (!item.photo_url) {
    return <span className="text-xs text-neutral-gray/50">—</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      aria-label={`Ampliar la evidencia del reporte ${item.ticket_code ?? "sin código"}`}
      className="group relative block size-12 shrink-0 overflow-hidden rounded-lg border border-neutral-gray/25 bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Image
        src={item.photo_url}
        alt=""
        width={48}
        height={48}
        className="size-full object-cover"
      />
      <span className="absolute inset-x-0 bottom-0 bg-black/65 text-center text-[9px] font-bold leading-4 text-white">
        FOTO
      </span>
      <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex">
        <ZoomIn aria-hidden="true" className="size-4" />
      </span>
    </button>
  );
}

function hasOfficialResponse(item: SuggestionWithResponse): boolean {
  return Boolean(item.latest_response);
}

/**
 * Inspection inbox.
 * - Desktop: dense table (code and time, shift and category, excerpt,
 *   evidence thumbnail, status selector, review action).
 * - Mobile: one card per report, sized for touch use inside the dining hall.
 * - Server-side pagination controls (15, 30 or 50 rows).
 */
export function SuggestionsTable({
  suggestions,
  onSelectSuggestion,
  onStatusChange,
  onResetFilters,
  pagination,
  onPageChange,
  onPageSizeChange,
}: SuggestionsTableProps) {
  const [lightboxItem, setLightboxItem] = useState<SuggestionWithResponse | null>(null);

  if (suggestions.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-gray/20 bg-white p-8 shadow-sm">
        <EmptyState
          icon={FileQuestion}
          title="Sin reportes coincidentes"
          description="Ningún reporte coincide con la búsqueda y los filtros aplicados."
          variant="plain"
          action={{ label: "Limpiar filtros", onClick: onResetFilters }}
        />
      </div>
    );
  }

  const { currentPage, pageSize, totalCount, totalPages } = pagination;
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  // Visible page numbers, collapsing long ranges around the current page
  const pageNumbers: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (currentPage < totalPages - 2) pageNumbers.push("ellipsis");
    pageNumbers.push(totalPages);
  }

  return (
    <div className="space-y-3">
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-neutral-gray/20 bg-white shadow-sm lg:block">
        <table className="w-full table-fixed text-left text-sm text-gray-900">
          <colgroup>
            <col className="w-[9.5rem]" />
            <col className="w-[8.5rem]" />
            <col />
            <col className="w-[5.5rem]" />
            <col className="w-[9.5rem]" />
            <col className="w-[11.5rem]" />
          </colgroup>
          <thead className="border-b border-neutral-gray/20 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-neutral-gray">
            <tr>
              <th scope="col" className="px-4 py-2.5">Código y fecha</th>
              <th scope="col" className="px-3 py-2.5">Turno y categoría</th>
              <th scope="col" className="px-3 py-2.5">Observación</th>
              <th scope="col" className="px-3 py-2.5">Evidencia</th>
              <th scope="col" className="px-3 py-2.5">Estado</th>
              <th scope="col" className="px-4 py-2.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-gray/15">
            {suggestions.map((item) => {
              const registered = formatLimaDateAndTime(item.created_at);

              return (
                <tr key={item.id} className="align-top transition-colors hover:bg-slate-50/80">
                  <td className="px-4 py-2.5">
                    <TicketCodeCopy code={item.ticket_code} />
                    <p className="mt-0.5 text-[11px] leading-tight text-neutral-gray">
                      <span className="font-semibold text-gray-700">{registered.time}</span>
                      <span aria-hidden="true"> · </span>
                      {registered.date}
                    </p>
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex flex-col items-start gap-1">
                      <ShiftBadge shift={item.shift} size="sm" className="!px-2 !py-0.5 !text-[11px] !shadow-none" />
                      <CategoryBadge category={item.category} />
                    </div>
                  </td>

                  <td className="px-3 py-2.5">
                    <p className="line-clamp-2 break-words text-xs leading-relaxed text-gray-800" title={item.message}>
                      {item.message}
                    </p>
                    {hasOfficialResponse(item) && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                        <MessageSquare aria-hidden="true" className="size-3" />
                        Con respuesta oficial
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2.5">
                    <EvidenceThumbnail item={item} onOpen={setLightboxItem} />
                  </td>

                  <td className="px-3 py-2.5">
                    <StatusQuickSelect
                      suggestionId={item.id}
                      ticketCode={item.ticket_code}
                      status={item.status}
                      onStatusChange={onStatusChange}
                    />
                  </td>

                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onSelectSuggestion(item)}
                      leftIcon={<ClipboardCheck />}
                      className="whitespace-nowrap text-xs"
                    >
                      Revisar / Responder
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile and tablet cards */}
      <ul className="space-y-3 lg:hidden">
        {suggestions.map((item) => {
          const registered = formatLimaDateAndTime(item.created_at);

          return (
            <li
              key={item.id}
              className="space-y-3 rounded-xl border border-neutral-gray/20 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <TicketCodeCopy code={item.ticket_code} className="text-sm" />
                  <p className="mt-0.5 text-[11px] text-neutral-gray">
                    <span className="font-semibold text-gray-700">{registered.time}</span>
                    <span aria-hidden="true"> · </span>
                    {registered.date}
                  </p>
                </div>
                <StatusQuickSelect
                  suggestionId={item.id}
                  ticketCode={item.ticket_code}
                  status={item.status}
                  onStatusChange={onStatusChange}
                />
              </div>

              <div className="flex gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ShiftBadge shift={item.shift} size="sm" className="!px-2 !py-0.5 !text-[11px] !shadow-none" />
                    <CategoryBadge category={item.category} />
                  </div>
                  <p className="line-clamp-3 break-words text-sm leading-relaxed text-gray-800">
                    {item.message}
                  </p>
                </div>
                {item.photo_url && <EvidenceThumbnail item={item} onOpen={setLightboxItem} />}
              </div>

              {hasOfficialResponse(item) && (
                <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <MessageSquare aria-hidden="true" className="size-3.5" />
                  Con respuesta oficial
                </p>
              )}

              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => onSelectSuggestion(item)}
                leftIcon={<ClipboardCheck />}
              >
                Revisar / Responder
              </Button>
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-neutral-gray/20 bg-white px-4 py-2.5 text-xs text-neutral-gray shadow-sm sm:flex-row">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span>
            <strong className="text-gray-900">{startRecord}</strong>–
            <strong className="text-gray-900">{endRecord}</strong> de{" "}
            <strong className="text-gray-900">{totalCount}</strong> reportes
          </span>

          <label className="flex items-center gap-1.5 border-l border-neutral-gray/20 pl-3 font-medium text-gray-700">
            Filas
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-lg border border-neutral-gray/30 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>

        <nav aria-label="Paginación de reportes" className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Página anterior"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-neutral-gray/25 text-gray-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>

          {pageNumbers.map((pageNumber, index) =>
            pageNumber === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-1 text-neutral-gray">
                …
              </span>
            ) : (
              <button
                key={pageNumber}
                type="button"
                onClick={() => onPageChange(pageNumber)}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                aria-label={`Página ${pageNumber}`}
                className={`size-9 rounded-lg text-xs font-bold transition-colors ${
                  pageNumber === currentPage
                    ? "bg-primary text-white"
                    : "border border-neutral-gray/20 text-gray-700 hover:bg-slate-100"
                }`}
              >
                {pageNumber}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Página siguiente"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-neutral-gray/25 text-gray-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </nav>
      </div>

      {lightboxItem?.photo_url && (
        <EvidenceLightbox
          isOpen
          onClose={() => setLightboxItem(null)}
          imageUrl={lightboxItem.photo_url}
          ticketCode={lightboxItem.ticket_code ?? "S/C"}
        />
      )}
    </div>
  );
}
