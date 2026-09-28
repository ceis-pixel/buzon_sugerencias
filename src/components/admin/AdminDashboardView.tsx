"use client";

import { useMemo, useState } from "react";

import { DashboardMetricsCards, type DashboardMetrics } from "@/components/admin/DashboardMetricsCards";
import {
  SuggestionDetailModal,
  type SuggestionWithResponse,
} from "@/components/admin/SuggestionDetailModal";
import {
  SuggestionsFilterBar,
  type FilterState,
} from "@/components/admin/SuggestionsFilterBar";
import { SuggestionsTable } from "@/components/admin/SuggestionsTable";
import { exportSuggestionsToExcel } from "@/lib/utils/exportReport";
import type { SuggestionRow, TicketResponseRow, TicketStatus } from "@/types/database.types";

export interface AdminDashboardViewProps {
  initialSuggestions: SuggestionWithResponse[];
}

/**
 * Issue 8.2 to 8.6 — AdminDashboardView (Client Component)
 *
 * Master orchestrator for the FUSCH administrative dashboard:
 * - Dynamic calculation of KPI operational metrics (Total, Pendientes, En Revisión, Atendidas).
 * - Multi-dimensional client-side filtering (Turno, Categoría, Estado, Búsqueda).
 * - Modal management for ticket inspection, status transitions and official responses.
 * - Client-side Excel export conforming to Zero Server Cost (Issue 8.6).
 */
export function AdminDashboardView({ initialSuggestions }: AdminDashboardViewProps) {
  const [suggestions, setSuggestions] = useState<SuggestionWithResponse[]>(
    initialSuggestions,
  );
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<SuggestionWithResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [referenceTime] = useState(() => Date.now());

  // Multi-dimensional filter state
  const [filters, setFilters] = useState<FilterState>({
    shift: "all",
    category: "all",
    status: "all",
    searchQuery: "",
  });

  // Calculate live operational metrics across all tickets
  const metrics: DashboardMetrics = useMemo(() => {
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
  }, [suggestions, referenceTime]);

  // Filter suggestions in real-time
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((item) => {
      // Shift filter
      if (filters.shift !== "all" && item.shift !== filters.shift) {
        return false;
      }

      // Category filter
      if (filters.category !== "all" && item.category !== filters.category) {
        return false;
      }

      // Status filter
      if (filters.status !== "all" && item.status !== filters.status) {
        return false;
      }

      // Search query (code or message)
      if (filters.searchQuery.trim() !== "") {
        const query = filters.searchQuery.trim().toLowerCase();
        const code = (item.ticket_code ?? "").toLowerCase();
        const message = item.message.toLowerCase();
        if (!code.includes(query) && !message.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [suggestions, filters]);

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
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, ...updatedRow, status: newStatus } : s)),
    );
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
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === updatedSuggestion.id
          ? {
              ...s,
              ...updatedSuggestion,
              status: "resolved",
              latest_response: savedResponse,
              responses: [...(s.responses || []), savedResponse],
            }
          : s,
      ),
    );
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
    exportSuggestionsToExcel(filteredSuggestions);
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

      {/* Multi-Dimensional Filter Bar */}
      <SuggestionsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onExportExcel={handleExportExcel}
        totalFilteredCount={filteredSuggestions.length}
        totalCount={suggestions.length}
      />

      {/* Adaptive Suggestions Table */}
      <SuggestionsTable
        suggestions={filteredSuggestions}
        onSelectSuggestion={handleSelectSuggestion}
        onResetFilters={() =>
          setFilters({
            shift: "all",
            category: "all",
            status: "all",
            searchQuery: "",
          })
        }
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
