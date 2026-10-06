import { createHash } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => (await import("./helpers/testDb")).dbModuleMock);

import { generateRateHash } from "@/lib/auth/rateHash";
import { findActiveAdmin } from "@/lib/services/adminService";
import {
  createMenuRating,
  fetchRatingsForMenus,
  hasRatedToday,
  MenuRatingError,
  setMenuActive,
  upsertMenu,
} from "@/lib/services/menuService";
import {
  createAnonymousSuggestion,
  fetchAdminSuggestions,
  fetchDashboardMetrics,
  fetchPublicImprovements,
  fetchReferencedPhotoUrls,
  fetchResponses,
  fetchTicketDetails,
  purgeResolvedMedia,
  RateLimitExceededError,
  submitOfficialResponse,
  updateSuggestionStatusById,
} from "@/lib/services/suggestionService";

import { startTestDb, stopTestDb } from "./helpers/testDb";

const STUDENT = "27215508@unsch.edu.pe";
const MODERATOR = "salud.fusch@unsch.edu.pe";
const SECRET = "test-only-rate-limit-secret-0123456789abcdef";
const NOW = new Date("2026-10-05T17:30:00Z"); // 12:30 in Lima
const TICKET_CODE = /^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

let db: PGlite;

beforeAll(async () => {
  db = await startTestDb();
}, 60_000);

afterAll(async () => {
  await stopTestDb();
});

beforeEach(() => {
  vi.stubEnv("RATE_LIMIT_HMAC_SECRET", SECRET);
});

/** Text dump of every row in every application table. */
async function dumpDatabase(): Promise<string> {
  const { rows: tables } = await db.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'admins'",
  );
  const dumps = await Promise.all(
    tables.map(({ tablename }) =>
      db.query(`SELECT * FROM public.${tablename}`).then((result) => JSON.stringify(result.rows)),
    ),
  );
  return dumps.join("\n");
}

describe("createAnonymousSuggestion — dissociated insertion (Ley N.º 29733)", () => {
  it("persists the suggestion with a ticket code and no trace of the student", async () => {
    const ticket = await createAnonymousSuggestion({
      email: STUDENT,
      shift: "lunch",
      category: "hygiene",
      message: "   Las bandejas del almuerzo llegaron húmedas a la barra.   ",
      photoUrl: "/uploads/2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp",
      now: NOW,
    });

    expect(ticket.ticket_code).toMatch(TICKET_CODE);
    expect(ticket).toMatchObject({ shift: "lunch", category: "hygiene", status: "pending" });
    expect(new Date(ticket.created_at).toISOString()).toBe(ticket.created_at);

    const { rows, fields } = await db.query<Record<string, unknown>>(
      "SELECT * FROM public.suggestions WHERE id = $1",
      [ticket.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].message).toBe("Las bandejas del almuerzo llegaron húmedas a la barra.");
    expect(fields.map((field) => field.name).sort()).toEqual([
      "category", "created_at", "id", "message", "photo_url",
      "shift", "status", "ticket_code", "updated_at",
    ]);

    // Neither the e-mail, its local part, nor an unsalted digest exists anywhere.
    const dump = await dumpDatabase();
    expect(dump).not.toContain(STUDENT);
    expect(dump).not.toContain("27215508");
    expect(dump).not.toContain(createHash("sha256").update(STUDENT).digest("hex"));
  });

  it("stores only the keyed ephemeral hash in the quota table, unlinked from the suggestion", async () => {
    const { rows, fields } = await db.query<{ rate_hash: string; submission_count: number }>(
      "SELECT * FROM public.submission_rate_limits",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].rate_hash).toBe(generateRateHash(STUDENT, "lunch", "2026-10-05", SECRET));
    expect(rows[0].rate_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].submission_count).toBe(1);
    expect(fields.map((field) => field.name)).not.toContain("suggestion_id");
  });

  it("stamps quota rows with the day only, so they cannot be matched to a suggestion by time", async () => {
    const { rows } = await db.query<{ precise: number; shared: number }>(
      `SELECT (SELECT count(*)::int FROM public.submission_rate_limits
                WHERE created_at <> date_trunc('day', created_at)
                   OR updated_at <> date_trunc('day', updated_at)) AS precise,
              (SELECT count(*)::int FROM public.submission_rate_limits l
                 JOIN public.suggestions s
                   ON s.created_at IN (l.created_at, l.updated_at)) AS shared`,
    );
    expect(rows[0]).toEqual({ precise: 0, shared: 0 });
  });

  it("answers the third report of the same shift with a 429-style error and inserts nothing", async () => {
    const input = {
      email: STUDENT,
      shift: "lunch" as const,
      category: "menu" as const,
      message: "Segundo reporte válido del mismo turno.",
      now: NOW,
    };

    await createAnonymousSuggestion(input);
    const before = await db.query("SELECT id FROM public.suggestions");

    const third = createAnonymousSuggestion({ ...input, message: "Tercer intento en el mismo turno." });
    await expect(third).rejects.toBeInstanceOf(RateLimitExceededError);
    await expect(third).rejects.toMatchObject({ status: 429, shift: "lunch" });
    await expect(third).rejects.toThrow("límite de 2 reportes");

    expect((await db.query("SELECT id FROM public.suggestions")).rows).toHaveLength(before.rows.length);
    const { rows } = await db.query<{ submission_count: number }>(
      "SELECT submission_count FROM public.submission_rate_limits WHERE shift = 'lunch'",
    );
    expect(rows[0].submission_count).toBe(2);
  });

  it("keeps quotas independent per shift, per day and per student", async () => {
    const base = { category: "service" as const, message: "Reporte independiente de prueba." };

    await expect(
      createAnonymousSuggestion({ ...base, email: STUDENT, shift: "dinner", now: NOW }),
    ).resolves.toMatchObject({ shift: "dinner" });
    await expect(
      createAnonymousSuggestion({
        ...base, email: STUDENT, shift: "lunch", now: new Date("2026-10-06T17:30:00Z"),
      }),
    ).resolves.toMatchObject({ shift: "lunch" });
    await expect(
      createAnonymousSuggestion({ ...base, email: "otra.alumna@unsch.edu.pe", shift: "lunch", now: NOW }),
    ).resolves.toMatchObject({ shift: "lunch" });
  });

  it("rolls the quota back when the suggestion itself is rejected by the database", async () => {
    const fresh = "rollback.alumno@unsch.edu.pe";
    await expect(
      createAnonymousSuggestion({
        email: fresh, shift: "breakfast", category: "menu", message: "corto", now: NOW,
      }),
    ).rejects.toMatchObject({ code: "23514" });

    const { rows } = await db.query(
      "SELECT 1 FROM public.submission_rate_limits WHERE rate_hash = $1",
      [generateRateHash(fresh, "breakfast", "2026-10-05", SECRET)],
    );
    expect(rows).toHaveLength(0);
  });
});

