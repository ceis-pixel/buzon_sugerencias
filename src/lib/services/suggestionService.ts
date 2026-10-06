import "server-only";

import { generateRateHash, getLimaDate } from "@/lib/auth/rateHash";
import { query, withTransaction } from "@/lib/db";
import { sanitizeUserText } from "@/lib/security/sanitization";
import type {
  ShiftType,
  SubmittedTicketResult,
  SuggestionCategory,
  SuggestionRow,
  TicketResponseRow,
  TicketStatus,
} from "@/types/database.types";

/** Maximum anonymous reports per student, per meal shift, per day. */
export const MAX_SUBMISSIONS_PER_SHIFT = 2;

/** Equivalent of HTTP 429 for Server Actions: the shift quota is exhausted. */
export class RateLimitExceededError extends Error {
  readonly status = 429;

  constructor(readonly shift: ShiftType) {
    super(
      `Has alcanzado el límite de ${MAX_SUBMISSIONS_PER_SHIFT} reportes para este turno (${shift}). Podrás enviar otra observación en el siguiente turno.`,
    );
    this.name = "RateLimitExceededError";
  }
}

const SUGGESTION_COLUMNS =
  "id, ticket_code, shift, category, message, photo_url, status, created_at, updated_at";
const RESPONSE_COLUMNS =
  "id, suggestion_id, responder_email, response_text, is_internal, created_at, updated_at";

export interface AnonymousSuggestionInput {
  /** Verified session e-mail. Used only to derive the ephemeral hash; never stored. */
  email: string;
  shift: ShiftType;
  category: SuggestionCategory;
  message: string;
  photoUrl?: string | null;
  now?: Date;
}

/**
 * Dissociated insertion (Ley N.º 29733) in a single transaction:
 *   1. Derive rate_hash = HMAC(email | date | shift) in memory.
 *   2. Atomically consume one unit of the shift quota (429 when exhausted).
 *   3. Insert the suggestion with NO user identifier; the database assigns the
 *      unique UNSCH-XXXX ticket code under an advisory lock.
 * The two tables share no key, so a suggestion cannot be traced to its author.
 */
export async function createAnonymousSuggestion(
  input: AnonymousSuggestionInput,
): Promise<SubmittedTicketResult> {
  const submissionDate = getLimaDate(input.now);
  const rateHash = generateRateHash(input.email, input.shift, submissionDate);

  return withTransaction(async (tx) => {
    // Quota rows are stamped with the calendar day only. Sharing the precise
    // transaction timestamp with the suggestion would let the two rows be
    // matched, defeating the dissociation.
    const quota = await tx.query<{ submission_count: number }>(
      `INSERT INTO public.submission_rate_limits AS limits
              (rate_hash, shift, submission_date, submission_count, created_at, updated_at)
       VALUES ($1, $2, $3, 1, $3::date, $3::date)
       ON CONFLICT (rate_hash, shift, submission_date)
       DO UPDATE SET submission_count = limits.submission_count + 1
               WHERE limits.submission_count < $4
       RETURNING submission_count`,
      [rateHash, input.shift, submissionDate, MAX_SUBMISSIONS_PER_SHIFT],
    );

    if (quota.length === 0) {
      throw new RateLimitExceededError(input.shift);
    }

    const sanitizedMessage = sanitizeUserText(input.message);

    const inserted = await tx.query<SubmittedTicketResult>(
      `INSERT INTO public.suggestions (shift, category, message, photo_url, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, ticket_code, shift, category, status, created_at`,
      [input.shift, input.category, sanitizedMessage, input.photoUrl || null],
    );

    return inserted[0];
  });
}

export interface TicketDetails {
  suggestion: SuggestionRow;
  responses: TicketResponseRow[];
}

/**
 * Public ticket lookup by code. Only non-internal responses are returned and
 * the moderator's e-mail is withheld from this unauthenticated view.
 */
export async function fetchTicketDetails(ticketCode: string): Promise<TicketDetails | null> {
  const suggestions = await query<SuggestionRow>(
    `SELECT ${SUGGESTION_COLUMNS} FROM public.suggestions WHERE ticket_code = $1`,
    [ticketCode],
  );

  const suggestion = suggestions[0];
  if (!suggestion) return null;

  const responses = await query<TicketResponseRow>(
    `SELECT id, suggestion_id, '' AS responder_email, response_text, is_internal,
            created_at, updated_at
       FROM public.ticket_responses
      WHERE suggestion_id = $1 AND is_internal = false
      ORDER BY created_at ASC`,
    [suggestion.id],
  );

  return { suggestion, responses };
}

