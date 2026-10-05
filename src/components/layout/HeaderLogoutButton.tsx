"use client";

import { LogOut } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";

import dynamic from "next/dynamic";

const LogoutModal = dynamic(
  () => import("@/components/auth/LogoutModal").then((mod) => mod.LogoutModal),
  { ssr: false }
);

/**
 * Client island that renders the secure logout button only when an active session
 * exists. Composes LogoutModal for the confirmation/security-warning dialog.
 *
 * This component is intentionally isolated so the parent Header can remain a
 * Server Component and avoid unnecessary client-side re-renders.
 */
export function HeaderLogoutButton() {
  // Kept in sync by the SessionProvider (login, logout and cross-tab changes).
  const { status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasSession = status === "authenticated";

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