describe("ticket tracking and moderation services", () => {
  let ticketId: string;
  let ticketCode: string;

  beforeAll(async () => {
    vi.stubEnv("RATE_LIMIT_HMAC_SECRET", SECRET);
    const ticket = await createAnonymousSuggestion({
      email: "seguimiento@unsch.edu.pe",
      shift: "breakfast",
      category: "portion",
      message: "La porción de avena del desayuno fue menor a la habitual.",
      photoUrl: "/uploads/breakfast/2026/10/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.webp",
      now: NOW,
    });
    ticketId = ticket.id;
    ticketCode = ticket.ticket_code;
  });

  it("recognizes only active moderators from the whitelist", async () => {
    await expect(findActiveAdmin(` ${MODERATOR.toUpperCase()} `)).resolves.toMatchObject({
      email: MODERATOR,
      is_active: true,
    });
    await expect(findActiveAdmin(STUDENT)).resolves.toBeNull();

    await db.query("UPDATE public.admins SET is_active = false WHERE email = $1", [
      "rivaldo.moderador@unsch.edu.pe",
    ]);
    await expect(findActiveAdmin("rivaldo.moderador@unsch.edu.pe")).resolves.toBeNull();
  });

  it("looks a ticket up by code and returns null for unknown codes", async () => {
    const details = await fetchTicketDetails(ticketCode);
    expect(details?.suggestion).toMatchObject({ id: ticketId, status: "pending" });
    expect(details?.responses).toEqual([]);
    await expect(fetchTicketDetails("UNSCH-0000")).resolves.toBeNull();
  });

  it("publishes the official response and resolves the ticket in one transaction", async () => {
    const saved = await submitOfficialResponse({
      suggestionId: ticketId,
      responderEmail: MODERATOR,
      responseText: "Se coordinó con cocina para estandarizar el gramaje del desayuno.",
    });

    expect(saved?.suggestion.status).toBe("resolved");
    expect(saved?.response).toMatchObject({
      suggestion_id: ticketId,
      responder_email: MODERATOR,
      is_internal: false,
    });

    // Editing keeps a single public response per ticket.
    const edited = await submitOfficialResponse({
      suggestionId: ticketId,
      responderEmail: MODERATOR,
      responseText: "Respuesta corregida: el gramaje fue verificado por nutrición.",
    });
    expect(edited?.response.id).toBe(saved?.response.id);
    expect(await fetchResponses([ticketId])).toHaveLength(1);
  });

  it("leaves the ticket untouched when the response violates a constraint", async () => {
    await updateSuggestionStatusById(ticketId, "in_review");
    await db.query("DELETE FROM public.ticket_responses WHERE suggestion_id = $1", [ticketId]);

    await expect(
      submitOfficialResponse({
        suggestionId: ticketId,
        responderEmail: "no.registrado@unsch.edu.pe", // not in admins → FK violation
        responseText: "Respuesta que no debe persistir en la base de datos.",
      }),
    ).rejects.toMatchObject({ code: "23503" });

    expect((await fetchTicketDetails(ticketCode))?.suggestion.status).toBe("in_review");

    await submitOfficialResponse({
      suggestionId: ticketId,
      responderEmail: MODERATOR,
      responseText: "Se coordinó con cocina para estandarizar el gramaje del desayuno.",
    });
  });

  it("returns null when responding to a ticket that does not exist", async () => {
    await expect(
      submitOfficialResponse({
        suggestionId: "00000000-0000-4000-8000-000000000000",
        responderEmail: MODERATOR,
        responseText: "Respuesta para un ticket inexistente.",
      }),
    ).resolves.toBeNull();
  });

  it("hides internal notes and moderator e-mails from the public lookup", async () => {
    await db.query(
      `INSERT INTO public.ticket_responses (suggestion_id, responder_email, response_text, is_internal)
       VALUES ($1, $2, 'Nota interna: revisar proveedor de avena.', true)`,
      [ticketId, MODERATOR],
    );

    const details = await fetchTicketDetails(ticketCode);
    expect(details?.responses).toHaveLength(1);
    expect(details?.responses[0].response_text).toContain("gramaje");
    expect(JSON.stringify(details)).not.toContain(MODERATOR);
    expect(JSON.stringify(details)).not.toContain("Nota interna");
  });

  it("lists resolved tickets with a public response on the transparency board", async () => {
    const improvements = await fetchPublicImprovements();
    expect(improvements).toHaveLength(1);
    expect(improvements[0]).toMatchObject({ id: ticketId, ticket_code: ticketCode });
    expect(improvements[0].response_text).toContain("gramaje");
    expect(Object.keys(improvements[0])).not.toContain("responder_email");
  });

  it("paginates and filters the moderation inbox", async () => {
    const all = await fetchAdminSuggestions({ page: 1, pageSize: 2 });
    expect(all.totalCount).toBeGreaterThanOrEqual(5);
    expect(all.suggestions).toHaveLength(2);

    const secondPage = await fetchAdminSuggestions({ page: 2, pageSize: 2 });
    expect(secondPage.suggestions.map((s) => s.id)).not.toEqual(all.suggestions.map((s) => s.id));

    const resolved = await fetchAdminSuggestions({ page: 1, pageSize: 15, status: "resolved" });
    expect(resolved.suggestions.map((s) => s.id)).toEqual([ticketId]);

    const byCode = await fetchAdminSuggestions({ page: 1, pageSize: 15, search: ticketCode.toLowerCase() });
    expect(byCode.suggestions.map((s) => s.id)).toEqual([ticketId]);

    const byText = await fetchAdminSuggestions({
      page: 1, pageSize: 15, shift: "breakfast", category: "portion", search: "AVENA",
    });
    expect(byText.totalCount).toBe(1);

    // LIKE wildcards typed by a moderator are matched literally.
    await expect(fetchAdminSuggestions({ page: 1, pageSize: 15, search: "%" }))
      .resolves.toMatchObject({ totalCount: 0 });
  });

  it("computes the dashboard metrics in a single pass", async () => {
    const metrics = await fetchDashboardMetrics();
    expect(metrics.total).toBe(metrics.pending + metrics.inReview + metrics.resolved);
    expect(metrics.resolved).toBe(1);
    expect(metrics.weeklyIncrement).toBe(metrics.total);
    expect(metrics.resolutionRate).toBe(Math.round((1 / metrics.total) * 100));
  });

  it("detaches photos only from resolved tickets older than the threshold", async () => {
    const referencedBefore = await fetchReferencedPhotoUrls();
    expect(referencedBefore).toHaveLength(2);

    await expect(purgeResolvedMedia(90)).resolves.toMatchObject({ purgedCount: 0, purgedUrls: [] });

    await db.query("UPDATE public.suggestions SET created_at = now() - interval '120 days' WHERE id = $1", [
      ticketId,
    ]);
    const purge = await purgeResolvedMedia(90);
    expect(purge.purgedCount).toBe(1);
    expect(purge.purgedUrls).toEqual([
      "/uploads/breakfast/2026/10/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.webp",
    ]);

    const details = await fetchTicketDetails(ticketCode);
    expect(details?.suggestion.photo_url).toBeNull();
    expect(details?.suggestion.message).toContain("avena"); // text is preserved
    expect(await fetchReferencedPhotoUrls()).toHaveLength(1);
  });
});

