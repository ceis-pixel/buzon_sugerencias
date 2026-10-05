import "server-only";

import { resolveSession } from "@/lib/auth/session";
import { findActiveAdmin } from "@/lib/services/adminService";

/**
 * Session guard for the on-premise media endpoints (/api/upload).
 * Backed by the NextAuth institutional session (Google Workspace SSO).
 */

export type UploadSessionResult =
  | { ok: true; email: string; isAdmin: boolean }
  | { ok: false; reason: "unauthenticated" | "forbidden_domain" | "auth_unavailable" };

export interface UploadSessionOptions {
  /** Also resolve whether the user is an active moderator (needed for deletions). */
  requireAdminLookup?: boolean;
}

export async function getUploadSession(
  options: UploadSessionOptions = {},
): Promise<UploadSessionResult> {
  const lookup = await resolveSession();
  if (!lookup.ok) {
    return lookup;
  }

  const { email } = lookup.session;
  // Deletions re-read the whitelist instead of trusting the cookie flag.
  const isAdmin = options.requireAdminLookup ? (await findActiveAdmin(email)) !== null : false;

  return { ok: true, email, isAdmin };
}
