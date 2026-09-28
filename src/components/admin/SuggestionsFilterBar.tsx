"use client";

import {
  FileSpreadsheet,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/common/Button";
import { CATEGORY_OPTIONS } from "@/components/suggestion/CategorySelector";
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
}

export interface SuggestionsFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onExportExcel: () => void;
  onExportCsv?: () => void;
  totalFilteredCount: number;
  totalCount: number;
}

/**
 * Issue 8.3 & 8.6 — SuggestionsFilterBar
 *
 * Multi-dimensional filter bar for administrative moderation:
 * - Search by ticket code or keyword.
 * - Shift selector (Todos, Desayuno, Almuerzo, Cena).
 * - Category selector (Todas, Menú, Higiene, Porción, Atención, Infraestructura).
 * - Status selector (Todos, Pendientes, En revisión, Atendidos).
 * - Integrated client-side Excel export trigger (Issue 8.6).
 */
export function SuggestionsFilterBar({
  filters,
  onFilterChange,
  onExportExcel,
  totalFilteredCount,
  totalCount,
}: SuggestionsFilterBarProps) {
  const isFiltered =
    filters.shift !== "all" ||
    filters.category !== "all" ||
    filters.status !== "all" ||
    filters.searchQuery.trim() !== "";

  const handleResetFilters = () => {
    onFilterChange({
      shift: "all",
      category: "all",
      status: "all",
      searchQuery: "",
    });
  };

  return (
    <div className="rounded-2xl border border-neutral-gray/20 bg-white p-4 shadow-sm space-y-4">
      {/* Top row: Search input + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-gray">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) =>
              onFilterChange({ ...filters, searchQuery: e.target.value })
            }
            placeholder="Buscar por código (ej. UNSCH-7K4M) o texto…"
            className="block w-full rounded-xl border border-neutral-gray/30 bg-slate-50/50 py-2.5 pl-9 pr-8 text-sm text-gray-900 placeholder:text-neutral-gray shadow-xs focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, searchQuery: "" })}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-neutral-gray hover:text-gray-900"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Export and Reset Buttons */}
        <div className="flex items-center gap-2">
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              className="text-xs text-neutral-gray hover:text-primary"
            >
              Restablecer
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={onExportExcel}
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            className="text-xs"
            title="Exportar registros filtrados a formato Microsoft Excel (.xlsx)"
          >
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-neutral-gray/15 pt-3">
        {/* Filter: Shift */}
        <div className="space-y-1">
          <label
            htmlFor="filter-shift-select"
            className="block text-xs font-semibold text-gray-700"
          >
            Turno de Comedor:
          </label>
          <select
            id="filter-shift-select"
            value={filters.shift}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                shift: e.target.value as ShiftType | "all",
              })
            }
            className="block w-full rounded-xl border border-neutral-gray/30 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todos los turnos</option>
            {SHIFT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} ({opt.schedule})
              </option>
            ))}
          </select>
        </div>

        {/* Filter: Category */}
        <div className="space-y-1">
          <label
            htmlFor="filter-category-select"
            className="block text-xs font-semibold text-gray-700"
          >
            Categoría:
          </label>
          <select
            id="filter-category-select"
            value={filters.category}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                category: e.target.value as SuggestionCategory | "all",
              })
            }
            className="block w-full rounded-xl border border-neutral-gray/30 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todas las categorías</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter: Status */}
        <div className="space-y-1">
          <label
            htmlFor="filter-status-select"
            className="block text-xs font-semibold text-gray-700"
          >
            Estado del Ticket:
          </label>
          <select
            id="filter-status-select"
            value={filters.status}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                status: e.target.value as TicketStatus | "all",
              })
            }
            className="block w-full rounded-xl border border-neutral-gray/30 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="in_review">En revisión</option>
            <option value="resolved">Atendidos</option>
          </select>
        </div>
      </div>

      {/* Filter result feedback summary */}
      <div className="flex items-center justify-between text-xs text-neutral-gray pt-1">
        <span>
          Mostrando <strong>{totalFilteredCount}</strong> de{" "}
          <strong>{totalCount}</strong> sugerencias
        </span>
        {isFiltered && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            Filtros activos
          </span>
        )}
      </div>
    </div>
  );
}