export interface DashboardMetrics {
  total: number;
  pending: number;
  inReview: number;
  resolved: number;
  weeklyIncrement: number;
  resolutionRate: number;
}

/** Global moderation KPIs computed in one pass over the table. */
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const [row] = await query<{
    total: number;
    pending: number;
    in_review: number;
    resolved: number;
    weekly: number;
  }>(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE status = 'pending')::int AS pending,
            count(*) FILTER (WHERE status = 'in_review')::int AS in_review,
            count(*) FILTER (WHERE status = 'resolved')::int AS resolved,
            count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS weekly
       FROM public.suggestions`,
  );

  const total = row?.total ?? 0;
  const resolved = row?.resolved ?? 0;

  return {
    total,
    pending: row?.pending ?? 0,
    inReview: row?.in_review ?? 0,
    resolved,
    weeklyIncrement: row?.weekly ?? 0,
    resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
  };
}

export interface AdminSuggestionFilters {
  page: number;
  pageSize: number;
  shift?: ShiftType | "all";
  category?: SuggestionCategory | "all";
  status?: TicketStatus | "all";
  search?: string;
}

export interface AdminSuggestionPage {
  suggestions: SuggestionRow[];
  totalCount: number;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * Moderation inbox: filtered, newest first, paginated with LIMIT/OFFSET.
 * Callers must have authorized the request as an active administrator.
 */
export async function fetchAdminSuggestions(
  filters: AdminSuggestionFilters,
): Promise<AdminSuggestionPage> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const bind = (value: unknown) => `$${params.push(value)}`;

  if (filters.shift && filters.shift !== "all") {
    conditions.push(`shift = ${bind(filters.shift)}`);
  }
  if (filters.category && filters.category !== "all") {
    conditions.push(`category = ${bind(filters.category)}`);
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(`status = ${bind(filters.status)}`);
  }

  const search = filters.search?.trim() ?? "";
  if (search) {
    const column = search.toUpperCase().startsWith("UNSCH-") ? "ticket_code" : "message";
    conditions.push(`${column} ILIKE ${bind(`%${escapeLikePattern(search)}%`)}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const pageSize = Math.min(Math.max(1, Math.floor(filters.pageSize)), 100);
  const offset = (Math.max(1, Math.floor(filters.page)) - 1) * pageSize;

  const [countRows, suggestions] = await Promise.all([
    query<{ total: number }>(
      `SELECT count(*)::int AS total FROM public.suggestions ${where}`,
      params,
    ),
    query<SuggestionRow>(
      `SELECT ${SUGGESTION_COLUMNS}
         FROM public.suggestions
         ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset],
    ),
  ]);

  return { suggestions, totalCount: countRows[0]?.total ?? 0 };
}

/** Every suggestion, newest first (analytics dashboard). */
export async function fetchAllSuggestions(): Promise<SuggestionRow[]> {
  return query<SuggestionRow>(
    `SELECT ${SUGGESTION_COLUMNS} FROM public.suggestions ORDER BY created_at DESC`,
  );
}

/** Responses (public and internal) for the given suggestions, or for all when omitted. */
export async function fetchResponses(suggestionIds?: readonly string[]): Promise<TicketResponseRow[]> {
  if (suggestionIds && suggestionIds.length === 0) return [];

  return suggestionIds
    ? query<TicketResponseRow>(
        `SELECT ${RESPONSE_COLUMNS}
           FROM public.ticket_responses
          WHERE suggestion_id = ANY($1::uuid[])
          ORDER BY created_at ASC`,
        [suggestionIds],
      )
    : query<TicketResponseRow>(
        `SELECT ${RESPONSE_COLUMNS} FROM public.ticket_responses ORDER BY created_at ASC`,
      );
}

export interface PublicImprovement {
  id: string;
  ticket_code: string | null;
  shift: ShiftType;
  category: SuggestionCategory;
  message: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  response_text: string;
  response_created_at: string;
}

/**
 * Transparency board: resolved tickets with their latest public response.
 * Moderator e-mails and internal notes are never selected.
 */
export async function fetchPublicImprovements(): Promise<PublicImprovement[]> {
  return query<PublicImprovement>(
    `SELECT s.id, s.ticket_code, s.shift, s.category, s.message, s.photo_url,
            s.created_at, s.updated_at,
            r.response_text, r.created_at AS response_created_at
       FROM public.suggestions s
       JOIN LATERAL (
              SELECT response_text, created_at
                FROM public.ticket_responses
               WHERE suggestion_id = s.id AND is_internal = false
               ORDER BY created_at DESC
               LIMIT 1
            ) r ON true
      WHERE s.status = 'resolved' AND btrim(r.response_text) <> ''
      ORDER BY s.updated_at DESC`,
  );
}

/** Moves a ticket to another status. Returns null when the ticket does not exist. */
export async function updateSuggestionStatusById(
  suggestionId: string,
  status: TicketStatus,
): Promise<SuggestionRow | null> {
  const rows = await query<SuggestionRow>(
    `UPDATE public.suggestions SET status = $2 WHERE id = $1 RETURNING ${SUGGESTION_COLUMNS}`,
    [suggestionId, status],
  );
  return rows[0] ?? null;
}

export interface OfficialResponseResult {
  response: TicketResponseRow;
  suggestion: SuggestionRow;
}

/**
 * Publishes (or edits) the official response and marks the ticket as resolved,
 * atomically. Returns null when the ticket does not exist.
 */
export async function submitOfficialResponse(input: {
  suggestionId: string;
  responderEmail: string;
  responseText: string;
}): Promise<OfficialResponseResult | null> {
  return withTransaction(async (tx) => {
    const locked = await tx.query<{ id: string }>(
      "SELECT id FROM public.suggestions WHERE id = $1 FOR UPDATE",
      [input.suggestionId],
    );
    if (locked.length === 0) return null;

    const existing = await tx.query<{ id: string }>(
      `SELECT id FROM public.ticket_responses
        WHERE suggestion_id = $1 AND is_internal = false
        ORDER BY created_at ASC
        LIMIT 1`,
      [input.suggestionId],
    );

    const sanitizedResponseText = sanitizeUserText(input.responseText);

    const [response] = existing[0]
      ? await tx.query<TicketResponseRow>(
          `UPDATE public.ticket_responses
              SET responder_email = $2, response_text = $3
            WHERE id = $1
          RETURNING ${RESPONSE_COLUMNS}`,
          [existing[0].id, input.responderEmail, sanitizedResponseText],
        )
      : await tx.query<TicketResponseRow>(
          `INSERT INTO public.ticket_responses
                  (suggestion_id, responder_email, response_text, is_internal)
           VALUES ($1, $2, $3, false)
           RETURNING ${RESPONSE_COLUMNS}`,
          [input.suggestionId, input.responderEmail, sanitizedResponseText],
        );

    const [suggestion] = await tx.query<SuggestionRow>(
      `UPDATE public.suggestions SET status = 'resolved' WHERE id = $1
       RETURNING ${SUGGESTION_COLUMNS}`,
      [input.suggestionId],
    );

    return { response, suggestion };
  });
}

export interface MediaPurgeResult {
  purgedCount: number;
  purgedUrls: string[];
  cutoffDate: string;
  executedAt: string;
}

/**
 * Storage maintenance: detaches photos from resolved tickets older than
 * `daysOld` days (text and responses are kept for statistics) and returns the
 * detached references so the caller can delete the files from disk.
 */
export async function purgeResolvedMedia(daysOld: number): Promise<MediaPurgeResult> {
  const days = Math.max(0, Math.floor(daysOld));

  const rows = await query<{ photo_url: string; cutoff_date: string; executed_at: string }>(
    `WITH target AS (
       SELECT id, photo_url
         FROM public.suggestions
        WHERE status = 'resolved'
          AND photo_url IS NOT NULL
          AND photo_url <> ''
          AND created_at <= now() - make_interval(days => $1::int)
          FOR UPDATE
     ), detached AS (
       UPDATE public.suggestions s
          SET photo_url = NULL
         FROM target
        WHERE s.id = target.id
     )
     SELECT target.photo_url,
            now() - make_interval(days => $1::int) AS cutoff_date,
            now() AS executed_at
       FROM target`,
    [days],
  );

  const now = new Date();
  return {
    purgedCount: rows.length,
    purgedUrls: rows.map((row) => row.photo_url),
    cutoffDate: rows[0]?.cutoff_date ?? new Date(now.getTime() - days * 86_400_000).toISOString(),
    executedAt: rows[0]?.executed_at ?? now.toISOString(),
  };
}

/** Photo references still attached to any suggestion (orphan file detection). */
export async function fetchReferencedPhotoUrls(): Promise<string[]> {
  const rows = await query<{ photo_url: string }>(
    "SELECT photo_url FROM public.suggestions WHERE photo_url IS NOT NULL AND photo_url <> ''",
  );
  return rows.map((row) => row.photo_url);
}
