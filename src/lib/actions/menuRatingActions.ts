"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getVerifiedAdmin } from "@/lib/actions/adminActions";
import { createClient } from "@/lib/supabase/server";
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
  Database,
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

/**
 * Submits an anonymous, zero-knowledge menu rating for the current meal shift.
 * Enforces strictly 1 vote per authenticated student per shift per day.
 */
export async function submitMenuRating(
  input: MenuRatingInput,
  options?: { supabase?: SupabaseClient<Database> },
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
    const supabase = options?.supabase ?? (await createClient());

    const { data, error } = await supabase.rpc("submit_menu_rating", {
      p_menu_id: validation.data.menuId,
      p_shift: validation.data.shift,
      p_rating_main: validation.data.ratingMain,
      p_rating_side: validation.data.ratingSide ?? null,
      p_rating_beverage: validation.data.ratingBeverage ?? null,
    });

    if (error) {
      const mapped = mapMenuRatingError(error);
      const hasAlreadyRated =
        mapped.includes("Ya registraste tu opinión") ||
        error.message?.includes("Ya registraste tu opinión");

      return {
        success: false,
        message: mapped,
        hasAlreadyRated,
      };
    }

    // Cache revalidation across public and admin pages
    try {
      revalidatePath("/");
      revalidatePath("/admin/analitica");
      revalidatePath("/admin/menus");
    } catch {
      // In isolated test environments revalidatePath is a no-op
    }

    return {
      success: true,
      message: "¡Calificación registrada con éxito! Tu opinión anónima impulsa la calidad del comedor.",
      data,
    };
  } catch (err) {
    const mapped = mapMenuRatingError(err);
    return {
      success: false,
      message: mapped,
      hasAlreadyRated: mapped.includes("Ya registraste tu opinión"),
    };
  }
}

/**
 * Checks if the current authenticated student has already rated the specified shift today.
 */
export async function checkHasUserRated(
  shift: ShiftType,
  options?: { supabase?: SupabaseClient<Database> },
): Promise<boolean> {
  try {
    const supabase = options?.supabase ?? (await createClient());
    const { data, error } = await supabase.rpc("has_user_rated_today", {
      p_shift: shift,
    });

    if (error || typeof data !== "boolean") {
      return false;
    }

    return data;
  } catch {
    return false;
  }
}

/**
 * Retrieves the published menu and aggregated real-time rating stats for a given shift and date.
 */
export async function getDailyMenuWithStats(
  shift: ShiftType,
  dateIso?: string,
  options?: { supabase?: SupabaseClient<Database> },
): Promise<DailyMenuWithStats | null> {
  try {
    const supabase = options?.supabase ?? (await createClient());
    const targetDate = dateIso || new Date().toISOString().split("T")[0];

    const { data: menu, error: menuError } = await supabase
      .from("daily_menus")
      .select("*")
      .eq("date", targetDate)
      .eq("shift", shift)
      .maybeSingle();

    if (menuError || !menu) {
      return null;
    }

    const { data: ratings, error: ratingsError } = await supabase
      .from("menu_ratings")
      .select("rating_main, rating_side, rating_beverage")
      .eq("menu_id", menu.id);

    const stats = calculateRatingStats(ratingsError ? [] : ratings ?? []);

    return {
      ...(menu as DailyMenuRow),
      stats,
    };
  } catch (err) {
    console.error("[getDailyMenuWithStats] Error querying menu:", err);
    return null;
  }
}

/**
 * Admin Action: Creates or updates a dining hall daily menu.
 * Restricted to active FUSCH / dining hall administrators.
 */
export async function saveDailyMenu(
  input: DailyMenuInput,
  options?: { supabase?: SupabaseClient<Database> },
): Promise<DailyMenuActionResponse<DailyMenuRow>> {
  try {
    const supabase = options?.supabase ?? (await createClient());
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

    const payload = {
      date: validation.data.date,
      shift: validation.data.shift,
      main_dish: validation.data.mainDish,
      side_dish: validation.data.sideDish || null,
      beverage: validation.data.beverage || null,
      is_active: validation.data.isActive,
    };

    let resultMenu: DailyMenuRow | null = null;

    if (validation.data.id) {
      const { data, error } = await supabase
        .from("daily_menus")
        .update(payload)
        .eq("id", validation.data.id)
        .select("*")
        .single();

      if (error) {
        return {
          success: false,
          data: null,
          message: `Error al actualizar el menú: ${error.message}`,
        };
      }
      resultMenu = data as DailyMenuRow;
    } else {
      const { data, error } = await supabase
        .from("daily_menus")
        .upsert(payload, { onConflict: "date,shift" })
        .select("*")
        .single();

      if (error) {
        return {
          success: false,
          data: null,
          message: `Error al guardar el menú: ${error.message}`,
        };
      }
      resultMenu = data as DailyMenuRow;
    }

    try {
      revalidatePath("/");
      revalidatePath("/admin/menus");
      revalidatePath("/admin/analitica");
    } catch {
      // In tests
    }

    return {
      success: true,
      data: resultMenu,
      message: "Menú publicado y actualizado correctamente.",
    };
  } catch (err) {
    console.error("[saveDailyMenu] Exception:", err);
    return {
      success: false,
      data: null,
      message: "Ocurrió una excepción al guardar la programación del menú.",
    };
  }
}

/**
 * Admin Action: Toggles menu rating receptivity (open / closed).
 */
export async function toggleMenuStatus(
  menuId: string,
  isActive: boolean,
  options?: { supabase?: SupabaseClient<Database> },
): Promise<DailyMenuActionResponse<DailyMenuRow>> {
  try {
    const supabase = options?.supabase ?? (await createClient());
    const admin = await getVerifiedAdmin();

    if (!admin) {
      return {
        success: false,
        data: null,
        message: "Acceso no autorizado.",
      };
    }

    const { data, error } = await supabase
      .from("daily_menus")
      .update({ is_active: isActive })
      .eq("id", menuId)
      .select("*")
      .single();

    if (error) {
      return {
        success: false,
        data: null,
        message: `Error al actualizar estado del menú: ${error.message}`,
      };
    }

    try {
      revalidatePath("/");
      revalidatePath("/admin/menus");
      revalidatePath("/admin/analitica");
    } catch {
      // In tests
    }

    return {
      success: true,
      data: data as DailyMenuRow,
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
 * Admin Action: Retrieves historical menus with consolidated rating stats.
 */
export async function getRecentMenusWithStats(
  limit = 14,
  options?: { supabase?: SupabaseClient<Database> },
): Promise<DailyMenuWithStats[]> {
  try {
    const supabase = options?.supabase ?? (await createClient());

    const { data: menus, error: menusError } = await supabase
      .from("daily_menus")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (menusError || !menus) {
      return [];
    }

    // Query all ratings for these menus
    const menuIds = menus.map((m) => m.id);
    const { data: ratings } = await supabase
      .from("menu_ratings")
      .select("menu_id, rating_main, rating_side, rating_beverage")
      .in("menu_id", menuIds);

    const ratingsByMenu = new Map<
      string,
      Array<{ rating_main: number; rating_side: number | null; rating_beverage: number | null }>
    >();

    for (const r of ratings ?? []) {
      const list = ratingsByMenu.get(r.menu_id) || [];
      list.push(r);
      ratingsByMenu.set(r.menu_id, list);
    }

    return (menus as DailyMenuRow[]).map((menu) => ({
      ...menu,
      stats: calculateRatingStats(ratingsByMenu.get(menu.id) || []),
    }));
  } catch (err) {
    console.error("[getRecentMenusWithStats] Error:", err);
    return [];
  }
}
