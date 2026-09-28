import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from "vitest";

import type { NewSuggestion, SuggestionInsert } from "@/types/database.types";

const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);
const triggerMigration = "20260922000006_create_suggestions_triggers.sql";
let db: PGlite;

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(await readFile(new URL("./fixtures/supabase-bootstrap.sql", import.meta.url), "utf8"));
  for (const name of (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(name, migrationsUrl), "utf8"));
  }
}, 60000);

afterAll(async () => { await db?.close(); });

describe("Sprint 3 and Sprint 4 migration integration", () => {
  it("applies all migrations and leaves no self-test suggestion behind", async () => {
    expect((await db.query("SELECT id FROM public.suggestions")).rows).toEqual([]);
    const result = await db.query<{ tgname: string }>("SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.suggestions'::regclass AND NOT tgisinternal ORDER BY tgname");
    expect(result.rows.map((row) => row.tgname)).toEqual(["tr_set_suggestion_defaults", "tr_set_suggestions_updated_at"]);
  });

  it("accepts a minimal typed insert with database-owned fields omitted", () => {
    const payload = { shift: "lunch", category: "menu", message: "Una propuesta de prueba." } satisfies NewSuggestion;
    expectTypeOf(payload).toExtend<SuggestionInsert>();
    expectTypeOf<SuggestionInsert["ticket_code"]>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<SuggestionInsert["created_at"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<SuggestionInsert["updated_at"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<SuggestionInsert["status"]>().toEqualTypeOf<"pending" | "in_review" | "resolved" | undefined>();
    // @ts-expect-error Browser payloads must not carry generated codes.
    const invalid: NewSuggestion = { ...payload, ticket_code: "UNSCH-2345" };
    expect(Object.keys(invalid)).toContain("ticket_code");
  });

  it.each(["UTC", "America/Lima", "Asia/Tokyo"])("uses consistent instants with the session time zone %s", async (zone) => {
    await db.query("SELECT set_config('TimeZone', $1, false)", [zone]);
    const { rows } = await db.query<{ ticket_code: string; status: string; synchronized: boolean }>(`
      INSERT INTO public.suggestions (shift, category, message)
      VALUES ('lunch', 'service', 'Una sugerencia de prueba.')
      RETURNING ticket_code, status, (created_at = now() AND updated_at = created_at) AS synchronized
    `);
    expect(rows[0].ticket_code).toMatch(/^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
    expect(rows[0]).toMatchObject({ status: "pending", synchronized: true });
  });

  it.each([null, "", "   "])("generates a code for %j and prevents a supplied resolved status", async (code) => {
    const { rows } = await db.query<{ ticket_code: string; status: string; synchronized: boolean }>(`
      INSERT INTO public.suggestions (shift, category, message, ticket_code, status, created_at, updated_at)
      VALUES ('breakfast', 'menu', 'Una sugerencia de prueba.', $1, 'resolved', NULL, '2000-01-01Z')
      RETURNING ticket_code, status, (created_at = now() AND updated_at = created_at) AS synchronized
    `, [code]);
    expect(rows[0].ticket_code).toMatch(/^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
    expect(rows[0]).toMatchObject({ status: "pending", synchronized: true });
  });

  it("preserves explicit code and creation time, initializes null status, and rejects duplicates", async () => {
    const query = `INSERT INTO public.suggestions (shift, category, message, ticket_code, status, created_at)
      VALUES ('dinner', 'hygiene', 'Una sugerencia de prueba.', 'UNSCH-TEST', NULL, '2020-01-01T00:00:00Z')
      RETURNING status, (created_at = '2020-01-01T00:00:00Z'::timestamptz AND updated_at = now()) AS correct`;
    expect((await db.query(query)).rows[0]).toMatchObject({ status: "pending", correct: true });
    await expect(db.query(query)).rejects.toMatchObject({ code: "23505" });
  });

  it("updates timestamps without resetting code, creation time or the moderator's status", async () => {
    const { rows } = await db.query(`UPDATE public.suggestions SET status = 'in_review', updated_at = '2000-01-01Z'
      WHERE ticket_code = 'UNSCH-TEST'
      RETURNING ticket_code, status, (created_at = '2020-01-01Z'::timestamptz AND updated_at = now()) AS correct`);
    expect(rows[0]).toMatchObject({ ticket_code: "UNSCH-TEST", status: "in_review", correct: true });
  });

  it("assigns distinct codes during a multi-row insert", async () => {
    const { rows } = await db.query<{ ticket_code: string }>(`INSERT INTO public.suggestions (shift, category, message)
      SELECT 'lunch', 'service', 'Prueba de inserción múltiple.' FROM generate_series(1, 128)
      RETURNING ticket_code`);
    expect(new Set(rows.map((row) => row.ticket_code)).size).toBe(128);
    expect(rows.every((row) => /^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(row.ticket_code))).toBe(true);
  });

  it("enforces defaults for actual anonymous inserts even though RLS hides existing rows", async () => {
    await db.exec("SET ROLE anon");
    try {
      await db.exec(`INSERT INTO public.suggestions (shift, category, message, status)
        VALUES ('lunch', 'service', 'Inserción anónima de prueba.', 'resolved')`);
      expect((await db.query("SELECT * FROM public.suggestions")).rows).toEqual([]);
    } finally { await db.exec("RESET ROLE"); }
    expect((await db.query("SELECT status FROM public.suggestions WHERE message = 'Inserción anónima de prueba.'")).rows).toEqual([{ status: "pending" }]);
  });

  it("keeps schema constraints and the public storage bucket settings", async () => {
    await expect(db.exec("INSERT INTO public.suggestions (shift, category, message) VALUES ('lunch', 'menu', 'corto')")).rejects.toMatchObject({ code: "23514" });
    expect((await db.query("SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'suggestion-media'")).rows[0]).toEqual({ public: true, file_size_limit: 1048576, allowed_mime_types: ["image/webp", "image/jpeg", "image/png"] });
  });

  it("hides internal responses from the public and exposes them only to active admins", async () => {
    await db.exec(`INSERT INTO public.ticket_responses (suggestion_id, responder_email, response_text, is_internal)
      SELECT id, 'salud.fusch@unsch.edu.pe', 'Respuesta de prueba.', internal
      FROM public.suggestions CROSS JOIN (VALUES (false), (true)) AS flags(internal)
      WHERE ticket_code = 'UNSCH-TEST'`);
    await db.exec("SET ROLE anon");
    try { expect((await db.query("SELECT is_internal FROM public.ticket_responses")).rows).toEqual([{ is_internal: false }]); }
    finally { await db.exec("RESET ROLE"); }
    await db.query("SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify({ email: "salud.fusch@unsch.edu.pe", role: "authenticated" })]);
    await db.exec("SET ROLE authenticated");
    try {
      expect((await db.query("SELECT public.is_admin() AS allowed")).rows).toEqual([{ allowed: true }]);
      expect((await db.query("SELECT * FROM public.ticket_responses")).rows).toHaveLength(2);
    } finally { await db.exec("RESET ROLE"); }
  });

  it("denies internal notes to inactive admins and unlisted authenticated users", async () => {
    const { rows: suggestions } = await db.query<{ id: string }>("SELECT id FROM public.suggestions WHERE ticket_code = 'UNSCH-TEST'");
    await db.exec("UPDATE public.admins SET is_active = false WHERE email = 'salud.fusch@unsch.edu.pe'");
    for (const email of ["salud.fusch@unsch.edu.pe", "student@unsch.edu.pe"]) {
      await db.query("SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify({ email, role: "authenticated" })]);
      await db.exec("SET ROLE authenticated");
      try {
        expect((await db.query("SELECT public.is_admin() AS allowed")).rows).toEqual([{ allowed: false }]);
        expect((await db.query("SELECT is_internal FROM public.ticket_responses")).rows).toEqual([{ is_internal: false }]);
        await expect(db.query(`INSERT INTO public.ticket_responses (suggestion_id, responder_email, response_text)
          VALUES ($1, 'salud.fusch@unsch.edu.pe', 'Una respuesta de prueba.')`, [suggestions[0].id])).rejects.toMatchObject({ code: "42501" });
      } finally { await db.exec("RESET ROLE"); }
    }
    await db.exec("UPDATE public.admins SET is_active = true WHERE email = 'salud.fusch@unsch.edu.pe'");
  });

  it("allows active admins to read and update suggestions while denying unlisted users", async () => {
    // Active admin credentials
    await db.query("SELECT set_config('request.jwt.claims', $1, false)", [
      JSON.stringify({ email: "salud.fusch@unsch.edu.pe", role: "authenticated" }),
    ]);
    await db.exec("SET ROLE authenticated");
    try {
      const suggestions = (await db.query("SELECT * FROM public.suggestions WHERE ticket_code = 'UNSCH-TEST'")).rows;
      expect(suggestions.length).toBe(1);
      const updateResult = await db.query(
        "UPDATE public.suggestions SET status = 'in_review' WHERE ticket_code = 'UNSCH-TEST' RETURNING status",
      );
      expect(updateResult.rows[0]).toEqual({ status: "in_review" });
    } finally {
      await db.exec("RESET ROLE");
    }

    // Unlisted student credentials
    await db.query("SELECT set_config('request.jwt.claims', $1, false)", [
      JSON.stringify({ email: "student@unsch.edu.pe", role: "authenticated" }),
    ]);
    await db.exec("SET ROLE authenticated");
    try {
      expect((await db.query("SELECT * FROM public.suggestions")).rows).toEqual([]);
      const updateResult = await db.query(
        "UPDATE public.suggestions SET status = 'resolved' WHERE ticket_code = 'UNSCH-TEST' RETURNING status",
      );
      expect(updateResult.rows).toEqual([]);
    } finally {
      await db.exec("RESET ROLE");
    }
  });

  it("applies storage policies to anonymous, student and admin operations", async () => {
    await db.exec("SET ROLE anon");
    try {
      await expect(db.exec("INSERT INTO storage.objects (bucket_id, name) VALUES ('suggestion-media', 'anon.png')")).rejects.toMatchObject({ code: "42501" });
    } finally { await db.exec("RESET ROLE"); }
    await db.query("SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify({ email: "student@unsch.edu.pe", role: "authenticated" })]);
    await db.exec("SET ROLE authenticated");
    try {
      await db.exec("INSERT INTO storage.objects (bucket_id, name) VALUES ('suggestion-media', 'student.png')");
      expect((await db.query("DELETE FROM storage.objects WHERE name = 'student.png' RETURNING id")).rows).toEqual([]);
    } finally { await db.exec("RESET ROLE"); }
    await db.query("SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify({ email: "salud.fusch@unsch.edu.pe", role: "authenticated" })]);
    await db.exec("SET ROLE authenticated");
    try { expect((await db.query("DELETE FROM storage.objects WHERE name = 'student.png' RETURNING id")).rows).toHaveLength(1); }
    finally { await db.exec("RESET ROLE"); }
  });

  it("reapplies the trigger migration without duplicating triggers or deleting real rows", async () => {
    const before = (await db.query("SELECT id FROM public.suggestions ORDER BY id")).rows;
    await db.exec(await readFile(new URL(triggerMigration, migrationsUrl), "utf8"));
    expect((await db.query("SELECT id FROM public.suggestions ORDER BY id")).rows).toEqual(before);
  });

  describe("submit_anonymous_suggestion RPC security and identity dissociation", () => {
    it("denies execution to the anonymous role", async () => {
      await db.exec("SET ROLE anon");
      try {
        await expect(
          db.query(
            "SELECT public.submit_anonymous_suggestion('lunch'::public.shift_type, 'menu'::public.suggestion_category, 'Mejorar el menú del almuerzo institucional.')",
          ),
        ).rejects.toMatchObject({ code: "42501" });
      } finally {
        await db.exec("RESET ROLE");
      }
    });

    it("rejects submission when session is missing or expired (auth.uid() is null)", async () => {
      await db.query("SELECT set_config('request.jwt.claims', '', false)");
      await db.exec("SET ROLE authenticated");
      try {
        await expect(
          db.query(
            "SELECT public.submit_anonymous_suggestion('lunch'::public.shift_type, 'menu'::public.suggestion_category, 'Mejorar el menú del almuerzo institucional.')",
          ),
        ).rejects.toThrow("Sesión no válida o expirada. Debes iniciar sesión institucional.");
      } finally {
        await db.exec("RESET ROLE");
      }
    });

    it("rejects submission from non-institutional email domains", async () => {
      await db.query("SELECT set_config('request.jwt.claims', $1, false)", [
        JSON.stringify({
          sub: "11111111-1111-1111-1111-111111111111",
          email: "student@gmail.com",
          role: "authenticated",
        }),
      ]);
      await db.exec("SET ROLE authenticated");
      try {
        await expect(
          db.query(
            "SELECT public.submit_anonymous_suggestion('dinner'::public.shift_type, 'portion'::public.suggestion_category, 'Porciones adecuadas en la cena.')",
          ),
        ).rejects.toThrow("Acceso denegado: solo cuentas @unsch.edu.pe pueden enviar sugerencias.");
      } finally {
        await db.exec("RESET ROLE");
      }
    });

    it("validates message length constraints in the database function", async () => {
      await db.query("SELECT set_config('request.jwt.claims', $1, false)", [
        JSON.stringify({
          sub: "11111111-1111-1111-1111-111111111111",
          email: "student@unsch.edu.pe",
          role: "authenticated",
        }),
      ]);
      await db.exec("SET ROLE authenticated");
      try {
        await expect(
          db.query(
            "SELECT public.submit_anonymous_suggestion('breakfast'::public.shift_type, 'hygiene'::public.suggestion_category, '   corto   ')",
          ),
        ).rejects.toThrow("El mensaje es demasiado corto (mínimo 10 caracteres).");

        const longMessage = "a".repeat(501);
        await expect(
          db.query(
            "SELECT public.submit_anonymous_suggestion('breakfast'::public.shift_type, 'hygiene'::public.suggestion_category, $1)",
            [longMessage],
          ),
        ).rejects.toThrow("El mensaje excede el límite máximo de 500 caracteres.");
      } finally {
        await db.exec("RESET ROLE");
      }
    });

    it("records dissociated suggestion for authenticated unsch student and triggers ticket code", async () => {
      const studentSub = "22222222-2222-2222-2222-222222222222";
      await db.query("SELECT set_config('request.jwt.claims', $1, false)", [
        JSON.stringify({
          sub: studentSub,
          email: "alumno.regular@unsch.edu.pe",
          role: "authenticated",
        }),
      ]);
      await db.exec("SET ROLE authenticated");

      let ticketResult: {
        id: string;
        ticket_code: string;
        shift: string;
        category: string;
        status: string;
        created_at: string;
      };

      try {
        const { rows } = await db.query<{ result: typeof ticketResult }>(
          "SELECT public.submit_anonymous_suggestion('lunch'::public.shift_type, 'service'::public.suggestion_category, 'Excelente atención en las mesas del comedor.', 'https://storage.supabase.co/img.webp') AS result",
        );
        ticketResult = rows[0].result;
      } finally {
        await db.exec("RESET ROLE");
      }

      expect(ticketResult.id).toBeDefined();
      expect(ticketResult.ticket_code).toMatch(/^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
      expect(ticketResult.shift).toBe("lunch");
      expect(ticketResult.category).toBe("service");
      expect(ticketResult.status).toBe("pending");
      expect(ticketResult.created_at).toBeDefined();

      // Verify stored row does not contain any user identifier or email
      const { rows: storedRows } = await db.query<Record<string, unknown>>(
        "SELECT * FROM public.suggestions WHERE id = $1::uuid",
        [ticketResult.id],
      );
      expect(storedRows).toHaveLength(1);
      const stored = storedRows[0];
      expect(stored.ticket_code).toBe(ticketResult.ticket_code);
      expect(stored.photo_url).toBe("https://storage.supabase.co/img.webp");
      expect(Object.keys(stored)).toEqual([
        "id",
        "ticket_code",
        "shift",
        "category",
        "message",
        "photo_url",
        "status",
        "created_at",
        "updated_at",
      ]);
      // Ensure no studentSub or email is stored anywhere
      expect(JSON.stringify(stored)).not.toContain(studentSub);
      expect(JSON.stringify(stored)).not.toContain("alumno.regular@unsch.edu.pe");
    });
  });

  describe("ephemeral salted hash rate limiting and anti-spam quota enforcement", () => {
    it("protects submission_rate_limits table with RLS and denies direct access to anon and authenticated", async () => {
      const { rows: rlsRows } = await db.query<{ relrowsecurity: boolean }>(
        "SELECT relrowsecurity FROM pg_class WHERE relname = 'submission_rate_limits'",
      );
      expect(rlsRows[0]?.relrowsecurity).toBe(true);

      await db.exec("SET ROLE anon");
      try {
        await expect(db.query("SELECT * FROM public.submission_rate_limits")).rejects.toMatchObject({
          code: "42501",
        });
      } finally {
        await db.exec("RESET ROLE");
      }

      await db.exec("SET ROLE authenticated");
      try {
        await expect(db.query("SELECT * FROM public.submission_rate_limits")).rejects.toMatchObject({
          code: "42501",
        });
      } finally {
        await db.exec("RESET ROLE");
      }
    });

    it("enforces max 2 submissions per shift per student per day, allows another shift, and keeps zero-knowledge anonymity", async () => {
      const studentSub = "33333333-3333-3333-3333-333333333333";
      const studentEmail = "estudiante.activo@unsch.edu.pe";

      await db.query("SELECT set_config('request.jwt.claims', $1, false)", [
        JSON.stringify({
          sub: studentSub,
          email: studentEmail,
          role: "authenticated",
        }),
      ]);
      await db.exec("SET ROLE authenticated");

      try {
        // Intento 1 (lunch): Exitoso
        const { rows: res1 } = await db.query<{ result: { ticket_code: string; shift: string } }>(
          "SELECT public.submit_anonymous_suggestion('lunch'::public.shift_type, 'menu'::public.suggestion_category, 'Primer reporte válido para el almuerzo.') AS result",
        );
        expect(res1[0].result.ticket_code).toMatch(/^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
        expect(res1[0].result.shift).toBe("lunch");

        // Intento 2 (lunch): Exitoso
        const { rows: res2 } = await db.query<{ result: { ticket_code: string; shift: string } }>(
          "SELECT public.submit_anonymous_suggestion('lunch'::public.shift_type, 'service'::public.suggestion_category, 'Segundo reporte válido para el almuerzo.') AS result",
        );
        expect(res2[0].result.ticket_code).toMatch(/^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
        expect(res2[0].result.shift).toBe("lunch");

        // Intento 3 (lunch): Falla con la excepción de límite alcanzado
        await expect(
          db.query(
            "SELECT public.submit_anonymous_suggestion('lunch'::public.shift_type, 'portion'::public.suggestion_category, 'Tercer reporte excediendo la cuota permitida.')",
          ),
        ).rejects.toThrow(
          "Has alcanzado el límite de 2 reportes para este turno (lunch). Podrás enviar otra observación en el siguiente turno.",
        );

        // Intento en turno distinto (dinner): Exitoso
        const { rows: resDinner } = await db.query<{ result: { ticket_code: string; shift: string } }>(
          "SELECT public.submit_anonymous_suggestion('dinner'::public.shift_type, 'hygiene'::public.suggestion_category, 'Reporte de la cena en turno independiente.') AS result",
        );
        expect(resDinner[0].result.ticket_code).toMatch(/^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
        expect(resDinner[0].result.shift).toBe("dinner");
      } finally {
        await db.exec("RESET ROLE");
      }

      // Verificación de cuota independiente para otro estudiante (estudiante 2)
      const otherStudentSub = "44444444-4444-4444-4444-444444444444";
      await db.query("SELECT set_config('request.jwt.claims', $1, false)", [
        JSON.stringify({
          sub: otherStudentSub,
          email: "otro.alumno@unsch.edu.pe",
          role: "authenticated",
        }),
      ]);
      await db.exec("SET ROLE authenticated");

      try {
        const { rows: resOther } = await db.query<{ result: { ticket_code: string; shift: string } }>(
          "SELECT public.submit_anonymous_suggestion('lunch'::public.shift_type, 'menu'::public.suggestion_category, 'Reporte de otro alumno en el turno de almuerzo.') AS result",
        );
        expect(resOther[0].result.ticket_code).toMatch(/^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
      } finally {
        await db.exec("RESET ROLE");
      }

      // Verificación criptográfica y de anonimato en submission_rate_limits
      const { rows: rateLimits } = await db.query<{
        rate_hash: string;
        shift: string;
        submission_count: number;
      }>("SELECT rate_hash, shift, submission_count FROM public.submission_rate_limits ORDER BY shift, submission_count");

      expect(rateLimits.length).toBeGreaterThanOrEqual(3);
      for (const row of rateLimits) {
        expect(row.rate_hash).toMatch(/^[a-f0-9]{64}$/);
        // Verificar que no se expone ningún ID ni correo de estudiante en la tabla
        expect(row.rate_hash).not.toContain(studentSub);
        expect(row.rate_hash).not.toContain(studentEmail);
        expect(row.rate_hash).not.toContain(otherStudentSub);
      }

      // Verificar que los hashes para lunch de dos estudiantes distintos sean diferentes
      const lunchHashes = rateLimits.filter((r) => r.shift === "lunch").map((r) => r.rate_hash);
      expect(new Set(lunchHashes).size).toBe(lunchHashes.length);
    });
  });
});
