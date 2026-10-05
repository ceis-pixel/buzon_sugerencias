"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Institutional session context. Client components read the NextAuth session
 * through `useSession()`; the session itself lives in an HttpOnly cookie.
 */
export function AuthSessionProvider({ children }: { readonly children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>
  );
}
