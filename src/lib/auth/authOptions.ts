import "server-only";

import type { CallbacksOptions, NextAuthOptions } from "next-auth";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";

import { getAllowedEmailDomain, getAuthEnv } from "@/lib/server-env";
import { findActiveAdmin } from "@/lib/services/adminService";

/** Students are redirected here with a didactic message when the account is rejected. */
export const DOMAIN_REJECTED_URL = "/login?error=domain_not_allowed";

/** A moderator removed from the whitelist loses access within this window at most. */
const ADMIN_RECHECK_INTERVAL_MS = 5 * 60 * 1000;

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export function isInstitutionalEmail(
  email: string | null | undefined,
  domain: string = getAllowedEmailDomain(),
): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  return at > 0 && normalized.slice(at + 1) === domain;
}

async function resolveIsAdmin(email: string): Promise<boolean> {
  try {
    return (await findActiveAdmin(email)) !== null;
  } catch {
    // Fail closed: without the whitelist nobody is treated as a moderator.
    return false;
  }
}

export const authCallbacks: Pick<CallbacksOptions, "signIn" | "jwt" | "session"> = {
  /**
   * Strict institutional filter. The `hd` authorization parameter is only a UI
   * hint, so the decision relies on the claims signed by Google: a verified
   * e-mail, the Workspace hosted domain and the address suffix.
   */
  async signIn({ user, account, profile }) {
    const domain = getAllowedEmailDomain();
    const googleProfile = profile as Partial<GoogleProfile> | undefined;
    const email = googleProfile?.email ?? user.email;

    const accepted =
      account?.provider === "google" &&
      googleProfile?.email_verified === true &&
      googleProfile.hd === domain &&
      isInstitutionalEmail(email, domain);

    return accepted ? true : DOMAIN_REJECTED_URL;
  },

  /**
   * The session lives only in an encrypted cookie (no users table). It keeps
   * the e-mail (needed for the ephemeral hash and the admin lookup) and drops
   * every other profile attribute.
   */
  async jwt({ token, user }) {
    if (user?.email) {
      token.email = user.email.toLowerCase();
      token.adminCheckedAt = 0;
    }
    delete token.name;
    delete token.picture;

    const email = typeof token.email === "string" ? token.email : "";
    const checkedAt = typeof token.adminCheckedAt === "number" ? token.adminCheckedAt : 0;

    if (email && Date.now() - checkedAt > ADMIN_RECHECK_INTERVAL_MS) {
      token.isAdmin = await resolveIsAdmin(email);
      token.adminCheckedAt = Date.now();
    }

    return token;
  },

  async session({ session, token }) {
    session.user = {
      email: typeof token.email === "string" ? token.email : "",
      isAdmin: token.isAdmin === true,
    };
    return session;
  },
};

/**
 * Central NextAuth configuration. Built per request so secrets are read from
 * the container environment at runtime and never during `next build`.
 */
export function getAuthOptions(): NextAuthOptions {
  const { secret, googleClientId, googleClientSecret } = getAuthEnv();

  return {
    secret,
    session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
    pages: { signIn: "/login", error: "/login" },
    providers: [
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        authorization: {
          params: {
            // Data minimization: no `profile` scope (name, photo) is requested.
            scope: "openid email",
            hd: getAllowedEmailDomain(),
            prompt: "select_account",
          },
        },
      }),
    ],
    callbacks: authCallbacks,
  };
}
