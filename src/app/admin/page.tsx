import { AdminDashboardView } from "@/components/admin/AdminDashboardView";
import type { DashboardMetrics } from "@/components/admin/DashboardMetricsCards";
import type { SuggestionWithResponse } from "@/components/admin/SuggestionDetailModal";
import type { PaginationInfo } from "@/components/admin/SuggestionsTable";
import type { FilterState } from "@/components/admin/SuggestionsFilterBar";
import { getVerifiedAdmin } from "@/lib/auth/session";
import {
  fetchAdminSuggestions,
  fetchDashboardMetrics,
  fetchResponses,
} from "@/lib/services/suggestionService";
import type {
  ShiftType,
  SuggestionCategory,
  TicketResponseRow,
  TicketStatus,
} from "@/types/database.types";

export interface AdminDashboardPageProps {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
    shift?: string;
    category?: string;
    status?: string;
    search?: string;
  }>;
}

/**
 * /admin — Moderation and Feedback Dashboard Page (Sprint 8 & Issue 10.3)
 *
 * Server Component with Database-driven Server-Side Pagination:
 * - Reads query parameters from URL: page, pageSize (15, 30, 50), shift, category, status, search.
 * - Computes accurate global KPI metrics via lightweight PostgreSQL count queries.
 * - Queries paginated slice from PostgreSQL using range (LIMIT/OFFSET) and exact count.
 * - Correlates official responses only for the active page slice.
 */
export default async function AdminDashboardPage(props: AdminDashboardPageProps) {
  const searchParams = (await props.searchParams) || {};

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const rawPageSize = parseInt(searchParams.pageSize || "15", 10);
  const pageSize = [15, 30, 50].includes(rawPageSize) ? rawPageSize : 15;

  const shift = (searchParams.shift || "all") as ShiftType | "all";
  const category = (searchParams.category || "all") as SuggestionCategory | "all";
  const status = (searchParams.status || "all") as TicketStatus | "all";
  const searchQuery = (searchParams.search || "").trim();

  // The layout renders the access screens; the page refuses to load data on its own.
  if (!(await getVerifiedAdmin())) {
    return null;
  }

  // 1. Global operational KPI metrics and the filtered, paginated slice
  const [metrics, { suggestions: rawSuggestions, totalCount }] = await Promise.all([
    fetchDashboardMetrics() satisfies Promise<DashboardMetrics>,
    fetchAdminSuggestions({ page, pageSize, shift, category, status, search: searchQuery }),
  ]);

  // 2. Responses only for suggestions present in the active page
  const rawResponses: TicketResponseRow[] = await fetchResponses(
    rawSuggestions.map((s) => s.id),
  );

  // Map responses by suggestion_id
  const responsesBySuggestion = new Map<string, TicketResponseRow[]>();
  for (const resp of rawResponses) {
    const list = responsesBySuggestion.get(resp.suggestion_id) || [];
    list.push(resp);
    responsesBySuggestion.set(resp.suggestion_id, list);
  }

  // Build SuggestionWithResponse items for the current page
  const initialSuggestions: SuggestionWithResponse[] = rawSuggestions.map((s) => {
    const responses = responsesBySuggestion.get(s.id) || [];
    const latest_response =
      responses.length > 0 ? responses[responses.length - 1] : null;

    return {
      ...s,
      responses,
      latest_response,
    };
  });

  const totalFiltered = totalCount;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const pagination: PaginationInfo = {
    currentPage: page,
    pageSize,
    totalCount: totalFiltered,
    totalPages,
  };

  const initialFilters: FilterState = {
    shift,
    category,
    status,
    searchQuery,
  };

  return (
    <AdminDashboardView
      initialSuggestions={initialSuggestions}
      serverMetrics={metrics}
      serverPagination={pagination}
      initialFilters={initialFilters}
    />
  );
}