describe("menu rating service — one anonymous vote per shift", () => {
  let menuId: string;

  it("publishes a menu and replaces it on the same date and shift", async () => {
    const first = await upsertMenu({
      date: "2026-10-05", shift: "lunch", mainDish: "Puca picante",
      sideDish: "Sopa de morón", beverage: "Chicha morada", isActive: true,
    });
    const second = await upsertMenu({
      date: "2026-10-05", shift: "lunch", mainDish: "Puca picante con arroz",
      sideDish: null, beverage: null, isActive: true,
    });

    expect(second.id).toBe(first.id);
    expect(second).toMatchObject({ date: "2026-10-05", main_dish: "Puca picante con arroz", side_dish: null });
    menuId = first.id;
  });

  it("records a vote without any user identifier and blocks the second one", async () => {
    await expect(hasRatedToday(STUDENT, "lunch", NOW)).resolves.toBe(false);

    const receipt = await createMenuRating({
      email: STUDENT, menuId, shift: "lunch", ratingMain: 5, ratingSide: 4, now: NOW,
    });
    expect(receipt).toMatchObject({ success: true, menu_id: menuId, rating_date: "2026-10-05" });
    await expect(hasRatedToday(STUDENT, "lunch", NOW)).resolves.toBe(true);

    const { fields } = await db.query("SELECT * FROM public.menu_ratings");
    expect(fields.map((field) => field.name).sort()).toEqual([
      "created_at", "id", "menu_id", "rating_beverage", "rating_date",
      "rating_main", "rating_side", "shift",
    ]);
    expect(await dumpDatabase()).not.toContain(STUDENT);

    // The quota row keeps the day only; the rating keeps its precise instant.
    const stamps = await db.query<{ precise: number; shared: number }>(
      `SELECT (SELECT count(*)::int FROM public.menu_rating_limits
                WHERE created_at <> date_trunc('day', created_at)) AS precise,
              (SELECT count(*)::int FROM public.menu_rating_limits l
                 JOIN public.menu_ratings r ON r.created_at = l.created_at) AS shared`,
    );
    expect(stamps.rows[0]).toEqual({ precise: 0, shared: 0 });

    const duplicate = createMenuRating({ email: STUDENT, menuId, shift: "lunch", ratingMain: 1, now: NOW });
    await expect(duplicate).rejects.toBeInstanceOf(MenuRatingError);
    await expect(duplicate).rejects.toMatchObject({ alreadyRated: true });

    expect(await fetchRatingsForMenus([menuId])).toEqual([
      { menu_id: menuId, rating_main: 5, rating_side: 4, rating_beverage: null },
    ]);
  });

  it("rejects votes for a mismatched shift, a closed menu or an unknown menu", async () => {
    const other = "otra.alumna@unsch.edu.pe";

    await expect(
      createMenuRating({ email: other, menuId, shift: "dinner", ratingMain: 4, now: NOW }),
    ).rejects.toThrow("no coincide con el menú");

    await setMenuActive(menuId, false);
    await expect(
      createMenuRating({ email: other, menuId, shift: "lunch", ratingMain: 4, now: NOW }),
    ).rejects.toThrow("cerrada o inactiva");

    await expect(
      createMenuRating({
        email: other, menuId: "00000000-0000-4000-8000-000000000000", shift: "lunch", ratingMain: 4, now: NOW,
      }),
    ).rejects.toThrow("no existe");

    // A rejected vote must not consume the student's daily quota.
    await expect(hasRatedToday(other, "lunch", NOW)).resolves.toBe(false);
  });
});
