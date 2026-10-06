"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download } from "lucide-react";

import {
  DashboardMetricsCards,
  type DashboardMetrics,
} from "@/components/admin/DashboardMetricsCards";
import {
  InspectionDrawer,
  type SuggestionWithResponse,
} from "@/components/admin/InspectionDrawer";
import {
  EMPTY_FILTERS,
  SuggestionsFilterBar,
  type FilterState,
} from "@/components/admin/SuggestionsFilterBar";
import {
  SuggestionsTable,
  type PaginationInfo,
} from "@/components/admin/SuggestionsTable";
import { AlertBanner } from "@/components/common/AlertBanner";
import { fetchSuggestionsReport } from "@/lib/actions/adminActions";
import { EXPORT_ROW_LIMIT } from "@/lib/utils/adminExport";
import type {
  SuggestionRow,
  TicketResponseRow,
  TicketStatus,
} from "@/types/database.types";

export interface AdminDashboardViewProps {
  initialSuggestions: SuggestionWithResponse[];
  serverMetrics: DashboardMetrics;
  serverPagination: PaginationInfo;
  initialFilters: FilterState;
}

type ExportFormat = "xlsx" | "csv";

const exportButtonClasses =
  "inline-flex min-h-11 items-center justify-center gap-1.5 px-3.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 disabled:cursor-wait disabled:opacity-60";

/**
 * Orchestrator of the JVC inspection console:
 * - Filters, search and pagination live in the URL, so a view can be shared
 *   between inspectors (/admin?status=pending&category=hygiene&photo=1).
 * - KPI strip, control toolbar, adaptive inbox and the inspection drawer.
 * - Excel / CSV export of every report matching the active filters.
 */
