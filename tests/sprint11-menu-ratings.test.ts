import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  checkHasUserRated,
  submitMenuRating,
} from "@/lib/actions/menuRatingActions";
import {
  calculateRatingStats,
  dailyMenuSchema,
  mapMenuRatingError,
  menuRatingSchema,
} from "@/lib/validations/menuRatingSchema";

// ============================================================================
// Unit Tests: Schemas, Stats Calculation & Error Mapping
// ============================================================================
describe("Sprint 11 — Issue 11.3: Validation Schemas & Error Mapping", () => {
  it("accepts valid menu rating input with mandatory main dish and optional components", () => {
    const valid = {
      menuId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      shift: "lunch",
      ratingMain: 5,
      ratingSide: 4,
      ratingBeverage: 3,
    };
    const result = menuRatingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts valid menu rating with only the mandatory main dish rating", () => {
    const minimal = {
      menuId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      shift: "dinner",
      ratingMain: 4,
    };
    const result = menuRatingSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("rejects ratings out of range (< 1 or > 5)", () => {
    const invalidLow = {
      menuId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      shift: "breakfast",
      ratingMain: 0,
    };
    const resLow = menuRatingSchema.safeParse(invalidLow);
    expect(resLow.success).toBe(false);

    const invalidHigh = {
      menuId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      shift: "breakfast",
      ratingMain: 6,
    };
    const resHigh = menuRatingSchema.safeParse(invalidHigh);
    expect(resHigh.success).toBe(false);
  });

  it("rejects non-integer star ratings", () => {
    const floatRating = {
      menuId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      shift: "lunch",
      ratingMain: 4.5,
    };
    const result = menuRatingSchema.safeParse(floatRating);
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUIDs for menuId", () => {
    const badId = {
      menuId: "not-a-valid-uuid",
      shift: "lunch",
      ratingMain: 4,
    };
    const result = menuRatingSchema.safeParse(badId);
    expect(result.success).toBe(false);
  });

  it("validates administrative dailyMenuSchema correctly", () => {
    const validMenu = {
      date: "2026-10-01",
      shift: "lunch",
      mainDish: "Seco de res con frijoles y arroz",
      sideDish: "Sopa de trigo",
      beverage: "Chicha morada",
      isActive: true,
    };
    const result = dailyMenuSchema.safeParse(validMenu);
    expect(result.success).toBe(true);

    const shortDish = {
      date: "2026-10-01",
      shift: "lunch",
      mainDish: "AB",
    };
    expect(dailyMenuSchema.safeParse(shortDish).success).toBe(false);

    const badDateFormat = {
      date: "01/10/2026",
      shift: "lunch",
      mainDish: "Plato de prueba",
    };
    expect(dailyMenuSchema.safeParse(badDateFormat).success).toBe(false);
  });

  it("maps domain and constraint errors to Peruvian Spanish user messages", () => {
    expect(
      mapMenuRatingError("Ya registraste tu opinión para el turno de hoy."),
    ).toContain("Ya registraste tu opinión");

    expect(
      mapMenuRatingError("violates unique constraint uq_menu_rate_hash_shift_date"),
    ).toContain("Ya registraste tu opinión para el turno de hoy");

    expect(
      mapMenuRatingError("Sesión no válida o expirada"),
    ).toContain("Debes iniciar sesión con tu cuenta institucional");

    expect(
      mapMenuRatingError("solo cuentas @unsch.edu.pe"),
    ).toContain("solo cuentas @unsch.edu.pe");

    expect(
      mapMenuRatingError("cerrada o inactiva"),
    ).toContain("cerrada o se encuentra inactiva");
  });
});

describe("Sprint 11 — Issue 11.4: Real-Time Satisfaction Thermometer Calculations", () => {
  it("handles empty ratings list with zeroes and nulls", () => {
    const stats = calculateRatingStats([]);
    expect(stats).toEqual({
      count: 0,
      avg_main: 0,
      avg_side: null,
      avg_beverage: null,
      avg_overall: 0,
    });
  });

  it("computes accurate component averages and composite satisfaction scores", () => {
    const sampleRatings = [
      { rating_main: 5, rating_side: 4, rating_beverage: 3 }, // avg: (5+4+3)/3 = 4.0
      { rating_main: 3, rating_side: null, rating_beverage: null }, // avg: 3.0
      { rating_main: 4, rating_side: 4, rating_beverage: 4 }, // avg: 4.0
    ];

    const stats = calculateRatingStats(sampleRatings);
    expect(stats.count).toBe(3);
    expect(stats.avg_main).toBe(4.0); // (5 + 3 + 4) / 3 = 4.0
    expect(stats.avg_side).toBe(4.0); // (4 + 4) / 2 = 4.0
    expect(stats.avg_beverage).toBe(3.5); // (3 + 4) / 2 = 3.5
    expect(stats.avg_overall).toBe(3.7); // (4.0 + 3.0 + 4.0) / 3 = 3.666... rounded to 3.7
  });
});

// ============================================================================
// Server Action Mock Tests
// ============================================================================
describe("Sprint 11 — Issue 11.3: Server Action Defensive Execution", () => {
  it("fails early on invalid input without hitting the Supabase client", async () => {
    const mockRpc = vi.fn();
    const mockClient = { rpc: mockRpc } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const res = await submitMenuRating(
      {
        menuId: "invalid-id",
        shift: "lunch",
        ratingMain: 5,
      },
      { supabase: mockClient },
    );

    expect(res.success).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("handles duplicate rating error by returning hasAlreadyRated: true", async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Ya registraste tu opinión para el turno de hoy. ¡Gracias por participar!" },
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const res = await submitMenuRating(
      {
        menuId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        shift: "lunch",
        ratingMain: 5,
      },
      { supabase: mockClient },
    );

    expect(res.success).toBe(false);
    expect(res.hasAlreadyRated).toBe(true);
    expect(res.message).toContain("Ya registraste tu opinión");
  });

  it("checks whether student has rated using has_user_rated_today RPC", async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: true,
        error: null,
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const hasRated = await checkHasUserRated("lunch", { supabase: mockClient });
    expect(hasRated).toBe(true);
  });
});

// ============================================================================
// PGLite Integration Tests: Migration, RPC & Zero-Knowledge Anti-Spam
// ============================================================================
describe("Sprint 11 — Issue 11.1: Database Migrations & submit_menu_rating RPC Integration", () => {
  const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(
      await readFile(new URL("./fixtures/supabase-bootstrap.sql", import.meta.url), "utf8"),
    );

    for (const name of (await readdir(migrationsUrl))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await db.exec(await readFile(new URL(name, migrationsUrl), "utf8"));
    }
  }, 60000);

  afterAll(async () => {
    await db?.close();
  });

  it("verifies daily_menus, menu_ratings, and menu_rating_limits tables exist", async () => {
    const tables = await db.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('daily_menus', 'menu_ratings', 'menu_rating_limits')",
    );
    const names = tables.rows.map((r) => r.tablename).sort();
    expect(names).toEqual(["daily_menus", "menu_rating_limits", "menu_ratings"]);
  });

  it("inserts a daily menu and enforces uniqueness on (date, shift)", async () => {
    const insertQuery = `
      INSERT INTO public.daily_menus (date, shift, main_dish, side_dish, beverage, is_active)
      VALUES (CURRENT_DATE, 'lunch', 'Picante de cuy con arroz y papa', 'Caldo de gallina', 'Chicha de jora', true)
      RETURNING id, date, shift, main_dish, is_active
    `;
    const { rows } = await db.query<{ id: string; main_dish: string }>(insertQuery);
    expect(rows.length).toBe(1);
    expect(rows[0].main_dish).toBe("Picante de cuy con arroz y papa");

    // Second insert with same date and shift must fail unique constraint
    await expect(db.query(insertQuery)).rejects.toMatchObject({
      code: "23505", // PostgreSQL unique_violation code
    });
  });

  it("executes submit_menu_rating RPC anonymously and prevents multiple votes on the same shift", async () => {
    // 1. Get the menu id inserted previously
    const menuResult = await db.query<{ id: string }>(
      "SELECT id FROM public.daily_menus WHERE date = CURRENT_DATE AND shift = 'lunch'",
    );
    const menuId = menuResult.rows[0].id;

    // 2. Set authenticated context as institutional student
    const studentUid = "11111111-2222-3333-4444-555555555555";
    const studentJwt = JSON.stringify({
      sub: studentUid,
      email: "estudiante.test@unsch.edu.pe",
      role: "authenticated",
    });

    await db.query(`SELECT set_config('request.jwt.claims', $1, false)`, [studentJwt]);

    // 3. Before rating, has_user_rated_today should return false
    const checkBefore = await db.query<{ has_user_rated_today: boolean }>(
      "SELECT public.has_user_rated_today('lunch') as has_user_rated_today",
    );
    expect(checkBefore.rows[0].has_user_rated_today).toBe(false);

    // 4. Submit rating via RPC
    const rpcResult = await db.query<{ submit_menu_rating: { success: boolean; id: string } }>(
      `SELECT public.submit_menu_rating($1, 'lunch'::public.shift_type, 5::smallint, 4::smallint, 5::smallint) as submit_menu_rating`,
      [menuId],
    );
    expect(rpcResult.rows[0].submit_menu_rating.success).toBe(true);

    // 5. Verify the rating in menu_ratings is strictly dissociated (NO user id or student email)
    const storedRating = await db.query(
      `SELECT * FROM public.menu_ratings WHERE menu_id = $1`,
      [menuId],
    );
    expect(storedRating.rows.length).toBe(1);
    const ratingRow = storedRating.rows[0] as Record<string, unknown>;
    expect(ratingRow.rating_main).toBe(5);
    expect(ratingRow.rating_side).toBe(4);
    expect(ratingRow.rating_beverage).toBe(5);
    expect(ratingRow).not.toHaveProperty("user_id");
    expect(ratingRow).not.toHaveProperty("email");

    // 6. After rating, has_user_rated_today should return true
    const checkAfter = await db.query<{ has_user_rated_today: boolean }>(
      "SELECT public.has_user_rated_today('lunch') as has_user_rated_today",
    );
    expect(checkAfter.rows[0].has_user_rated_today).toBe(true);

    // 7. A second rating attempt by the same student for the same shift MUST fail
    await expect(
      db.query(
        `SELECT public.submit_menu_rating($1, 'lunch'::public.shift_type, 4::smallint, 3::smallint, 4::smallint)`,
        [menuId],
      ),
    ).rejects.toThrowError(/Ya registraste tu opinión para el turno de hoy/);
  });

  it("rejects menu rating submissions from non-UNSCH accounts", async () => {
    const menuResult = await db.query<{ id: string }>(
      "SELECT id FROM public.daily_menus WHERE date = CURRENT_DATE AND shift = 'lunch'",
    );
    const menuId = menuResult.rows[0].id;

    // Set non-institutional JWT
    const externalJwt = JSON.stringify({
      sub: "99999999-8888-7777-6666-555555555555",
      email: "impostor@gmail.com",
      role: "authenticated",
    });

    await db.query(`SELECT set_config('request.jwt.claims', $1, false)`, [externalJwt]);

    await expect(
      db.query(
        `SELECT public.submit_menu_rating($1, 'lunch'::public.shift_type, 5::smallint, NULL, NULL)`,
        [menuId],
      ),
    ).rejects.toThrowError(/solo cuentas @unsch.edu.pe pueden calificar el menú/);
  });
});
