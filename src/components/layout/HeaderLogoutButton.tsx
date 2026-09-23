"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { LogoutModal } from "@/components/auth/LogoutModal";
import { createClient } from "@/lib/supabase/client";

/**
 * Client island that renders the secure logout button only when an active session
 * exists. Composes LogoutModal for the confirmation/security-warning dialog.
 *
 * This component is intentionally isolated so the parent Header can remain a
 * Server Component and avoid unnecessary client-side re-renders.
 */
export function HeaderLogoutButton() {
  const [hasSession, setHasSession] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Synchronous initial read — avoids a flash of the button on public pages.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });

    // Keep in sync with real-time auth state changes (login / logout / token refresh).
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!hasSession) return null;

  return (
    <>
      <button
        id="header-logout-button"
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={() => setIsModalOpen(true)}
        className="flex size-11 items-center justify-center rounded-xl border border-secondary/20 text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-reduce:transition-none"
      >
        <LogOut aria-hidden="true" className="size-5" />
      </button>

      <LogoutModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
