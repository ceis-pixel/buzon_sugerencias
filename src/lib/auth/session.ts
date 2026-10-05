import "server-only";

import { getServerSession, type Session } from "next-auth";

import { getAuthOptions, isInstitutionalEmail } from "@/lib/auth/authOptions";
import { InfrastructureEnvironmentError } from "@/lib/server-env";
import { findActiveAdmin } from "@/lib/services/adminService";
import type { AdminRow } from "@/types/database.types";

export interface InstitutionalSession {
  /** Verified, lower-cased institutional e-mail. Never persist it with user content. */
  email: string;
  isAdmin: boolean;
}

export type SessionLookup =
  | { ok: true; session: InstitutionalSession }
  | { ok: false; reason: "unauthenticated" | "forbidden_domain" | "auth_unavailable" };

/**
 * Resolves the active NextAuth session on the server (Server Components,
 * Server Actions and Route Handlers) and re-validates the institutional domain.
 */
export async function resolveSession(): Promise<SessionLookup> {
  let session: Session | null;

  try {
    session = await getServerSession(getAuthOptions());
  } catch (error) {
    if (error instanceof InfrastructureEnvironmentError) {
      console.error("[auth] Configuración incompleta:", error.message);
      return { ok: false, reason: "auth_unavailable" };
    }
    throw error;
  }

  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    return { ok: false, reason: "unauthenticated" };
  }
  if (!isInstitutionalEmail(email)) {
    return { ok: false, reason: "forbidden_domain" };
  }

  return { ok: true, session: { email, isAdmin: session?.user?.isAdmin === true } };
}

/** Active institutional session, or null for visitors and rejected accounts. */
export async function getInstitutionalSession(): Promise<InstitutionalSession | null> {
  const lookup = await resolveSession();
  return lookup.ok ? lookup.session : null;
}

export interface VerifiedAdmin {
  userEmail: string;
  adminRecord: AdminRow;
}

/**
 * Authorizes a privileged operation. The moderator whitelist is always read
 * from the database, so the cached `isAdmin` flag of the cookie is never
 * trusted for writes.
 */
export async function getVerifiedAdmin(): Promise<VerifiedAdmin | null> {
  const session = await getInstitutionalSession();
  if (!session) return null;

  const adminRecord = await findActiveAdmin(session.email);
  return adminRecord ? { userEmail: session.email, adminRecord } : null;
}
