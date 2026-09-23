"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth/authActions";

export interface UseLogoutReturn {
  /** True while the sign-out request is in-flight; disables buttons and shows a spinner. */
  isLoggingOut: boolean;
  /** Error message if the sign-out call fails, so the UI can surface it. */
  logoutError: string | null;
  /**
   * Executes the full secure logout sequence:
   * 1. Calls supabase.auth.signOut() via the shared authActions helper.
   * 2. Clears any auth-related keys from localStorage / sessionStorage without
   *    removing ticket-lookup history stored by the student.
   * 3. Replaces the current history entry with /login so the browser back button
   *    cannot return to a protected page.
   */
  handleLogout: () => Promise<void>;
}

const AUTH_STORAGE_PREFIXES = ["sb-", "supabase.auth"];

/** Purges Supabase auth credentials from browser storage while keeping anonymous ticket data. */
function purgeAuthStorage() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && AUTH_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  }
}

/**
 * Centralises the secure logout sequence following Section 4.5 of the
 * Crimson Heritage Design System.
 */
export function useLogout(): UseLogoutReturn {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      await signOut();
      purgeAuthStorage();
      router.replace("/login");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Ocurrió un problema al cerrar sesión. Por favor, inténtalo de nuevo.";
      setLogoutError(message);
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router]);

  return { isLoggingOut, logoutError, handleLogout };
}
