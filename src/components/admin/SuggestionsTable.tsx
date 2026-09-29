"use client";

import {
  Camera,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
  MessageSquare,
} from "lucide-react";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ShiftBadge } from "@/components/common/ShiftBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getCategoryLabel } from "@/components/suggestion/CategorySelector";
import type { SuggestionWithResponse } from "@/components/admin/SuggestionDetailModal";
import { formatPeruvianDateTime } from "@/lib/utils/exportReport";

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface SuggestionsTableProps {
  suggestions: SuggestionWithResponse[];
  onSelectSuggestion: (suggestion: SuggestionWithResponse) => void;
  onResetFilters?: () => void;
  pagination?: PaginationInfo;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
}

/**
 * Issue 8.3 & 10.3 — SuggestionsTable
 *
 * Adaptive view for moderation inbox:
 * - Desktop: Detailed data table with sticky headers, clear typography, and action triggers.
 * - Mobile: Compact card list designed for quick touch navigation.
 * - Server-Side Pagination: Accessible page controls (15, 30, 50 rows per page),
 *   page buttons, previous/next buttons and total record calculations.
 * - Conforms to Section 4.5 of Crimson Heritage: rounded-2xl, shadow-sm, and tokenized badges.
 */
export function SuggestionsTable({
  suggestions,
  onSelectSuggestion,
  onResetFilters,
  pagination,
  onPageChange,
  onPageSizeChange,
}: SuggestionsTableProps) {
  if (suggestions.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-gray/20 bg-white p-8 shadow-sm">
        <EmptyState
          icon={FileQuestion}
          title="Sin sugerencias coincidentes"
          description="No se encontraron sugerencias que coincidan con los filtros aplicados. Intenta cambiar los criterios de búsqueda o el turno seleccionado."
          variant="plain"
          action={
            onResetFilters
              ? {
                  label: "Limpiar Filtros",
                  onClick: onResetFilters,
                }
              : undefined
          }
        />
      </div>
    );
  }

  // Calculate page bounds
  const currentPage = pagination?.currentPage ?? 1;
  const pageSize = pagination?.pageSize ?? 15;
  const totalCount = pagination?.totalCount ?? suggestions.length;
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  // Generate visible page numbers
  const pageNumbers: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push("ellipsis");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }

    if (currentPage < totalPages - 2) pageNumbers.push("ellipsis");
    pageNumbers.push(totalPages);
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-neutral-gray/20 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-900">
            <thead className="border-b border-neutral-gray/20 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-neutral-gray">
              <tr>
                <th scope="col" className="px-4 py-3.5">
                  Fecha / Hora
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Ticket
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Turno
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Categoría
                </th>
                <th scope="col" className="px-4 py-3.5 max-w-xs">
                  Observación
                </th>
                <th scope="col" className="px-3 py-3.5 text-center">
                  Evidencia
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-gray/15">
              {suggestions.map((item) => {
                const hasPhoto = Boolean(item.photo_url);
                const hasResponse = Boolean(
                  item.latest_response ||
                    (item.responses && item.responses.length > 0),
                );

                return (
                  <tr
                    key={item.id}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    {/* Fecha / Hora */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-neutral-gray">
                      {formatPeruvianDateTime(item.created_at)}
                    </td>

                    {/* Ticket Code */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-primary">
                        {item.ticket_code ?? "S/C"}
                      </span>
                    </td>

                    {/* Turno */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <ShiftBadge shift={item.shift} size="sm" />
                    </td>

                    {/* Categoría */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <Badge variant="outline" size="sm">
                        {getCategoryLabel(item.category)}
                      </Badge>
                    </td>

                    {/* Extracto de Mensaje */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <p
                        className="line-clamp-2 text-xs text-gray-700 leading-relaxed"
                        title={item.message}
                      >
                        {item.message}
                      </p>
                      {hasResponse && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                          <MessageSquare className="h-3 w-3" />
                          Con respuesta oficial
                        </span>
                      )}
                    </td>

                    {/* Evidencia Fotográfica */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-center">
                      {hasPhoto ? (
                        <span
                          className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-1.5 text-primary"
                          title="Contiene fotografía adjunta"
                        >
                          <Camera className="h-4 w-4" />
                          <span className="sr-only">Foto adjunta</span>
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-gray/50">—</span>
                      )}
                    </td>

                    {/* Estado Actual */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <StatusBadge status={item.status} size="sm" />
                    </td>

                    {/* Botón de Acción */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectSuggestion(item)}
                        rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                        className="text-xs"
                      >
                        Gestionar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {suggestions.map((item) => {
          const hasPhoto = Boolean(item.photo_url);
          const hasResponse = Boolean(
            item.latest_response ||
              (item.responses && item.responses.length > 0),
          );

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-neutral-gray/20 bg-white p-4 shadow-sm space-y-3 transition-shadow hover:shadow-md"
            >
              {/* Header: Ticket + Status + Date */}
              <div className="flex items-center justify-between border-b border-neutral-gray/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">
                    #{item.ticket_code ?? "S/C"}
                  </span>
                  {hasPhoto && (
                    <span
                      className="rounded bg-primary/10 p-1 text-primary"
                      title="Tiene fotografía"
                    >
                      <Camera className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <StatusBadge status={item.status} size="sm" />
              </div>

              {/* Subheader: Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <ShiftBadge shift={item.shift} size="sm" />
                <Badge variant="outline" size="sm">
                  {getCategoryLabel(item.category)}
                </Badge>
                <span className="text-[11px] text-neutral-gray ml-auto">
                  {formatPeruvianDateTime(item.created_at)}
                </span>
              </div>

              {/* Message */}
              <p className="line-clamp-3 text-xs leading-relaxed text-gray-800">
                {item.message}
              </p>

              {hasResponse && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Respuesta institucional registrada</span>
                </div>
              )}

              {/* Action */}
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => onSelectSuggestion(item)}
                rightIcon={<ChevronRight className="h-4 w-4" />}
                className="text-xs"
              >
                Gestionar Caso
              </Button>
            </div>
          );
        })}
      </div>

      {/* Issue 10.3: Accessible Server-Side Pagination Bar */}
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-neutral-gray/20 bg-white px-4 py-3 shadow-sm text-xs text-neutral-gray">
          {/* Record range & page size selector */}
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Mostrando <strong>{totalCount === 0 ? 0 : startRecord}</strong> a{" "}
              <strong>{endRecord}</strong> de <strong>{totalCount}</strong>{" "}
              sugerencias
            </span>

            {onPageSizeChange && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-gray/20">
                <label htmlFor="page-size-select" className="text-gray-700 font-medium">
                  Filas:
                </label>
                <select
                  id="page-size-select"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="rounded-lg border border-neutral-gray/30 bg-slate-50 px-2 py-1 text-xs font-semibold text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Filas por página"
                >
                  <option value={15}>15 por pág.</option>
                  <option value={30}>30 por pág.</option>
                  <option value={50}>50 por pág.</option>
                </select>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <nav
            aria-label="Paginación de sugerencias"
            className="flex items-center gap-1.5"
          >
            {/* Previous Page */}
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-neutral-gray/25 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Page number chips */}
            <div className="flex items-center gap-1">
              {pageNumbers.map((p, idx) => {
                if (p === "ellipsis") {
                  return (
                    <span
                      key={`ell-${idx}`}
                      className="px-2 py-1 text-neutral-gray"
                    >
                      …
                    </span>
                  );
                }

                const isActive = p === currentPage;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange?.(p)}
                    aria-current={isActive ? "page" : undefined}
                    className={`min-w-8 h-8 rounded-xl px-2 text-xs font-bold transition-all ${
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : "border border-neutral-gray/20 text-gray-700 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-neutral-gray/25 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Página siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
