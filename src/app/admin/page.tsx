import { AdminDashboardView } from "@/components/admin/AdminDashboardView";
import type { DashboardMetrics } from "@/components/admin/DashboardMetricsCards";
import type { SuggestionWithResponse } from "@/components/admin/SuggestionDetailModal";
import type { PaginationInfo } from "@/components/admin/SuggestionsTable";
import type { FilterState } from "@/components/admin/SuggestionsFilterBar";
import { createClient } from "@/lib/supabase/server";
import type {
  ShiftType,
  SuggestionCategory,
  SuggestionRow,
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

  const supabase = await createClient();

  // 1. Compute global operational KPI metrics across all suggestions in parallel
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalRes, pendingRes, inReviewRes, resolvedRes, weeklyRes] =
    await Promise.all([
      supabase.from("suggestions").select("*", { count: "exact", head: true }),
      supabase
        .from("suggestions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("suggestions")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_review"),
      supabase
        .from("suggestions")
        .select("*", { count: "exact", head: true })
        .eq("status", "resolved"),
      supabase
        .from("suggestions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgoIso),
    ]);

  const total = totalRes.count ?? 0;
  const pending = pendingRes.count ?? 0;
  const inReview = inReviewRes.count ?? 0;
  const resolved = resolvedRes.count ?? 0;
  const weeklyIncrement = weeklyRes.count ?? 0;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const metrics: DashboardMetrics = {
    total,
    pending,
    inReview,
    resolved,
    weeklyIncrement,
    resolutionRate,
  };

  // 2. Build filtered and paginated query
  let query = supabase
    .from("suggestions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (shift !== "all") {
    query = query.eq("shift", shift);
  }
  if (category !== "all") {
    query = query.eq("category", category);
  }
  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (searchQuery !== "") {
    if (searchQuery.toUpperCase().startsWith("UNSCH-")) {
      query = query.ilike("ticket_code", `%${searchQuery}%`);
    } else {
      query = query.ilike("message", `%${searchQuery}%`);
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: suggestionsData, count: filteredCount, error: suggestionsError } =
    await query.range(from, to);

  if (suggestionsError) {
    console.error("[AdminDashboardPage] Suggestions fetch error:", suggestionsError);
  }

  const rawSuggestions = (suggestionsData ?? []) as SuggestionRow[];

  // 3. Query responses only for suggestions present in the active page
  const suggestionIds = rawSuggestions.map((s) => s.id);
  let rawResponses: TicketResponseRow[] = [];

  if (suggestionIds.length > 0) {
    const { data: responsesData, error: responsesError } = await supabase
      .from("ticket_responses")
      .select("*")
      .in("suggestion_id", suggestionIds)
      .order("created_at", { ascending: true });

    if (responsesError) {
      console.error("[AdminDashboardPage] Responses fetch error:", responsesError);
    } else {
      rawResponses = (responsesData ?? []) as TicketResponseRow[];
    }
  }

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

  const totalFiltered = filteredCount ?? rawSuggestions.length;
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