export function AdminDashboardView({
  initialSuggestions,
  serverMetrics,
  serverPagination,
  initialFilters,
}: AdminDashboardViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // Rows changed in this session, overlaid on the server page until it refreshes
  const [localUpdates, setLocalUpdates] = useState<
    Record<string, Partial<SuggestionWithResponse>>
  >({});
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<SuggestionWithResponse | null>(null);

  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportNotice, setExportNotice] = useState<{
    variant: "error" | "info";
    text: string;
  } | null>(null);

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [prevInitialFilters, setPrevInitialFilters] = useState(initialFilters);
  if (initialFilters !== prevInitialFilters) {
    setPrevInitialFilters(initialFilters);
    setFilters(initialFilters);
  }

  const { pageSize } = serverPagination;

  const suggestions = useMemo(
    () =>
      initialSuggestions.map((item) => {
        const update = localUpdates[item.id];
        return update ? { ...item, ...update } : item;
      }),
    [initialSuggestions, localUpdates],
  );

  const pushUrlState = useCallback(
    (newFilters: FilterState, newPage: number, newPageSize: number) => {
      const params = new URLSearchParams();

      if (newPage > 1) params.set("page", String(newPage));
      if (newPageSize !== 15) params.set("pageSize", String(newPageSize));
      if (newFilters.shift !== "all") params.set("shift", newFilters.shift);
      if (newFilters.category !== "all") params.set("category", newFilters.category);
      if (newFilters.status !== "all") params.set("status", newFilters.status);
      if (newFilters.hasPhoto) params.set("photo", "1");
      if (newFilters.searchQuery.trim() !== "") {
        params.set("search", newFilters.searchQuery.trim());
      }

      const queryString = params.toString();
      startTransition(() => {
        router.push(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  const handleFilterChange = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      pushUrlState(newFilters, 1, pageSize);
    },
    [pageSize, pushUrlState],
  );

  const handleStatusChange = (
    suggestionId: string,
    newStatus: TicketStatus,
    updatedRow: SuggestionRow,
  ) => {
    setLocalUpdates((prev) => ({
      ...prev,
      [suggestionId]: { ...prev[suggestionId], ...updatedRow, status: newStatus },
    }));
    setSelectedSuggestion((prev) =>
      prev?.id === suggestionId ? { ...prev, ...updatedRow, status: newStatus } : prev,
    );
  };

  const handleResponseSaved = (
    savedResponse: TicketResponseRow,
    updatedSuggestion: SuggestionRow,
  ) => {
    const withResponse = { ...updatedSuggestion, latest_response: savedResponse };

    setLocalUpdates((prev) => ({
      ...prev,
      [updatedSuggestion.id]: { ...prev[updatedSuggestion.id], ...withResponse },
    }));
    setSelectedSuggestion((prev) =>
      prev?.id === updatedSuggestion.id ? { ...prev, ...withResponse } : prev,
    );
  };

  const handleExport = async (format: ExportFormat) => {
    if (exportingFormat) return;

    setExportNotice(null);
    setExportingFormat(format);

    try {
      const result = await fetchSuggestionsReport({
        shift: filters.shift,
        category: filters.category,
        status: filters.status,
        search: filters.searchQuery,
        hasPhoto: filters.hasPhoto,
      });

      if (!result.success || !result.data) {
        setExportNotice({
          variant: "error",
          text: result.error ?? "No se pudo preparar el reporte.",
        });
        return;
      }

      if (result.data.length === 0) {
        setExportNotice({
          variant: "info",
          text: "No hay reportes que exportar con los filtros actuales.",
        });
        return;
      }

      // The spreadsheet library is only downloaded when a report is requested.
      const { exportSuggestionsToCsv, exportSuggestionsToExcel } = await import(
        "@/lib/utils/exportReport"
      );
      if (format === "xlsx") exportSuggestionsToExcel(result.data);
      else exportSuggestionsToCsv(result.data);

      if (result.data.length >= EXPORT_ROW_LIMIT) {
        setExportNotice({
          variant: "info",
          text: `El reporte incluye los ${EXPORT_ROW_LIMIT.toLocaleString("es-PE")} registros más recientes. Acota los filtros para exportar el resto.`,
        });
      }
    } catch {
      setExportNotice({ variant: "error", text: "No se pudo generar el archivo del reporte." });
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title and report export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
            Consola de Fiscalización
          </h1>
          <p className="text-xs text-neutral-gray sm:text-sm">
            Junta de Vigilancia del Comedor Universitario (JVC) · reportes anónimos de los comensales
          </p>
        </div>

        <div
          role="group"
          aria-label="Exportar los reportes filtrados"
          className="flex shrink-0 items-stretch overflow-hidden rounded-xl border border-primary/30 bg-white shadow-sm"
        >
          <span className="flex items-center gap-1.5 bg-primary px-3 text-xs font-bold text-white">
            <Download aria-hidden="true" className="size-4" />
            Exportar
          </span>
          <button
            type="button"
            onClick={() => handleExport("xlsx")}
            disabled={exportingFormat !== null}
            className={`${exportButtonClasses} flex-1 text-primary hover:bg-primary/5`}
          >
            {exportingFormat === "xlsx" ? "Generando…" : "Excel"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={exportingFormat !== null}
            className={`${exportButtonClasses} flex-1 border-l border-primary/20 text-primary hover:bg-primary/5`}
          >
            {exportingFormat === "csv" ? "Generando…" : "CSV"}
          </button>
        </div>
      </div>

      {exportNotice && (
        <AlertBanner
          variant={exportNotice.variant}
          description={exportNotice.text}
          onClose={() => setExportNotice(null)}
        />
      )}

      <DashboardMetricsCards
        metrics={serverMetrics}
        activeStatus={filters.status}
        onSelectStatus={(status) => handleFilterChange({ ...filters, status })}
      />

      <SuggestionsFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        totalFilteredCount={serverPagination.totalCount}
        totalCount={serverMetrics.total}
        pendingHygiene={serverMetrics.pendingHygiene}
      />

      <SuggestionsTable
        suggestions={suggestions}
        onSelectSuggestion={setSelectedSuggestion}
        onStatusChange={handleStatusChange}
        onResetFilters={() => handleFilterChange(EMPTY_FILTERS)}
        pagination={serverPagination}
        onPageChange={(newPage) => pushUrlState(filters, newPage, pageSize)}
        onPageSizeChange={(newPageSize) => pushUrlState(filters, 1, newPageSize)}
      />

      <InspectionDrawer
        isOpen={selectedSuggestion !== null}
        onClose={() => setSelectedSuggestion(null)}
        suggestion={selectedSuggestion}
        onStatusChange={handleStatusChange}
        onResponseSaved={handleResponseSaved}
      />
    </div>
  );
}
