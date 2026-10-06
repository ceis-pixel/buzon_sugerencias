import { AdminDashboardView } from "@/components/admin/AdminDashboardView";
import type { DashboardMetrics } from "@/components/admin/DashboardMetricsCards";
import type { SuggestionWithResponse } from "@/components/admin/InspectionDrawer";
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
    photo?: string;
  }>;
}

const SHIFTS: readonly string[] = ["breakfast", "lunch", "dinner"];
const CATEGORIES: readonly string[] = ["menu", "hygiene", "portion", "service", "infrastructure"];
const STATUSES: readonly string[] = ["pending", "in_review", "resolved"];

/** Accepts a query-string value only when it is one of the known options. */
function oneOf<T extends string>(value: string | undefined, allowed: readonly string[]): T | "all" {
  return value && allowed.includes(value) ? (value as T) : "all";
}

/**
 * /admin — JVC inspection console (Sprint 8 & Issue 10.3)
 *
 * Server Component with Database-driven Server-Side Pagination:
 * - Reads query parameters from URL: page, pageSize (15, 30, 50), shift, category, status,
 *   search and photo (reports with evidence only).
 * - Computes accurate global KPI metrics via lightweight PostgreSQL count queries.
 * - Queries paginated slice from PostgreSQL using range (LIMIT/OFFSET) and exact count.
 * - Correlates official responses only for the active page slice.
 */
export default async function AdminDashboardPage(props: AdminDashboardPageProps) {
  const searchParams = (await props.searchParams) || {};

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const rawPageSize = parseInt(searchParams.pageSize || "15", 10);
  const pageSize = [15, 30, 50].includes(rawPageSize) ? rawPageSize : 15;

  const shift = oneOf<ShiftType>(searchParams.shift, SHIFTS);
  const category = oneOf<SuggestionCategory>(searchParams.category, CATEGORIES);
  const status = oneOf<TicketStatus>(searchParams.status, STATUSES);
  const searchQuery = (searchParams.search || "").trim().slice(0, 200);
  const hasPhoto = searchParams.photo === "1";

  // The layout renders the access screens; the page refuses to load data on its own.
  if (!(await getVerifiedAdmin())) {
    return null;
  }

  // 1. Global operational KPI metrics and the filtered, paginated slice
  const [metrics, { suggestions: rawSuggestions, totalCount }] = await Promise.all([
    fetchDashboardMetrics() satisfies Promise<DashboardMetrics>,
    fetchAdminSuggestions({
      page,
      pageSize,
      shift,
      category,
      status,
      search: searchQuery,
      hasPhoto,
    }),
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
    // Internal notes are never offered as the official response to edit.
    const latest_response = responses.findLast((response) => !response.is_internal) ?? null;

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
    hasPhoto,
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
