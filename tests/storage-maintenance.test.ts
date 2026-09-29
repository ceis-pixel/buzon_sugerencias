import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);
let db: PGlite;

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(
    await readFile(new URL("./fixtures/supabase-bootstrap.sql", import.meta.url), "utf8"),
  );
  for (const name of (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(name, migrationsUrl), "utf8"));
  }
}, 60000);

afterAll(async () => {
  await db?.close();
});

describe("Sprint 10 — Issue 10.4: Storage Maintenance RPC purge_orphaned_or_old_media", () => {
  it("purges only photos from resolved tickets older than the threshold", async () => {
    // 1. Insert test records:
    // Row A: Resolved, 100 days old, has photo -> MUST be purged
    await db.query(`
      INSERT INTO public.suggestions (
        ticket_code, shift, category, message, photo_url, status, created_at, updated_at
      ) VALUES (
        'UNSCH-OLD1', 'lunch', 'menu', 'Sopa fría hace 100 días', 'lunch/old-photo.webp', 'resolved',
        now() - interval '100 days', now() - interval '100 days'
      )
    `);

    // Row B: Resolved, 10 days old, has photo -> MUST NOT be purged (< 90 days)
    await db.query(`
      INSERT INTO public.suggestions (
        ticket_code, shift, category, message, photo_url, status, created_at, updated_at
      ) VALUES (
        'UNSCH-REC1', 'lunch', 'menu', 'Guiso reciente hace 10 días', 'lunch/recent-photo.webp', 'resolved',
        now() - interval '10 days', now() - interval '10 days'
      )
    `);

    // Row C: Pending, 120 days old, has photo -> MUST NOT be purged (still pending evaluation)
    await db.query(`
      INSERT INTO public.suggestions (
        ticket_code, shift, category, message, photo_url, status, created_at, updated_at
      ) VALUES (
        'UNSCH-PND1', 'dinner', 'hygiene', 'Caso pendiente antiguo', 'dinner/pending-photo.webp', 'pending',
        now() - interval '120 days', now() - interval '120 days'
      )
    `);

    // The insertion trigger enforces status = 'pending' on INSERT.
    // Transition Row A and Row B to 'resolved' via UPDATE.
    await db.query(`
      UPDATE public.suggestions
      SET status = 'resolved'
      WHERE ticket_code IN ('UNSCH-OLD1', 'UNSCH-REC1')
    `);

    // 2. Execute maintenance RPC with 90-day threshold
    const { rows } = await db.query<{
      result: { success: boolean; purged_count: number; purged_urls: string[] };
    }>(`
      SELECT public.purge_orphaned_or_old_media(90) AS result
    `);

    const result = rows[0]?.result;
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.purged_count).toBe(1);
    expect(result.purged_urls).toContain("lunch/old-photo.webp");

    // 3. Inspect database rows to verify dissociation while retaining textual metadata
    const { rows: postRows } = await db.query<{
      ticket_code: string;
      photo_url: string | null;
      status: string;
      message: string;
    }>(`
      SELECT ticket_code, photo_url, status, message
      FROM public.suggestions
      WHERE ticket_code IN ('UNSCH-OLD1', 'UNSCH-REC1', 'UNSCH-PND1')
      ORDER BY ticket_code
    `);

    const oldRow = postRows.find((r) => r.ticket_code === "UNSCH-OLD1");
    const recRow = postRows.find((r) => r.ticket_code === "UNSCH-REC1");
    const pndRow = postRows.find((r) => r.ticket_code === "UNSCH-PND1");

    // Old resolved ticket has photo_url cleared to NULL, but message retained
    expect(oldRow?.photo_url).toBeNull();
    expect(oldRow?.message).toBe("Sopa fría hace 100 días");
    expect(oldRow?.status).toBe("resolved");

    // Recent resolved ticket retains photo_url
    expect(recRow?.photo_url).toBe("lunch/recent-photo.webp");

    // Pending ticket retains photo_url
    expect(pndRow?.photo_url).toBe("dinner/pending-photo.webp");

    // Clean up test rows
    await db.query(`
      DELETE FROM public.suggestions
      WHERE ticket_code IN ('UNSCH-OLD1', 'UNSCH-REC1', 'UNSCH-PND1')
    `);
  });
});
