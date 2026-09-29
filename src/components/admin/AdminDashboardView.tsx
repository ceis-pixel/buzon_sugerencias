"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  DashboardMetricsCards,
  type DashboardMetrics,
} from "@/components/admin/DashboardMetricsCards";
import {
  SuggestionDetailModal,
  type SuggestionWithResponse,
} from "@/components/admin/SuggestionDetailModal";
import {
  SuggestionsFilterBar,
  type FilterState,
} from "@/components/admin/SuggestionsFilterBar";
import {
  SuggestionsTable,
  type PaginationInfo,
} from "@/components/admin/SuggestionsTable";
import { exportSuggestionsToExcel } from "@/lib/utils/exportReport";
import type {
  ShiftType,
  SuggestionCategory,
  SuggestionRow,
  TicketResponseRow,
  TicketStatus,
} from "@/types/database.types";

export interface AdminDashboardViewProps {
  initialSuggestions: SuggestionWithResponse[];
  serverMetrics?: DashboardMetrics;
  serverPagination?: PaginationInfo;
  initialFilters?: FilterState;
}

/**
 * Issue 8.2 to 8.6 & 10.3 — AdminDashboardView (Client Component)
 *
 * Master orchestrator for the FUSCH administrative dashboard:
 * - URL state synchronization for 3 FUSCH moderators (/admin?page=1&shift=lunch&status=pending).
 * - Server-side pagination (15, 30, 50 rows) with accessible table controls.
 * - Dynamic calculation of KPI operational metrics or server-provided KPI metrics.
 * - Multi-dimensional filtering with 300 ms debounced search.
 * - Modal management for ticket inspection, status transitions and official responses.
 * - Client-side Excel export conforming to Zero Server Cost (Issue 8.6).
 */
