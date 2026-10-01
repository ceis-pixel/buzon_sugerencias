import type { Metadata } from "next";

import { AdminMenusView } from "@/components/admin/menus/AdminMenusView";
import { getRecentMenusWithStats } from "@/lib/actions/menuRatingActions";

export const metadata: Metadata = {
  title: "Gestión de Menús Diarios y Calificaciones • Comedor UNSCH",
  description:
    "Módulo de publicación y control nutricional de la FUSCH. Programación diaria de platos y auditoría del termómetro estudiantil.",
};

export const dynamic = "force-dynamic";

/**
 * /admin/menus — Daily Menus & Nutritional Management (Sprint 11 - Issue 11.5)
 *
 * Protected administrative view for FUSCH and dining hall commission:
 * - Register and schedule daily menus per meal shift (Breakfast, Lunch, Dinner).
 * - Weekly historical log with consolidated satisfaction scores and total votes.
 * - One-click toggle to open/close live rating submissions for finished shifts.
 */
export default async function AdminMenusPage() {
  const menus = await getRecentMenusWithStats(20);

  return <AdminMenusView initialMenus={menus} />;
}
