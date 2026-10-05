import "server-only";

import { query } from "@/lib/db";
import type { AdminRow } from "@/types/database.types";

/** Looks up an active moderator in the `admins` whitelist by institutional e-mail. */
export async function findActiveAdmin(email: string): Promise<AdminRow | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const rows = await query<AdminRow>(
    `SELECT id, email, full_name, role, is_active, created_at, updated_at
       FROM public.admins
      WHERE email = $1 AND is_active = true
      LIMIT 1`,
    [normalized],
  );

  return rows[0] ?? null;
}