export function AdminDashboardView({
  initialSuggestions,
  serverMetrics,
  serverPagination,
  initialFilters,
}: AdminDashboardViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Local overrides map for optimistic modal updates without cascading effect re-renders
  const [localUpdates, setLocalUpdates] = useState<
    Record<string, Partial<SuggestionWithResponse>>
  >({});

  const [selectedSuggestion, setSelectedSuggestion] =
    useState<SuggestionWithResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [referenceTime] = useState(() => Date.now());

  // Derive filter state from searchParams or props
  const [filters, setFilters] = useState<FilterState>(() => {
    if (initialFilters) return initialFilters;

    const shiftParam = searchParams.get("shift") as ShiftType | null;
    const categoryParam = searchParams.get("category") as SuggestionCategory | null;
    const statusParam = searchParams.get("status") as TicketStatus | null;
    const searchParam = searchParams.get("search") || "";

    return {
      shift: shiftParam || "all",
      category: categoryParam || "all",
      status: statusParam || "all",
      searchQuery: searchParam,
    };
  });

  // Adjust filter state when initialFilters changes (idiomatic React pattern)
  const [prevInitialFilters, setPrevInitialFilters] = useState(initialFilters);
  if (initialFilters && initialFilters !== prevInitialFilters) {
    setPrevInitialFilters(initialFilters);
    setFilters(initialFilters);
  }

  // Derive pagination values from serverPagination or fallback
  const currentPage = serverPagination?.currentPage ?? 1;
  const pageSize = serverPagination?.pageSize ?? 15;

  // Merge server suggestions with local optimistic overrides from moderation actions
  const suggestions = useMemo(() => {
    return initialSuggestions.map((item) => {
      const update = localUpdates[item.id];
      return update ? { ...item, ...update } : item;
    });
  }, [initialSuggestions, localUpdates]);

  // Push new query parameters to URL
  const pushUrlState = (
    newFilters: FilterState,
    newPage: number,
    newPageSize: number,
  ) => {
    const params = new URLSearchParams();

    if (newPage > 1) params.set("page", String(newPage));
    if (newPageSize !== 15) params.set("pageSize", String(newPageSize));
    if (newFilters.shift !== "all") params.set("shift", newFilters.shift);
    if (newFilters.category !== "all") params.set("category", newFilters.category);
    if (newFilters.status !== "all") params.set("status", newFilters.status);
    if (newFilters.searchQuery.trim() !== "") {
      params.set("search", newFilters.searchQuery.trim());
    }

    const queryString = params.toString();
    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    });
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    pushUrlState(newFilters, 1, pageSize);
  };

  const handlePageChange = (newPage: number) => {
    pushUrlState(filters, newPage, pageSize);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    pushUrlState(filters, 1, newPageSize);
  };

  // Operational KPI metrics across tickets
  const metrics: DashboardMetrics = useMemo(() => {
    if (serverMetrics) {
      return serverMetrics;
    }

    const total = suggestions.length;
    let pending = 0;
    let inReview = 0;
    let resolved = 0;
    let weeklyIncrement = 0;

    const sevenDaysAgo = referenceTime - 7 * 24 * 60 * 60 * 1000;

    for (const item of suggestions) {
      if (item.status === "pending") pending++;
      else if (item.status === "in_review") inReview++;
      else if (item.status === "resolved") resolved++;

      const createdAt = new Date(item.created_at).getTime();
      if (!isNaN(createdAt) && createdAt >= sevenDaysAgo) {
        weeklyIncrement++;
      }
    }

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return {
      total,
      weeklyIncrement,
      pending,
      inReview,
      resolved,
      resolutionRate,
    };
  }, [suggestions, serverMetrics, referenceTime]);

  const isServerPaged = Boolean(serverPagination);

  const displaySuggestions = useMemo(() => {
    if (isServerPaged) {
      return suggestions;
    }

    // Client-side fallback filter
    const filtered = suggestions.filter((item) => {
      if (filters.shift !== "all" && item.shift !== filters.shift) return false;
      if (filters.category !== "all" && item.category !== filters.category) return false;
      if (filters.status !== "all" && item.status !== filters.status) return false;
      if (filters.searchQuery.trim() !== "") {
        const query = filters.searchQuery.trim().toLowerCase();
        const code = (item.ticket_code ?? "").toLowerCase();
        const message = item.message.toLowerCase();
        if (!code.includes(query) && !message.includes(query)) return false;
      }
      return true;
    });

    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [isServerPaged, suggestions, filters, currentPage, pageSize]);

  const effectivePagination: PaginationInfo = useMemo(() => {
    if (serverPagination) {
      return serverPagination;
    }
    return {
      currentPage,
      pageSize,
      totalCount: suggestions.length,
      totalPages: Math.max(1, Math.ceil(suggestions.length / pageSize)),
    };
  }, [serverPagination, currentPage, pageSize, suggestions.length]);

  // Handle opening ticket detail modal
  const handleSelectSuggestion = (item: SuggestionWithResponse) => {
    setSelectedSuggestion(item);
    setIsDetailOpen(true);
  };

  // Handle status update from modal
  const handleStatusChange = (
    suggestionId: string,
    newStatus: TicketStatus,
    updatedRow: SuggestionRow,
  ) => {
    setLocalUpdates((prev) => ({
      ...prev,
      [suggestionId]: { ...updatedRow, status: newStatus },
    }));

    if (selectedSuggestion?.id === suggestionId) {
      setSelectedSuggestion((prev) =>
        prev ? { ...prev, ...updatedRow, status: newStatus } : null,
      );
    }
  };

  // Handle official response saved from modal
  const handleResponseSaved = (
    savedResponse: TicketResponseRow,
    updatedSuggestion: SuggestionRow,
  ) => {
    setLocalUpdates((prev) => {
      const existing = prev[updatedSuggestion.id];
      const initialMatch = initialSuggestions.find(
        (s) => s.id === updatedSuggestion.id,
      );
      const existingResponses =
        existing?.responses || initialMatch?.responses || [];

      return {
        ...prev,
        [updatedSuggestion.id]: {
          ...updatedSuggestion,
          status: "resolved",
          latest_response: savedResponse,
          responses: [...existingResponses, savedResponse],
        },
      };
    });

    if (selectedSuggestion?.id === updatedSuggestion.id) {
      setSelectedSuggestion((prev) =>
        prev
          ? {
              ...prev,
              ...updatedSuggestion,
              status: "resolved",
              latest_response: savedResponse,
              responses: [...(prev.responses || []), savedResponse],
            }
          : null,
      );
    }
  };

  // Trigger client-side Excel export
  const handleExportExcel = () => {
    exportSuggestionsToExcel(suggestions);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
          Bandeja de Moderación y Atención
        </h1>
        <p className="text-sm text-neutral-gray">
          Supervisa las observaciones de los comensales, actualiza estados y emite
          respuestas institucionales en representación de la Comisión de Comedor.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <DashboardMetricsCards metrics={metrics} />

      {/* Multi-Dimensional Filter Bar with Debounce */}
      <SuggestionsFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onExportExcel={handleExportExcel}
        totalFilteredCount={effectivePagination.totalCount}
        totalCount={metrics.total}
      />

      {/* Adaptive Suggestions Table with Server Pagination */}
      <SuggestionsTable
        suggestions={displaySuggestions}
        onSelectSuggestion={handleSelectSuggestion}
        onResetFilters={() =>
          handleFilterChange({
            shift: "all",
            category: "all",
            status: "all",
            searchQuery: "",
          })
        }
        pagination={effectivePagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Suggestion Detail and Response Modal */}
      <SuggestionDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedSuggestion(null);
        }}
        suggestion={selectedSuggestion}
        onStatusChange={handleStatusChange}
        onResponseSaved={handleResponseSaved}
      />
    </div>
  );
}
