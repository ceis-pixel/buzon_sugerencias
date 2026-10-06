"use client";

import { LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

import dynamic from "next/dynamic";

const LogoutModal = dynamic(
  () => import("@/components/auth/LogoutModal").then((mod) => mod.LogoutModal),
  { ssr: false }
);

const accountClasses =
  "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-secondary/20 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-reduce:transition-none";

/**
 * Client island for the institutional account control: a sign-in link for
 * visitors and the secure logout button (with its confirmation dialog) once a
 * session exists.
 *
 * This component is intentionally isolated so the parent Header can remain a
 * Server Component and avoid unnecessary client-side re-renders.
 */
export function HeaderAccountButton() {
  // Kept in sync by the SessionProvider (login, logout and cross-tab changes).
  const { status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reserve the slot while the session resolves so the navbar does not shift.
  if (status === "loading") {
    return <span aria-hidden="true" className="size-11" />;
  }

  if (status === "unauthenticated") {
    return (
      <Link
        href="/login"
        aria-label="Ingresar con tu cuenta institucional de Google Workspace"
        title="Ingresar con tu cuenta @unsch.edu.pe"
        className={accountClasses}
      >
        <LogIn aria-hidden="true" className="size-5 sm:size-4" />
        <span className="hidden sm:inline">Ingresar</span>
      </Link>
    );
  }

  return (
    <>
      <button
        id="header-logout-button"
        type="button"
        aria-label="Sesión institucional activa. Cerrar sesión"
        title="Cerrar sesión"
        onClick={() => setIsModalOpen(true)}
        className={accountClasses}
      >
        <LogOut aria-hidden="true" className="size-5 sm:size-4" />
        <span className="hidden sm:inline">Salir</span>
      </button>

      <LogoutModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
