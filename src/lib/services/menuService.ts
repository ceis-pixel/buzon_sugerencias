import "server-only";

import { generateRateHash, getLimaDate } from "@/lib/auth/rateHash";
import { query, withTransaction } from "@/lib/db";
import type { DailyMenuRow, ShiftType } from "@/types/database.types";

const MENU_COLUMNS =
  "id, date, shift, main_dish, side_dish, beverage, published_by, is_active, created_at, updated_at";

/** Domain error whose message is already written for the student. */
export class MenuRatingError extends Error {
  constructor(
    message: string,
    readonly alreadyRated = false,
  ) {
    super(message);
    this.name = "MenuRatingError";
  }
}

export interface RatingScores {
  menu_id: string;
  rating_main: number;
  rating_side: number | null;
  rating_beverage: number | null;
}

export interface MenuPayload {
  date: string;
  shift: ShiftType;
  mainDish: string;
  sideDish: string | null;
  beverage: string | null;
  isActive: boolean;
}

export async function findMenuByDateAndShift(
  date: string,
  shift: ShiftType,
): Promise<DailyMenuRow | null> {
  const rows = await query<DailyMenuRow>(
    `SELECT ${MENU_COLUMNS} FROM public.daily_menus WHERE date = $1 AND shift = $2`,
    [date, shift],
  );
  return rows[0] ?? null;
}

export async function fetchRecentMenus(limit: number): Promise<DailyMenuRow[]> {
  return query<DailyMenuRow>(
    `SELECT ${MENU_COLUMNS}
       FROM public.daily_menus
      ORDER BY date DESC, created_at DESC
      LIMIT $1`,
    [Math.min(Math.max(1, Math.floor(limit)), 200)],
  );
}

/** Anonymous scores for the given menus; rows carry no user identifier. */
export async function fetchRatingsForMenus(menuIds: readonly string[]): Promise<RatingScores[]> {
  if (menuIds.length === 0) return [];

  return query<RatingScores>(
    `SELECT menu_id, rating_main, rating_side, rating_beverage
       FROM public.menu_ratings
      WHERE menu_id = ANY($1::uuid[])`,
    [menuIds],
  );
}

/** Creates the menu for a date and shift, or replaces the one already published. */
export async function upsertMenu(payload: MenuPayload): Promise<DailyMenuRow> {
  const rows = await query<DailyMenuRow>(
    `INSERT INTO public.daily_menus (date, shift, main_dish, side_dish, beverage, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (date, shift)
     DO UPDATE SET main_dish = EXCLUDED.main_dish,
                   side_dish = EXCLUDED.side_dish,
                   beverage = EXCLUDED.beverage,
                   is_active = EXCLUDED.is_active
     RETURNING ${MENU_COLUMNS}`,
    [payload.date, payload.shift, payload.mainDish, payload.sideDish, payload.beverage, payload.isActive],
  );
  return rows[0];
}

export async function updateMenu(id: string, payload: MenuPayload): Promise<DailyMenuRow | null> {
  const rows = await query<DailyMenuRow>(
    `UPDATE public.daily_menus
        SET date = $2, shift = $3, main_dish = $4, side_dish = $5, beverage = $6, is_active = $7
      WHERE id = $1
      RETURNING ${MENU_COLUMNS}`,
    [id, payload.date, payload.shift, payload.mainDish, payload.sideDish, payload.beverage, payload.isActive],
  );
  return rows[0] ?? null;
}

export async function setMenuActive(id: string, isActive: boolean): Promise<DailyMenuRow | null> {
  const rows = await query<DailyMenuRow>(
    `UPDATE public.daily_menus SET is_active = $2 WHERE id = $1 RETURNING ${MENU_COLUMNS}`,
    [id, isActive],
  );
  return rows[0] ?? null;
}

export interface MenuRatingInput {
  /** Verified session e-mail. Used only to derive the ephemeral hash; never stored. */
  email: string;
  menuId: string;
  shift: ShiftType;
  ratingMain: number;
  ratingSide?: number | null;
  ratingBeverage?: number | null;
  now?: Date;
}

export interface MenuRatingReceipt {
  success: true;
  id: string;
  menu_id: string;
  shift: ShiftType;
  rating_date: string;
  created_at: string;
}

/**
 * Zero-knowledge vote: one rating per student, per shift, per day. The quota
 * row holds only the ephemeral hash and shares no key with the rating row.
 */
export async function createMenuRating(input: MenuRatingInput): Promise<MenuRatingReceipt> {
  const ratingDate = getLimaDate(input.now);
  const rateHash = generateRateHash(input.email, input.shift, ratingDate);

  return withTransaction(async (tx) => {
    const menus = await tx.query<Pick<DailyMenuRow, "id" | "shift" | "is_active">>(
      "SELECT id, shift, is_active FROM public.daily_menus WHERE id = $1",
      [input.menuId],
    );
    const menu = menus[0];

    if (!menu) {
      throw new MenuRatingError("El menú especificado no existe.");
    }
    if (!menu.is_active) {
      throw new MenuRatingError("La calificación para este menú está cerrada o inactiva.");
    }
    if (menu.shift !== input.shift) {
      throw new MenuRatingError("El turno seleccionado no coincide con el menú.");
    }

    const quota = await tx.query<{ id: string }>(
      `INSERT INTO public.menu_rating_limits (rate_hash, shift, rating_date)
       VALUES ($1, $2, $3)
       ON CONFLICT (rate_hash, shift, rating_date) DO NOTHING
       RETURNING id`,
      [rateHash, input.shift, ratingDate],
    );

    if (quota.length === 0) {
      throw new MenuRatingError(
        "Ya registraste tu opinión para el turno de hoy. ¡Gracias por participar!",
        true,
      );
    }

    const [rating] = await tx.query<Omit<MenuRatingReceipt, "success">>(
      `INSERT INTO public.menu_ratings
              (menu_id, rating_main, rating_side, rating_beverage, shift, rating_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, menu_id, shift, rating_date, created_at`,
      [
        input.menuId,
        input.ratingMain,
        input.ratingSide ?? null,
        input.ratingBeverage ?? null,
        input.shift,
        ratingDate,
      ],
    );

    return { success: true, ...rating };
  });
}

/** Whether this student already rated the shift today (compares hashes only). */
export async function hasRatedToday(
  email: string,
  shift: ShiftType,
  now?: Date,
): Promise<boolean> {
  const ratingDate = getLimaDate(now);
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM public.menu_rating_limits
        WHERE rate_hash = $1 AND shift = $2 AND rating_date = $3
     ) AS exists`,
    [generateRateHash(email, shift, ratingDate), shift, ratingDate],
  );
  return rows[0]?.exists === true;
}
