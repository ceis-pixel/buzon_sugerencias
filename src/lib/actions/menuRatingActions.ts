"use server";

import { revalidatePath } from "next/cache";

import { getLimaDate } from "@/lib/auth/rateHash";
import { getInstitutionalSession, getVerifiedAdmin } from "@/lib/auth/session";
import {
  createMenuRating,
  fetchRatingsForMenus,
  fetchRecentMenus,
  findMenuByDateAndShift,
  hasRatedToday,
  MenuRatingError,
  setMenuActive,
  updateMenu,
  upsertMenu,
  type MenuPayload,
  type RatingScores,
} from "@/lib/services/menuService";
import {
  calculateRatingStats,
  dailyMenuSchema,
  mapMenuRatingError,
  menuRatingSchema,
  type DailyMenuInput,
  type MenuRatingInput,
} from "@/lib/validations/menuRatingSchema";
import type {
  DailyMenuRow,
  DailyMenuWithStats,
  ShiftType,
} from "@/types/database.types";

export interface MenuRatingResponse {
  success: boolean;
  message: string;
  data?: unknown;
  hasAlreadyRated?: boolean;
}

export interface DailyMenuActionResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
}

function revalidateMenuPaths(): void {
  try {
    revalidatePath("/");
    revalidatePath("/admin/analitica");
    revalidatePath("/admin/menus");
  } catch {
    // In isolated test environments revalidatePath is a no-op
  }
}

/**
 * Submits an anonymous, zero-knowledge menu rating for the current meal shift.
 * Enforces strictly 1 vote per authenticated student per shift per day.
 */
export async function submitMenuRating(
  input: MenuRatingInput,
): Promise<MenuRatingResponse> {
  const validation = menuRatingSchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      message:
        validation.error.issues[0]?.message ??
        "La calificación ingresada no cumple con los requisitos mínimos.",
    };
  }

  try {
    const session = await getInstitutionalSession();
    if (!session) {
      return {
        success: false,
        message: "Debes iniciar sesión con tu cuenta institucional @unsch.edu.pe para calificar.",
      };
    }

    const data = await createMenuRating({
      email: session.email,
      menuId: validation.data.menuId,
      shift: validation.data.shift,
      ratingMain: validation.data.ratingMain,
      ratingSide: validation.data.ratingSide ?? null,
      ratingBeverage: validation.data.ratingBeverage ?? null,
    });

    revalidateMenuPaths();

    return {
      success: true,
      message: "¡Calificación registrada con éxito! Tu opinión anónima impulsa la calidad del comedor.",
      data,
    };
  } catch (err) {
    if (err instanceof MenuRatingError) {
      return {
        success: false,
        message: mapMenuRatingError(err),
        hasAlreadyRated: err.alreadyRated,
      };
    }

    console.error("[submitMenuRating] Error:", (err as Error).message);
    return {
      success: false,
      message: "Ocurrió un error al registrar la calificación. Intenta nuevamente.",
      hasAlreadyRated: false,
    };
  }
}

/**
 * Checks if the current authenticated student has already rated the specified shift today.
 */
export async function checkHasUserRated(shift: ShiftType): Promise<boolean> {
  try {
    const session = await getInstitutionalSession();
    if (!session) return false;

    return await hasRatedToday(session.email, shift);
  } catch {
    return false;
  }
}

function groupRatings(ratings: RatingScores[]): Map<string, RatingScores[]> {
  const byMenu = new Map<string, RatingScores[]>();
  for (const rating of ratings) {
    const list = byMenu.get(rating.menu_id) || [];
    list.push(rating);
    byMenu.set(rating.menu_id, list);
  }
  return byMenu;
}

/**
 * Retrieves the published menu and aggregated real-time rating stats for a given shift and date.
 */
export async function getDailyMenuWithStats(
  shift: ShiftType,
  dateIso?: string,
): Promise<DailyMenuWithStats | null> {
  try {
    const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(dateIso ?? "") ? dateIso! : getLimaDate();

    const menu = await findMenuByDateAndShift(targetDate, shift);
    if (!menu) {
      return null;
    }

    const ratings = await fetchRatingsForMenus([menu.id]);

    return {
      ...menu,
      stats: calculateRatingStats(ratings),
    };
  } catch (err) {
    console.error("[getDailyMenuWithStats] Error querying menu:", (err as Error).message);
    return null;
  }
}

/**
 * Admin Action: Creates or updates a dining hall daily menu.
 * Restricted to active FUSCH / dining hall administrators.
 */
export async function saveDailyMenu(
  input: DailyMenuInput,
): Promise<DailyMenuActionResponse<DailyMenuRow>> {
  try {
    const admin = await getVerifiedAdmin();

    if (!admin) {
      return {
        success: false,
        data: null,
        message: "Acceso no autorizado. Se requieren permisos de moderador o administrador.",
      };
    }

    const validation = dailyMenuSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        data: null,
        message: validation.error.issues[0]?.message ?? "Datos del menú inválidos.",
      };
    }

    const payload: MenuPayload = {
      date: validation.data.date,
      shift: validation.data.shift,
      mainDish: validation.data.mainDish,
      sideDish: validation.data.sideDish || null,
      beverage: validation.data.beverage || null,
      isActive: validation.data.isActive,
    };

    const resultMenu = validation.data.id
      ? await updateMenu(validation.data.id, payload)
      : await upsertMenu(payload);

    if (!resultMenu) {
      return {
        success: false,
        data: null,
        message: "Error al actualizar el menú: el registro solicitado no existe.",
      };
    }

    revalidateMenuPaths();

    return {
      success: true,
      data: resultMenu,
      message: "Menú publicado y actualizado correctamente.",
    };
  } catch (err) {
    console.error("[saveDailyMenu] Exception:", (err as Error).message);
    return {
      success: false,
      data: null,
      message:
        (err as { code?: string }).code === "23505"
          ? "Ya existe un menú publicado para esa fecha y turno."
          : "Ocurrió una excepción al guardar la programación del menú.",
    };
  }
}

/**
 * Admin Action: Toggles menu rating receptivity (open / closed).
 */
export async function toggleMenuStatus(
  menuId: string,
  isActive: boolean,
): Promise<DailyMenuActionResponse<DailyMenuRow>> {
  try {
    const admin = await getVerifiedAdmin();

    if (!admin) {
      return {
        success: false,
        data: null,
        message: "Acceso no autorizado.",
      };
    }

    const menu = await setMenuActive(menuId, isActive);

    if (!menu) {
      return {
        success: false,
        data: null,
        message: "Error al actualizar estado del menú: el registro solicitado no existe.",
      };
    }

    revalidateMenuPaths();

    return {
      success: true,
      data: menu,
      message: isActive
        ? "Recepción de calificaciones reabierta con éxito."
        : "Recepción de calificaciones cerrada para este turno.",
    };
  } catch {
    return {
      success: false,
      data: null,
      message: "Excepción al cambiar estado del menú.",
    };
  }
}

/**
 * Retrieves historical menus with consolidated rating stats.
 */
export async function getRecentMenusWithStats(
  limit = 14,
): Promise<DailyMenuWithStats[]> {
  try {
    const menus = await fetchRecentMenus(limit);
    const ratingsByMenu = groupRatings(
      await fetchRatingsForMenus(menus.map((menu) => menu.id)),
    );

    return menus.map((menu) => ({
      ...menu,
      stats: calculateRatingStats(ratingsByMenu.get(menu.id) || []),
    }));
  } catch (err) {
    console.error("[getRecentMenusWithStats] Error:", (err as Error).message);
    return [];
  }
}
