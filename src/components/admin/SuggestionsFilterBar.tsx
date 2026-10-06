"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Image as ImageIcon, RotateCcw, Search, X } from "lucide-react";

import {
  CATEGORY_DISPLAY,
  CATEGORY_FILTER_ORDER,
} from "@/components/admin/inboxLabels";
import { SHIFT_OPTIONS } from "@/components/suggestion/ShiftSelector";
import type {
  ShiftType,
  SuggestionCategory,
  TicketStatus,
} from "@/types/database.types";

export interface FilterState {
  shift: ShiftType | "all";
  category: SuggestionCategory | "all";
  status: TicketStatus | "all";
  searchQuery: string;
  hasPhoto: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  shift: "all",
  category: "all",
  status: "all",
  searchQuery: "",
  hasPhoto: false,
};

export interface SuggestionsFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  totalFilteredCount: number;
  totalCount: number;
  /** Unreviewed hygiene reports; highlights the hygiene chip when above zero. */
  pendingHygiene: number;
}

const SEARCH_DEBOUNCE_MS = 300;

function FilterChip({
  isActive,
  onClick,
  children,
  activeClasses = "border-primary bg-primary text-white",
  idleClasses = "border-neutral-gray/25 bg-white text-gray-700 hover:bg-slate-50",
}: {
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
  activeClasses?: string;
  idleClasses?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        isActive ? activeClasses : idleClasses
      }`}
    >
      {children}
    </button>
  );
}

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={`Filtrar por ${label.toLowerCase()}`} className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-bold uppercase tracking-wider text-neutral-gray">
        {label}
      </span>
      {/* Chips scroll sideways on narrow screens instead of wrapping into tall blocks. */}
      <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-1 sm:flex-wrap sm:overflow-visible">
        {children}
      </div>
    </div>
  );
}

/**
 * Control toolbar of the inspection inbox:
 * - Search by ticket code (UNSCH-XXXX) or free text, debounced.
 * - One-tap chips for shift, category and status.
 * - Toggle for reports that carry photographic evidence.
 */
export function SuggestionsFilterBar({
  filters,
  onFilterChange,
  totalFilteredCount,
  totalCount,
  pendingHygiene,
}: SuggestionsFilterBarProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery);
  const [prevSearchQuery, setPrevSearchQuery] = useState(filters.searchQuery);

  // Follow external changes (reset, back/forward navigation) without an effect.
  if (filters.searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(filters.searchQuery);
    setSearchTerm(filters.searchQuery);
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== filters.searchQuery) {
        onFilterChange({ ...filters, searchQuery: searchTerm });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handler);
  }, [searchTerm, filters, onFilterChange]);

  const isFiltered =
    filters.shift !== "all" ||
    filters.category !== "all" ||
    filters.status !== "all" ||
    filters.hasPhoto ||
    searchTerm.trim() !== "";

  const handleReset = () => {
    setSearchTerm("");
    onFilterChange(EMPTY_FILTERS);
  };

  const isHygieneCritical = pendingHygiene > 0;

  return (
    <section
      aria-label="Búsqueda y filtros"
      className="space-y-3 rounded-2xl border border-neutral-gray/20 bg-white p-3 shadow-sm sm:p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-gray"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onFilterChange({ ...filters, searchQuery: searchTerm });
              }
            }}
            aria-label="Buscar por código de ticket o por texto"
            placeholder="Buscar código (UNSCH-7K4M) o texto del reporte"
            className="block min-h-11 w-full rounded-xl border border-neutral-gray/30 bg-slate-50/60 pl-9 pr-10 text-sm text-gray-900 placeholder:text-neutral-gray focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                onFilterChange({ ...filters, searchQuery: "" });
              }}
              aria-label="Limpiar búsqueda"
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-gray hover:text-gray-900"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={filters.hasPhoto}
          onClick={() => onFilterChange({ ...filters, hasPhoto: !filters.hasPhoto })}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            filters.hasPhoto
              ? "border-primary bg-primary/5 text-primary"
              : "border-neutral-gray/30 bg-white text-gray-700 hover:bg-slate-50"
          }`}
        >
          <ImageIcon aria-hidden="true" className="size-4" />
          Solo con evidencia fotográfica
          <span
            aria-hidden="true"
            className={`relative ml-1 h-5 w-9 rounded-full transition-colors ${
              filters.hasPhoto ? "bg-primary" : "bg-neutral-gray/30"
            }`}
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${
                filters.hasPhoto ? "left-[1.125rem]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </div>

      <div className="space-y-1 border-t border-neutral-gray/15 pt-2">
        <ChipGroup label="Turno">
          <FilterChip
            isActive={filters.shift === "all"}
            onClick={() => onFilterChange({ ...filters, shift: "all" })}
          >
            Todos
          </FilterChip>
          {SHIFT_OPTIONS.map((option) => (
            <FilterChip
              key={option.id}
              isActive={filters.shift === option.id}
              onClick={() => onFilterChange({ ...filters, shift: option.id })}
            >
              {option.label}
            </FilterChip>
          ))}
        </ChipGroup>

        <ChipGroup label="Categoría">
          <FilterChip
            isActive={filters.category === "all"}
            onClick={() => onFilterChange({ ...filters, category: "all" })}
          >
            Todas
          </FilterChip>
          {CATEGORY_FILTER_ORDER.map((category) => {
            const isCritical = category === "hygiene" && isHygieneCritical;
            return (
              <FilterChip
                key={category}
                isActive={filters.category === category}
                onClick={() => onFilterChange({ ...filters, category })}
                idleClasses={
                  isCritical
                    ? "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
                    : undefined
                }
              >
                {isCritical && <AlertTriangle aria-hidden="true" className="size-3.5" />}
                {CATEGORY_DISPLAY[category].label}
                {isCritical && (
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-bold ${
                      filters.category === category ? "bg-white text-primary" : "bg-primary text-white"
                    }`}
                  >
                    {pendingHygiene}
                    <span className="sr-only"> pendientes de higiene</span>
                  </span>
                )}
              </FilterChip>
            );
          })}
        </ChipGroup>

        <ChipGroup label="Estado">
          <FilterChip
            isActive={filters.status === "all"}
            onClick={() => onFilterChange({ ...filters, status: "all" })}
          >
            Todos
          </FilterChip>
          <FilterChip
            isActive={filters.status === "pending"}
            onClick={() => onFilterChange({ ...filters, status: "pending" })}
            activeClasses="border-amber-500 bg-amber-100 text-amber-900"
          >
            Pendientes
          </FilterChip>
          <FilterChip
            isActive={filters.status === "in_review"}
            onClick={() => onFilterChange({ ...filters, status: "in_review" })}
            activeClasses="border-tertiary bg-tertiary text-white"
          >
            En Revisión
          </FilterChip>
          <FilterChip
            isActive={filters.status === "resolved"}
            onClick={() => onFilterChange({ ...filters, status: "resolved" })}
            activeClasses="border-emerald-600 bg-emerald-600 text-white"
          >
            Atendidos
          </FilterChip>
        </ChipGroup>
      </div>

      <div className="flex min-h-9 items-center justify-between gap-3 text-xs text-neutral-gray">
        <span aria-live="polite">
          <strong className="text-gray-900">{totalFilteredCount}</strong>{" "}
          {isFiltered ? `de ${totalCount} reportes coinciden` : "reportes en total"}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Restablecer filtros
          </button>
        )}
      </div>
    </section>
  );
}
